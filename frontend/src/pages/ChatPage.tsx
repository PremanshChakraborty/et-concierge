import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import type { ChatState, ChatTurn, ConciergeMode, Session, UserProfile } from "../types";
import { getAccessToken, getCurrentUserEmail, signOut } from "../lib/auth";
import { sendChat, sendModeSwitch } from "../lib/api";
import { getSessions, getSessionHistory, getUserProfile } from "../lib/profileApi";
import { loadSessionId, saveSessionId, clearSessionId } from "../lib/session";

import Sidebar from "../components/layout/Sidebar";
import ChatHeader from "../components/layout/ChatHeader";
import ContentDrawer from "../components/layout/ProductDrawer";
import ChatHistory from "../components/chat/ChatHistory";
import ChatInput from "../components/chat/ChatInput";
import SettingsPanel from "../components/modals/SettingsPanel";

function now() { return new Date().toISOString(); }

/**
 * loadSession — single encapsulated helper for all session restore scenarios.
 * Fetches the session's chat history and metadata.
 * Caches turns in the provided Map to avoid re-fetching on repeated switches.
 */
async function loadSession(
  sessionId: string,
  token: string,
  cache: Map<string, { turns: ChatTurn[]; currentMode: ConciergeMode; sessionName?: string | null }>,
): Promise<{
  turns:       ChatTurn[];
  currentMode: ConciergeMode;
  sessionName?: string | null;
}> {
  const hist = await getSessionHistory(sessionId, token);
  const result = { turns: hist.turns, currentMode: hist.currentMode, sessionName: hist.sessionName };
  cache.set(sessionId, result);
  return result;
}


interface Props {
  onSignOut: () => void;
}

export default function ChatPage({ onSignOut }: Props) {
  const [state, setState]           = useState<ChatState>({ sessionId: loadSessionId(), sessionName: null, turns: [], loading: false, error: null, currentMode: "advisory" });
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail]   = useState("...");
  const [showSettings, setShowSettings] = useState(false);
  const [stickyChip, setStickyChip] = useState<{ toMode: ConciergeMode } | null>(null);

  // Session cache — stores full loadSession result (turns + mode)
  const sessionCache = useRef<Map<string, { turns: ChatTurn[]; currentMode: ConciergeMode; sessionName?: string | null }>>(new Map());

  const [spotlightTurnId, setSpotlightTurnId] = useState<string | null>(null);

  // Compute drawer items: either the actively spotlighted turn, or the latest assistant turn with cards
  const activeFocusTurn = useMemo(() => {
    if (spotlightTurnId) {
      const turn = state.turns.find(t => t.id === spotlightTurnId);
      if (turn && (turn.services?.length || turn.articles?.length)) return turn;
    }
    return [...state.turns].reverse().find((t) => t.role === "assistant" && (t.services?.length || t.articles?.length));
  }, [state.turns, spotlightTurnId]);

  const drawerServices = activeFocusTurn?.services ?? [];
  const drawerArticles = activeFocusTurn?.articles ?? [];

  // Load on mount — restore sessions and current session state
  useEffect(() => {
    async function loadInitial() {
      try {
        const token = await getAccessToken();
        const [email, sessionList, profileData] = await Promise.all([
          getCurrentUserEmail(),
          getSessions(token),
          getUserProfile(token).catch(() => null)
        ]);
        setUserEmail(email);
        setSessions(sessionList);
        if (profileData) setUserProfile(profileData);

        const savedId = loadSessionId();
        if (savedId) {
          const restored = await loadSession(savedId, token, sessionCache.current);
          setState((prev) => ({ ...prev, ...restored }));
        }
      } catch (e) {
        console.error("[ChatPage] load error:", e);
      }
    }
    loadInitial();
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (message: string) => {
    if (state.loading) return;
    setSpotlightTurnId(null);

    const userTurn: ChatTurn = { id: uuid(), role: "user", message, ts: now() };
    setState((s) => ({ ...s, loading: true, error: null, turns: [...s.turns, userTurn] }));

    try {
      const token = await getAccessToken();
      const data = await sendChat(message, token, state.sessionId);

      if (data.sessionId) {
        saveSessionId(data.sessionId);
        setSessions((prev) => {
          const exists = prev.some((s) => s.sessionId === data.sessionId);
          if (exists) {
            return prev.map(s => s.sessionId === data.sessionId ? { ...s, lastUpdated: now(), currentMode: data.currentMode, sessionName: data.sessionName || s.sessionName } : s);
          }
          return [{ sessionId: data.sessionId, sessionName: data.sessionName, lastUpdated: now(), currentMode: data.currentMode }, ...prev];
        });
      }

      const assistantTurn: ChatTurn = {
        id: uuid(), role: "assistant",
        text: data.text,
        services: data.services,
        articles: data.articles,
        followUpQuestions: data.followUpQuestions,
        ts: now(),
      };
      setState((s) => ({
        ...s,
        loading: false,
        sessionId: data.sessionId,
        sessionName: data.sessionName || s.sessionName,
        currentMode: data.currentMode,
        turns: [...s.turns, assistantTurn],
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setState((s) => ({ ...s, loading: false, error: msg }));
    }
  }, [state.loading, state.sessionId]);

  // ── Mode switch ───────────────────────────────────────────────────────────
  async function handleToggleMode() {
    if (!state.sessionId) return;
    const newMode: ConciergeMode = state.currentMode === "advisory" ? "prime-news" : "advisory";
    const switchTurn: ChatTurn = { id: uuid(), role: "mode_switch", toMode: newMode, ts: now() };
    setState((s) => ({ ...s, loading: true, turns: [...s.turns, switchTurn] }));
    try {
      const token = await getAccessToken();
      const data = await sendModeSwitch(state.sessionId, newMode, token);
      const assistantTurn: ChatTurn = {
        id: uuid(), role: "assistant",
        text: data.text,
        services: data.services,
        articles: data.articles,
        followUpQuestions: data.followUpQuestions,
        ts: now(),
      };
      setState((s) => ({ ...s, loading: false, currentMode: newMode, turns: [...s.turns, assistantTurn] }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }

  // ── New chat ──────────────────────────────────────────────────────────────
  function newChat() {
    clearSessionId();
    setState({ sessionId: null, sessionName: null, turns: [], loading: false, error: null, currentMode: "advisory" });
  }

  // ── Select session from history ────────────────────────────────────────────────
  async function selectSession(sessionId: string) {
    saveSessionId(sessionId);
    setStickyChip(null);

    const cached = sessionCache.current.get(sessionId);
    if (cached) {
      setState({ sessionId, ...cached, loading: false, error: null });
      return;
    }

    setState({ sessionId, sessionName: null, turns: [], loading: true, error: null, currentMode: "advisory" });
    try {
      const token = await getAccessToken();
      const restored = await loadSession(sessionId, token, sessionCache.current);
      setState({ sessionId, ...restored, loading: false, error: null });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  async function handleSignOut() {
    clearSessionId();
    await signOut();
    onSignOut();
  }

  return (
    <div className="flex h-screen w-full relative font-display">
      {/* Modals */}
      {showSettings && (
        <SettingsPanel
          userEmail={userEmail}
          userProfile={userProfile}
          onSignOut={handleSignOut}
          onClose={() => setShowSettings(false)}
          onCompleteProfile={() => sendMessage("I want to complete my profile")}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={state.sessionId}
        userEmail={userEmail}
        onNewChat={newChat}
        onSelectSession={selectSession}
        onSettings={() => setShowSettings(true)}
      />

      {/* Main — key forces full remount on session switch, resetting all child state */}
      <main key={state.sessionId ?? "new"} className="flex-1 flex flex-col relative bg-white">
        <ChatHeader
          sessionId={state.sessionId}
          sessionName={state.sessionName}
          currentMode={state.currentMode}
          onToggleMode={handleToggleMode}
          stickyChip={stickyChip}
        />
        {state.error && (
          <div className="mx-8 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {state.error}
          </div>
        )}
        <ChatHistory
          turns={state.turns}
          loading={state.loading}
          onSelectChip={sendMessage}
          onActiveModeChange={(toMode) =>
            setStickyChip(toMode ? { toMode } : null)
          }
          activeSpotlightId={activeFocusTurn?.id ?? null}
          onShowInSpotlight={setSpotlightTurnId}
        />

        <ChatInput onSend={sendMessage} disabled={state.loading} />
      </main>

      {/* Content Drawer */}
      <ContentDrawer
        services={drawerServices}
        articles={drawerArticles}
        currentMode={state.currentMode}
      />
    </div>
  );
}
