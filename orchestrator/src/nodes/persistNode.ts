/**
 * nodes/persistNode.ts
 * Appends the current turn to DynamoDB with a 30-day TTL.
 *
 * Special case — mode switch:
 *   modeSwitchNode already wrote the event marker and updated session metadata.
 *   persistNode only appends the AI's welcome reply (not the internal trigger prompt).
 */

import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, SESSION_TABLE } from "../clients/dynamodb";
import { ChatMessage, OrchestratorState } from "../state";

const TTL_30_DAYS = 30 * 24 * 60 * 60;

export async function persistNode(
  state: OrchestratorState
): Promise<Partial<OrchestratorState>> {
  try {
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + TTL_30_DAYS;

    let updatedHistory: ChatMessage[];

    if (state.isModeSwitch) {
      // modeSwitchNode already saved the event marker — only append AI welcome reply
      updatedHistory = [
        ...state.sessionHistory,
        {
          role:     "assistant" as const,
          content:  state.responseText,
          products: state.responseProducts?.length ? state.responseProducts : undefined,
          ts:       now,
        },
      ].slice(-20);
    } else {
      // Normal turn: append user message + AI reply
      updatedHistory = [
        ...state.sessionHistory,
        { role: "user" as const, content: state.userMessage, ts: now },
        {
          role:     "assistant" as const,
          content:  state.responseText,
          products: state.responseProducts?.length ? state.responseProducts : undefined,
          ts:       now,
        },
      ].slice(-20);
    }

    await dynamoDb.send(
      new PutCommand({
        TableName: SESSION_TABLE,
        Item: {
          sessionId:        state.sessionId,
          userId:           state.userId || null,
          history:          updatedHistory,
          currentMode:      state.currentMode,
          currentStoreId:   state.currentStoreId   ?? null,
          currentStoreName: state.currentStoreName ?? null,
          lastUpdated:      now,
          ttl,
        },
      })
    );

    console.log(
      `[persistNode] Session ${state.sessionId} | mode=${state.currentMode} | turns=${updatedHistory.length} | modeSwitch=${state.isModeSwitch}`
    );
  } catch (err) {
    console.warn("[persistNode] Failed to persist session:", err);
  }

  return {};
}
