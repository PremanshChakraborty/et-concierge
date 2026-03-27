// handler.ts — Lambda Function URL entry point with Cognito JWT auth
// All requests must carry a valid Cognito JWT in the Authorization header.
// The userId (Cognito sub) is extracted and passed into the graph.
//
// Request body variants:
//   Regular chat:  { sessionId?, message }
//   Mode switch:   { type: "mode_switch", sessionId, mode: "store"|"app", storeId?, storeName? }

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { graph } from "./graph";

// ── JWT Verifier (singleton, initialised once per cold start) ──────────────

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse:   "access",
  clientId:   process.env.COGNITO_CLIENT_ID!,
});

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatRequest {
  sessionId?: string;
  message:    string;
}

interface ModeSwitchRequest {
  type:       "mode_switch";
  sessionId:  string;
  mode:       "app" | "store";
  storeId?:   string;
  storeName?: string;
}

type IncomingRequest = ChatRequest | ModeSwitchRequest;

// ── Helpers ────────────────────────────────────────────────────────────────

function respond(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function isModeSwitchRequest(req: IncomingRequest): req is ModeSwitchRequest {
  return (req as ModeSwitchRequest).type === "mode_switch";
}

// ── Handler ────────────────────────────────────────────────────────────────

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {

  // ── 1. Verify JWT ────────────────────────────────────────────────────────
  const authHeader = event.headers?.["authorization"] ?? event.headers?.["Authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return respond(401, { error: "Missing Authorization header" });
  }

  let userId: string;
  try {
    const payload = await verifier.verify(token);
    userId = payload.sub;
  } catch {
    return respond(401, { error: "Invalid or expired token" });
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let req: IncomingRequest;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf-8")
      : (event.body ?? "");
    req = JSON.parse(raw) as IncomingRequest;
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  // ── 3. Build graph input based on request type ───────────────────────────
  let graphInput: Record<string, unknown>;

  if (isModeSwitchRequest(req)) {
    if (!req.sessionId) {
      return respond(400, { error: "mode_switch request requires sessionId" });
    }
    console.log("[handler] mode_switch", { userId, mode: req.mode, storeId: req.storeId });
    graphInput = {
      userId,
      sessionId:          req.sessionId,
      isModeSwitch:       true,
      requestedMode:      req.mode,
      requestedStoreId:   req.storeId   ?? null,
      requestedStoreName: req.storeName ?? null,
    };
  } else {
    if (!req.message?.trim()) {
      return respond(400, { error: "Request body must contain a non-empty 'message' field" });
    }
    console.log("[handler] chat", { userId, sessionId: req.sessionId ?? "(new)", message: req.message.slice(0, 80) });
    graphInput = {
      userId,
      sessionId:   req.sessionId ?? "",
      userMessage: req.message.trim(),
    };
  }

  // ── 4. Run graph ─────────────────────────────────────────────────────────
  try {
    const finalState = await graph.invoke(graphInput);

    return respond(finalState.error ? 500 : 200, {
      sessionId:         finalState.sessionId,
      text:              finalState.responseText,
      products:          finalState.responseProducts,
      followUpQuestions: finalState.followUpQuestions,
      currentMode:       finalState.currentMode,
      error:             finalState.error ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[handler] Unhandled error:", msg);
    return respond(500, {
      sessionId: (req as ChatRequest).sessionId ?? "",
      text: "An unexpected error occurred. Please try again.",
      products: [], followUpQuestions: [], error: msg,
    });
  }
};
