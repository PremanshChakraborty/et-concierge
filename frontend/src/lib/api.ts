/**
 * lib/api.ts — Orchestrator client.
 * Connects to the real Lambda Function URL.
 */

import type { ChatApiResponse, ConciergeMode } from "../types";

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

/** Mode-switch event (advisory ↔ prime-news). No user text sent. */
export async function sendModeSwitch(
  sessionId: string,
  mode: ConciergeMode,
  token: string,
): Promise<ChatApiResponse> {
  return post<ChatApiResponse>(
    { type: "mode_switch", sessionId, mode },
    token,
  );
}
