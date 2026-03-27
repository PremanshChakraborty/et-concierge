/**
 * src/handler.ts — Lambda Function URL entry point for the Profile API.
 *
 * Routes:   Method   Path
 * ─────────────────────────────────────────────────────
 * OPTIONS  *                        → CORS preflight
 *
 * POST     /stores/validate         → stores.validateStore
 *
 * GET      /sessions                → sessions.listSessions
 *
 * GET      /profile/cart            → profile.getCart
 * POST     /profile/cart            → profile.addToCart
 * DELETE   /profile/cart/:productId → profile.removeFromCart
 *
 * GET      /profile/wishlist            → profile.getWishlist
 * POST     /profile/wishlist            → profile.addToWishlist
 * DELETE   /profile/wishlist/:productId → profile.removeFromWishlist
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { verifyToken }        from "./auth";
import { validateStore }      from "./routes/stores";
import { listSessions, getSessionHistory } from "./routes/sessions";
import {
  getCart, addToCart, removeFromCart,
  getWishlist, addToWishlist, removeFromWishlist,
} from "./routes/profile";
import { unauthorized, notFound, serverError } from "./response";
import type { LambdaResponse } from "./response";

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  const method     = (event.requestContext.http.method ?? "").toUpperCase();
  const rawPath    = event.rawPath ?? "";
  const body       = event.body   ?? null;
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
    // POST /stores/validate
    if (method === "POST" && rawPath === "/stores/validate") {
      return await validateStore(body);
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

    // Cart
    if (rawPath === "/profile/cart") {
      if (method === "GET")  return await getCart(userId);
      if (method === "POST") return await addToCart(userId, body);
    }
    if (method === "DELETE" && rawPath.startsWith("/profile/cart/")) {
      const productId = decodeURIComponent(rawPath.split("/profile/cart/")[1]);
      return await removeFromCart(userId, productId);
    }

    // Wishlist
    if (rawPath === "/profile/wishlist") {
      if (method === "GET")  return await getWishlist(userId);
      if (method === "POST") return await addToWishlist(userId, body);
    }
    if (method === "DELETE" && rawPath.startsWith("/profile/wishlist/")) {
      const productId = decodeURIComponent(rawPath.split("/profile/wishlist/")[1]);
      return await removeFromWishlist(userId, productId);
    }

    return notFound(`No route matched: ${method} ${rawPath}`);
  } catch (err) {
    return serverError(err);
  }
}
