/**
 * lib/session.ts — sessionId persistence in localStorage.
 */

const KEY = "retailai_session_id";

export function loadSessionId(): string | null {
  return localStorage.getItem(KEY);
}

export function saveSessionId(id: string): void {
  localStorage.setItem(KEY, id);
}

export function clearSessionId(): void {
  localStorage.removeItem(KEY);
}
