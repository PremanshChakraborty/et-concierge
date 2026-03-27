/**
 * src/lib/profileApi.ts — Profile API client
 *
 * All functions call the deployed retail-ai-profile-api Lambda Function URL.
 */

import type { CartItem, ChatTurn, ProductCard, Session, StoreDetails, WishlistItem } from "../types";
import { v4 as uuid } from "uuid";

const BASE = (import.meta.env.VITE_PROFILE_API_URL as string).replace(/\/$/, "");

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg: string;
    try { msg = JSON.parse(body).error ?? body; } catch { msg = body; }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Store validation ──────────────────────────────────────────────────────────

export async function validateStoreCode(
  storeCode: string,
  token: string,
): Promise<StoreDetails> {
  return request<StoreDetails>("/stores/validate", token, {
    method: "POST",
    body:   JSON.stringify({ storeCode }),
  });
}

// ── Session history ───────────────────────────────────────────────────────────

export async function getSessions(token: string): Promise<Session[]> {
  const { sessions } = await request<{ sessions: Session[] }>("/sessions", token);
  return sessions;
}

// Raw ChatMessage shape from DynamoDB (mirrors orchestrator state.ts)
interface RawChatMessage {
  role:       "user" | "assistant" | "event";
  content:    string;
  ts:         string;
  products?:  ProductCard[];  // present on assistant turns that returned suggestions
  type?:      "mode_switch";
  mode?:      "app" | "store";
  storeId?:   string;
  storeName?: string;
}

interface SessionHistoryResponse {
  sessionId:        string;
  currentMode:      "app" | "store";
  currentStoreId:   string | null;
  currentStoreName: string | null;
  history:          RawChatMessage[];
}

/** Convert the orchestrator's internal ChatMessage history to frontend ChatTurn[]  */
function historyToTurns(history: RawChatMessage[]): ChatTurn[] {
  return history.map((msg) => {
    const id = uuid();
    if (msg.role === "event" && msg.type === "mode_switch") {
      return { id, role: "mode_switch" as const, toMode: msg.mode ?? "app", storeName: msg.storeName, ts: msg.ts };
    }
    if (msg.role === "user") {
      return { id, role: "user" as const, message: msg.content, ts: msg.ts };
    }
    // assistant — include stored products (empty array if none)
    return { id, role: "assistant" as const, text: msg.content, products: msg.products ?? [], followUpQuestions: [], ts: msg.ts };
  });
}

/** Fetch full chat history for a session; returns turns and session metadata. */
export async function getSessionHistory(sessionId: string, token: string): Promise<{
  turns:            ChatTurn[];
  currentMode:      "app" | "store";
  currentStoreId:   string | null;
  currentStoreName: string | null;
}> {
  const data = await request<SessionHistoryResponse>(`/sessions/${encodeURIComponent(sessionId)}`, token);
  return {
    turns:            historyToTurns(data.history),
    currentMode:      data.currentMode,
    currentStoreId:   data.currentStoreId,
    currentStoreName: data.currentStoreName,
  };
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export async function getCart(token: string): Promise<CartItem[]> {
  const { cart } = await request<{ cart: CartItem[] }>("/profile/cart", token);
  return cart;
}

export async function addToCart(item: CartItem, token: string): Promise<CartItem[]> {
  const { cart } = await request<{ cart: CartItem[] }>("/profile/cart", token, {
    method: "POST",
    body:   JSON.stringify(item),
  });
  return cart;
}

export async function removeFromCart(productId: string, token: string): Promise<CartItem[]> {
  const { cart } = await request<{ cart: CartItem[] }>(
    `/profile/cart/${encodeURIComponent(productId)}`,
    token,
    { method: "DELETE" },
  );
  return cart;
}

// ── Wishlist ──────────────────────────────────────────────────────────────────

export async function getWishlist(token: string): Promise<WishlistItem[]> {
  const { wishlist } = await request<{ wishlist: WishlistItem[] }>("/profile/wishlist", token);
  return wishlist;
}

export async function addToWishlist(item: WishlistItem, token: string): Promise<WishlistItem[]> {
  const { wishlist } = await request<{ wishlist: WishlistItem[] }>("/profile/wishlist", token, {
    method: "POST",
    body:   JSON.stringify(item),
  });
  return wishlist;
}

export async function removeFromWishlist(productId: string, token: string): Promise<WishlistItem[]> {
  const { wishlist } = await request<{ wishlist: WishlistItem[] }>(
    `/profile/wishlist/${encodeURIComponent(productId)}`,
    token,
    { method: "DELETE" },
  );
  return wishlist;
}
