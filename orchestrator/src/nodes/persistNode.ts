/**
 * nodes/persistNode.ts — ET Concierge
 *
 * Persists the current turn to DynamoDB with 30-day TTL.
 *
 * Key design decisions:
 *  - history[] stores text + frontend display data (services/articles ON the turn for UI)
 *  - currentServices/currentArticles are session-level (overwritten per search, used for LLM context)
 *  - Mode switch: modeSwitchNode already wrote the event marker; persistNode only appends AI reply
 */

import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ChatGoogle } from "@langchain/google";
import { LLM_MODEL } from "../clients/bedrock";
import { dynamoDb, SESSION_TABLE } from "../clients/dynamodb";
import { ChatMessage, OrchestratorState } from "../state";

const TTL_30_DAYS = 30 * 24 * 60 * 60;

export async function persistNode(
  state: OrchestratorState
): Promise<Partial<OrchestratorState>> {
  try {
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + TTL_30_DAYS;

    let sessionName = state.sessionName;
    if (!sessionName && state.sessionHistory.length === 0 && !state.isModeSwitch && state.userMessage) {
      try {
        const llm = new ChatGoogle({ model: LLM_MODEL, apiKey: process.env.GOOGLE_API_KEY, temperature: 0 });
        const res = await llm.invoke(`Summarize this message into a short 2-4 word title for a chat session. Do not use quotes or punctuation. Return only the title.\n\nMessage: "${state.userMessage}"`);
        sessionName = String(res.content).trim();
      } catch (err) {
        console.warn("[persistNode] Failed to generate session name:", err);
        sessionName = "New Conversation";
      }
    }

    let updatedHistory: ChatMessage[];

    if (state.isModeSwitch) {
      // modeSwitchNode already saved the event marker — only append AI welcome reply
      updatedHistory = [
        ...state.sessionHistory,
        {
          role:     "assistant" as const,
          content:  state.responseText,
          services: state.responseServices?.length ? state.responseServices : undefined,
          articles: state.responseArticles?.length ? state.responseArticles : undefined,
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
          services: state.responseServices?.length ? state.responseServices : undefined,
          articles: state.responseArticles?.length ? state.responseArticles : undefined,
          ts:       now,
        },
      ].slice(-20);
    }

    await dynamoDb.send(
      new PutCommand({
        TableName: SESSION_TABLE,
        Item: {
          sessionId:        state.sessionId,
          sessionName:      sessionName,
          userId:           state.userId || null,
          history:          updatedHistory,
          currentMode:      state.currentMode,
          currentServices:  state.currentServices,
          currentArticles:  state.currentArticles,
          userProfile:      state.userProfile,
          lastUpdated:      now,
          ttl,
        },
      })
    );

    console.log(
      `[persistNode] Session ${state.sessionId} | mode=${state.currentMode} | turns=${updatedHistory.length} | services=${state.currentServices.length} | articles=${state.currentArticles.length}`
    );
    
    return { sessionName };
  } catch (err) {
    console.warn("[persistNode] Failed to persist session:", err);
  }

  return {};
}
