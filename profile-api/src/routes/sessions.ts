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
    IndexName:              "userId-lastUpdated-index-v2",
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: { ":uid": userId },
    ScanIndexForward:       false,   // newest first
    Limit:                  50,
  }));

  const sessions = (result.Items ?? []).map((item) => ({
    sessionId:   item.sessionId,
    sessionName: item.sessionName || null,
    lastUpdated: item.lastUpdated ?? new Date(0).toISOString(),
    currentMode: item.currentMode ?? "advisory",
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
    ProjectionExpression: "sessionId, sessionName, userId, #h, currentMode",
    ExpressionAttributeNames: { "#h": "history" },
  }));

  if (!result.Item) {
    return notFound(`Session ${sessionId} not found`);
  }

  // Ownership check — users can only read their own sessions
  if (result.Item.userId !== userId) {
    return notFound(`Session ${sessionId} not found`);
  }

  return ok({
    sessionId:   result.Item.sessionId,
    sessionName: result.Item.sessionName || null,
    currentMode: result.Item.currentMode ?? "advisory",
    history:     result.Item.history     ?? [],
  });
}
