/**
 * nodes/modeSwitchNode.ts — ET Concierge
 *
 * Handles advisory ↔ prime-news mode switch:
 * 1. Appends event marker to session history
 * 2. Updates session metadata (currentMode) — preserves currentServices/currentArticles
 * 3. Injects ephemeral LLM trigger prompt for natural welcome
 */

import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, SESSION_TABLE } from "../clients/dynamodb";
import { ChatMessage, ETServiceCard, ETArticleCard, OrchestratorState, ConciergeMode } from "../state";

const TTL_30_DAYS = 30 * 24 * 60 * 60;

export async function modeSwitchNode(
  state: OrchestratorState
): Promise<Partial<OrchestratorState>> {
  const mode: ConciergeMode = state.requestedMode ?? "advisory";
  const now  = new Date().toISOString();
  const ttl  = Math.floor(Date.now() / 1000) + TTL_30_DAYS;

  try {
    // Load existing session to preserve history + structured data
    const existing = await dynamoDb.send(
      new GetCommand({ TableName: SESSION_TABLE, Key: { sessionId: state.sessionId } })
    );
    const existingHistory: ChatMessage[]     = existing.Item?.history ?? [];
    const existingServices: ETServiceCard[]  = existing.Item?.currentServices ?? [];
    const existingArticles: ETArticleCard[]  = existing.Item?.currentArticles ?? [];
    const existingSessionName: string | null = (existing.Item?.sessionName as string) ?? null;
    const existingProfile: any               = existing.Item?.userProfile ?? null;

    // Event marker for history
    const eventMarker: ChatMessage = {
      role:    "event",
      type:    "mode_switch",
      content: mode === "prime-news"
        ? "Switched to Prime News Mode"
        : "Switched to Advisory Mode",
      mode,
      ts: now,
    };

    const updatedHistory = [...existingHistory, eventMarker];

    // Write updated session — preserve structured data across mode switches
    await dynamoDb.send(
      new PutCommand({
        TableName: SESSION_TABLE,
        Item: {
          sessionId:        state.sessionId,
          userId:           state.userId,
          sessionName:      existingSessionName,
          userProfile:      existingProfile,
          history:          updatedHistory,
          currentMode:      mode,
          currentServices:  existingServices,
          currentArticles:  existingArticles,
          lastUpdated:      now,
          ttl,
        },
      })
    );

    console.log(`[modeSwitchNode] Session ${state.sessionId} switched to mode=${mode}`);

    // Ephemeral LLM trigger — used to generate natural welcome (NOT persisted)
    // For News mode: instructs LLM to proactively search articles based on conversation so far
    // For Advisory: instructs LLM to ask profiling questions immediately
    const llmTrigger = mode === "prime-news"
      ? `The user has switched to Prime News Mode. ` +
        `Look at the conversation history to understand what topics interest this user. ` +
        `IMMEDIATELY call search_prime_news with a query based on their interests from the conversation so far. ` +
        `Do NOT ask "what would you like to read?" — proactively surface articles you think they'll find valuable. ` +
        `In your response, welcome them briefly and present the articles. Keep the welcome to 1 sentence.`
      : `The user has switched to Advisory Mode. ` +
        `Look at the user's last few messages right before they switched. If they were asking for details about a specific service, you now have access to that service's full context in your "Currently recommended services". ` +
        `Answer their question natively using that context right away. Do NOT do a new catalog search if the details are already in context.\n` +
        `If they weren't asking about a specific service, welcome them warmly in 1 sentence, then ask 1-2 specific questions to understand what they need. ` +
        `You will focus more on user profile building in this mode than in news mode.`+
        `Base your questions on what you already know from the conversation history. Do NOT search the catalog yet — understand the user first.`;

    return {
      sessionHistory:   updatedHistory,
      sessionName:      existingSessionName,
      userProfile:      existingProfile,
      currentMode:      mode,
      currentServices:  existingServices,
      currentArticles:  existingArticles,
      userMessage:      llmTrigger,
      isModeSwitch:     true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `modeSwitchNode: ${msg}` };
  }
}
