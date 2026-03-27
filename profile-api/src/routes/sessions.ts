/**
 * src/routes/sessions.ts — Session routes.
 *
 * GET /sessions            → list all sessions for the user (metadata only)
 * GET /sessions/:sessionId → full chat history for one session
 */

import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { db, SESSION_TABLE } from "../db";
import { ok, notFound } from "../response";
import type { LambdaResponse } from "../response";

// ── List sessions ─────────────────────────────────────────────────────────────

export async function listSessions(userId: string): Promise<LambdaResponse> {
  const result = await db.send(new QueryCommand({
    TableName:              SESSION_TABLE,
    IndexName:              "userId-lastUpdated-index",
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: { ":uid": userId },
    ScanIndexForward:       false,   // newest first
    Limit:                  50,
  }));

  const sessions = (result.Items ?? []).map((item) => ({
    sessionId:        item.sessionId,
    lastUpdated:      item.lastUpdated   ?? new Date(0).toISOString(),
    currentMode:      item.currentMode   ?? "app",
    currentStoreId:   item.currentStoreId   ?? null,
    currentStoreName: item.currentStoreName ?? null,
  }));

  return ok({ sessions });
}

// ── Get session history ───────────────────────────────────────────────────────

export async function getSessionHistory(
  userId: string,
  sessionId: string,
): Promise<LambdaResponse> {
  const result = await db.send(new GetCommand({
    TableName: SESSION_TABLE,
    Key:       { sessionId },
    // Project only the fields we need for the history view
    ProjectionExpression: "sessionId, userId, #h, currentMode, currentStoreId, currentStoreName",
    ExpressionAttributeNames: { "#h": "history" },
  }));

  if (!result.Item) {
    return notFound(`Session ${sessionId} not found`);
  }

  // Ownership check — users can only read their own sessions
  if (result.Item.userId !== userId) {
    return notFound(`Session ${sessionId} not found`);
  }

  // Return raw history array; frontend converts to ChatTurn format
  return ok({
    sessionId:        result.Item.sessionId,
    currentMode:      result.Item.currentMode      ?? "app",
    currentStoreId:   result.Item.currentStoreId   ?? null,
    currentStoreName: result.Item.currentStoreName ?? null,
    history:          result.Item.history          ?? [],
  });
}
