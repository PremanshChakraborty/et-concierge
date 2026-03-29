/**
 * nodes/inputNode.ts — ET Concierge
 * Validates and normalises the incoming request.
 * Handles two request types:
 *   1. Regular chat:   { sessionId?, message }
 *   2. Mode switch:    { type: "mode_switch", sessionId, mode: "advisory" | "prime-news" }
 */

import { v4 as uuidv4 } from "uuid";
import { OrchestratorState, ConciergeMode } from "../state";

export async function inputNode(
  state: OrchestratorState
): Promise<Partial<OrchestratorState>> {
  try {
    const sessionId = state.sessionId?.trim() !== ""
      ? state.sessionId
      : `ses_${uuidv4()}`;

    // Mode switch path
    if (state.isModeSwitch) {
      if (!state.requestedMode) {
        return { error: "mode_switch request must include 'mode' field (advisory | prime-news)" };
      }
      const validModes: ConciergeMode[] = ["advisory", "prime-news"];
      if (!validModes.includes(state.requestedMode)) {
        return { error: `Invalid mode '${state.requestedMode}'. Must be 'advisory' or 'prime-news'.` };
      }
      return { sessionId, error: null };
    }

    // Regular chat path
    if (!state.userMessage || state.userMessage.trim() === "") {
      return { error: "userMessage is required and cannot be empty." };
    }

    return {
      sessionId,
      userMessage: state.userMessage.trim(),
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `inputNode: ${msg}` };
  }
}
