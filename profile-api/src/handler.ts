/**
 * src/handler.ts — Lambda Function URL entry point for the Profile API.
 *
 * Routes:   Method   Path
 * ─────────────────────────────────────────────────────
 * OPTIONS  *                        → CORS preflight
 *
 * GET      /sessions                → sessions.listSessions
 * GET      /sessions/:sessionId     → sessions.getSessionHistory
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { verifyToken }                    from "./auth";
import { listSessions, getSessionHistory } from "./routes/sessions";
import { getUserProfile } from "./routes/profile";
import { unauthorized, notFound, serverError } from "./response";
import type { LambdaResponse } from "./response";

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  const method     = (event.requestContext.http.method ?? "").toUpperCase();
  const rawPath    = event.rawPath ?? "";
  const authHeader = event.headers?.["authorization"] ?? event.headers?.["Authorization"];

  // ── JWT verification ────────────────────────────────────────────────────────
  let userId: string;
  try {
    userId = await verifyToken(authHeader);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return unauthorized(msg);
  }

  // ── Path-based routing ─────────────────────────────────────────────────────
  try {
    // GET /profile
    if (method === "GET" && rawPath === "/profile") {
      return await getUserProfile(userId);
    }

    // GET /sessions
    if (method === "GET" && rawPath === "/sessions") {
      return await listSessions(userId);
    }

    // GET /sessions/:sessionId
    if (method === "GET" && rawPath.startsWith("/sessions/")) {
      const sessionId = decodeURIComponent(rawPath.split("/sessions/")[1]);
      return await getSessionHistory(userId, sessionId);
    }

    return notFound(`No route matched: ${method} ${rawPath}`);
  } catch (err) {
    return serverError(err);
  }
}
