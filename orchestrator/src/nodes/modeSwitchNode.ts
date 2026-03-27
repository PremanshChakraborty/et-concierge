/**
 * nodes/modeSwitchNode.ts
 *
 * Handles a mode_switch request:
 * 1. Appends an event marker to session history in DynamoDB
 * 2. Updates session metadata (currentMode, currentStoreId, currentStoreName)
 * 3. Injects a crafted LLM trigger prompt so Claude generates a natural welcome
 *    (this trigger is NOT persisted — it's ephemeral, for this invocation only)
 */

import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, SESSION_TABLE } from "../clients/dynamodb";
import { ChatMessage, OrchestratorState } from "../state";

const TTL_30_DAYS = 30 * 24 * 60 * 60;

export async function modeSwitchNode(
  state: OrchestratorState
): Promise<Partial<OrchestratorState>> {
  const mode      = state.requestedMode ?? "app";
  const storeId   = state.requestedStoreId ?? null;
  const storeName = state.requestedStoreName ?? null;
  const now       = new Date().toISOString();
  const ttl       = Math.floor(Date.now() / 1000) + TTL_30_DAYS;

  try {
    // Load existing session (to preserve history + userId)
    const existing = await dynamoDb.send(
      new GetCommand({ TableName: SESSION_TABLE, Key: { sessionId: state.sessionId } })
    );
    const existingHistory: ChatMessage[] = existing.Item?.history ?? [];

    // Build the event marker that goes into history
    const eventMarker: ChatMessage = {
      role:  "event",
      type:  "mode_switch",
      content: mode === "store"
        ? `Switched to Store Mode — ${storeName ?? storeId ?? "Unknown Store"}`
        : "Switched to App Mode",
      mode,
      storeId:   storeId ?? undefined,
      storeName: storeName ?? undefined,
      ts: now,
    };

    const updatedHistory = [...existingHistory, eventMarker];

    // Write updated session
    await dynamoDb.send(
      new PutCommand({
        TableName: SESSION_TABLE,
        Item: {
          sessionId:        state.sessionId,
          userId:           state.userId,
          history:          updatedHistory,
          currentMode:      mode,
          currentStoreId:   storeId ?? null,
          currentStoreName: storeName ?? null,
          lastUpdated:      now,
          ttl,
        },
      })
    );

    console.log(`[modeSwitchNode] Session ${state.sessionId} switched to mode=${mode} store=${storeId}`);

    // Build the ephemeral LLM trigger prompt (Claude uses this to generate the welcome — not saved)
    const llmTrigger = mode === "store"
      ? `The customer has just switched to Store Mode and is now at ${storeName ?? storeId}. ` +
        `Welcome them warmly. Briefly describe what you can help with in-store: ` +
        `live stock availability, in-store item discovery, nearby store alternatives if something's out of stock, ` +
        `and personalised style suggestions based on what's actually available here. Keep it to 3-4 sentences.`
      : `The customer has switched back to App Mode (browsing from their phone). ` +
        `Acknowledge the switch briefly and invite them to continue shopping or ask a question.`;

    return {
      // Pass mode metadata to subsequent nodes (sessionNode won't re-read since modeSwitchNode just wrote it)
      sessionHistory:   updatedHistory,
      currentMode:      mode,
      currentStoreId:   storeId,
      currentStoreName: storeName,
      // Ephemeral trigger — llmNode uses this as userMessage
      userMessage: llmTrigger,
      // Signal to persistNode: event already saved, only save the AI reply
      isModeSwitch: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `modeSwitchNode: ${msg}` };
  }
}
