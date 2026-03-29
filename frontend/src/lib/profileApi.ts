/**
 * src/lib/profileApi.ts — Profile API client
 *
 * Calls the deployed et-concierge-profile-api Lambda Function URL.
 */

import type { ChatTurn, ConciergeMode, ETServiceCard, ETArticleCard, Session, UserProfile } from "../types";
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

// ── Session history ───────────────────────────────────────────────────────────

export async function getSessions(token: string): Promise<Session[]> {
  const { sessions } = await request<{ sessions: Session[] }>("/sessions", token);
  console.log("getSessions response:", sessions);
  return sessions;
}

// Raw ChatMessage shape from DynamoDB (mirrors orchestrator state.ts)
interface RawChatMessage {
  role:       "user" | "assistant" | "event";
  content:    string;
  ts:         string;
  services?:  ETServiceCard[];
  articles?:  ETArticleCard[];
  type?:      "mode_switch";
  mode?:      ConciergeMode;
}

interface SessionHistoryResponse {
  sessionId:   string;
  sessionName: string | null;
  currentMode: ConciergeMode;
  history:     RawChatMessage[];
}

/** Convert the orchestrator's internal ChatMessage history to frontend ChatTurn[]  */
function historyToTurns(history: RawChatMessage[]): ChatTurn[] {
  return history.map((msg) => {
    const id = uuid();
    if (msg.role === "event" && msg.type === "mode_switch") {
      return { id, role: "mode_switch" as const, toMode: msg.mode ?? "advisory", ts: msg.ts };
    }
    if (msg.role === "user") {
      return { id, role: "user" as const, message: msg.content, ts: msg.ts };
    }
    // assistant — include stored services and articles
    return {
      id,
      role: "assistant" as const,
      text: msg.content,
      services: msg.services ?? [],
      articles: msg.articles ?? [],
      followUpQuestions: [],
      ts: msg.ts,
    };
  });
}

/** Fetch full chat history for a session; returns turns and session metadata. */
export async function getSessionHistory(sessionId: string, token: string): Promise<{
  turns:       ChatTurn[];
  currentMode: ConciergeMode;
  sessionName: string | null;
}> {
  const data = await request<SessionHistoryResponse>(`/sessions/${encodeURIComponent(sessionId)}`, token);
  return {
    turns:       historyToTurns(data.history),
    currentMode: data.currentMode,
    sessionName: data.sessionName || null,
  };
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getUserProfile(token: string): Promise<UserProfile> {
  const { profile } = await request<{ profile: UserProfile }>("/profile", token);
  return profile;
}
