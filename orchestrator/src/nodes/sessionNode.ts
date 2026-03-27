/**
 * nodes/sessionNode.ts
 * Loads conversation history AND session metadata (currentMode, storeId, userId) from DynamoDB.
 * Skipped on mode_switch (modeSwitchNode handles session writes directly).
 */

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, SESSION_TABLE } from "../clients/dynamodb";
import { ChatMessage, OrchestratorState } from "../state";

const MAX_HISTORY_TURNS = 10;

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

    return {
      sessionHistory:   history,
      currentMode:      (item?.currentMode as "app" | "store") ?? "app",
      currentStoreId:   item?.currentStoreId   ?? null,
      currentStoreName: item?.currentStoreName ?? null,
    };
  } catch (err) {
    console.warn("[sessionNode] Failed to load session:", err);
    return { sessionHistory: [], currentMode: "app", currentStoreId: null, currentStoreName: null };
  }
}
