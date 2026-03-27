/**
 * lib/api.ts — Orchestrator client.
 * Connects to the real Lambda Function URL from day one.
 */

import type { ChatApiResponse } from "../types";

const BASE = import.meta.env.VITE_ORCHESTRATOR_URL as string;

async function post<T>(body: unknown, token: string): Promise<T> {
  const res = await fetch(BASE, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

/** Regular chat message. */
export async function sendChat(
  message: string,
  token: string,
  sessionId?: string | null,
): Promise<ChatApiResponse> {
  return post<ChatApiResponse>(
    { message, ...(sessionId ? { sessionId } : {}) },
    token,
  );
}

/** Mode-switch event (app ↔ store). No user text sent. */
export async function sendModeSwitch(
  sessionId: string,
  mode: "app" | "store",
  token: string,
  storeId?: string,
  storeName?: string,
): Promise<ChatApiResponse> {
  return post<ChatApiResponse>(
    { type: "mode_switch", sessionId, mode, storeId, storeName },
    token,
  );
}
