/**
 * nodes/sessionNode.ts — ET Concierge
 * Loads conversation history + session-level structured data from DynamoDB.
 * Skipped on mode_switch (modeSwitchNode handles session directly).
 */

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, SESSION_TABLE, PROFILES_TABLE } from "../clients/dynamodb";
import { ChatMessage, ETServiceCard, ETArticleCard, OrchestratorState, ConciergeMode, UserProfile } from "../state";

const MAX_HISTORY_TURNS = 20;

export async function sessionNode(
  state: OrchestratorState
): Promise<Partial<OrchestratorState>> {
  if (state.error) return {};

  try {
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: SESSION_TABLE,
        Key: { sessionId: state.sessionId },
      })
    );

    const item = result.Item;
    const history: ChatMessage[] = (item?.history ?? []).slice(-MAX_HISTORY_TURNS);

    let profile = (item?.userProfile as UserProfile) ?? null;
    
    // Fallback: If this is a new session (or missing a profile) and user is auth'd, check Profiles table
    if (!profile && state.userId) {
      try {
        const profileResult = await dynamoDb.send(
          new GetCommand({
            TableName: PROFILES_TABLE,
            Key: { userId: state.userId },
          })
        );
        if (profileResult.Item) {
          profile = profileResult.Item as UserProfile;
          console.log(`[sessionNode] Loaded profile from PROFILES_TABLE for user ${state.userId}`);
        }
      } catch (err) {
        console.warn(`[sessionNode] Failed to load from PROFILES_TABLE for user ${state.userId}:`, err);
      }
    }

    return {
      sessionHistory:   history,
      sessionName:      (item?.sessionName as string) ?? null,
      currentMode:      (item?.currentMode as ConciergeMode) ?? "advisory",
      currentServices:  (item?.currentServices as ETServiceCard[]) ?? [],
      currentArticles:  (item?.currentArticles as ETArticleCard[]) ?? [],
      userProfile:      profile,
    };
  } catch (err) {
    console.warn("[sessionNode] Failed to load session:", err);
    return {
      sessionHistory:  [],
      currentMode:     "advisory",
      currentServices: [],
      currentArticles: [],
      userProfile:     null,
    };
  }
}
