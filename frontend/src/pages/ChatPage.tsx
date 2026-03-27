import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import type { CartItem, ChatState, ChatTurn, ProductCard, Session, StoreDetails, WishlistItem } from "../types";
import { getAccessToken, getCurrentUserEmail, signOut } from "../lib/auth";
import { sendChat, sendModeSwitch } from "../lib/api";
import { getSessions, getSessionHistory, validateStoreCode, addToCart, addToWishlist, getCart } from "../lib/profileApi";
import { loadSessionId, saveSessionId, clearSessionId } from "../lib/session";

import Sidebar from "../components/layout/Sidebar";
import ChatHeader from "../components/layout/ChatHeader";
import ProductDrawer from "../components/layout/ProductDrawer";
import ChatHistory from "../components/chat/ChatHistory";
import ChatInput from "../components/chat/ChatInput";
import StoreCodeModal from "../components/modals/StoreCodeModal";
import SettingsPanel from "../components/modals/SettingsPanel";

function now() { return new Date().toISOString(); }

/**
 * loadSession — single encapsulated helper for all session restore scenarios.
 * Fetches the session's chat history, then if it's a store session, fetches
 * the full store details (including aisle map) via the stores API.
 * Caches turns in the provided Map to avoid re-fetching on repeated switches.
 *
 * Used by both:
 *   - loadInitial (page mount / refresh)
 *   - selectSession (sidebar session switch)
 */
async function loadSession(
  sessionId: string,
  token: string,
  cache: Map<string, { turns: ChatTurn[]; currentMode: "app" | "store"; storeDetails: StoreDetails | null }>,
): Promise<{
  turns:        ChatTurn[];
  currentMode:  "app" | "store";
  storeDetails: StoreDetails | null;
}> {
  // 1. Fetch history + session metadata
  const hist = await getSessionHistory(sessionId, token);

  // 2. If in store mode, fetch full store details (address, hours, aisle map)
  let storeDetails: StoreDetails | null = null;
  if (hist.currentMode === "store" && hist.currentStoreId) {
    try {
      storeDetails = await validateStoreCode(hist.currentStoreId, token);
    } catch {
      // Store fetch failed — degrade gracefully
    }
  }

  // 3. Cache the full result so re-switching is instant and store details are included
  const result = { turns: hist.turns, currentMode: hist.currentMode, storeDetails };
  cache.set(sessionId, result);
  return result;
}


interface Props {
  onSignOut: () => void;
}

export default function ChatPage({ onSignOut }: Props) {
  const [state, setState]           = useState<ChatState>({ sessionId: loadSessionId(), turns: [], loading: false, error: null, currentMode: "app", storeDetails: null });
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [userEmail, setUserEmail]   = useState("...");
  const [showStore, setShowStore]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stickyChip, setStickyChip] = useState<{ toMode: "app" | "store"; storeName?: string } | null>(null);

  // Session cache — stores full loadSession result (turns + mode + storeDetails)
  const sessionCache = useRef<Map<string, { turns: ChatTurn[]; currentMode: "app" | "store"; storeDetails: StoreDetails | null }>>(new Map());

  // Compute drawer products from the latest assistant turn — no extra state needed
  const drawerProducts = useMemo<ProductCard[]>(() => {
    const lastAssistant = [...state.turns].reverse().find((t) => t.role === "assistant");
    return lastAssistant?.products ?? [];
  }, [state.turns]);

  // Load on mount — restore sessions, cart, and current session state
  useEffect(() => {
    async function loadInitial() {
      try {
        const token = await getAccessToken();
        const [email, sessionList, cartItems] = await Promise.all([
          getCurrentUserEmail(),
          getSessions(token),
          getCart(token),
        ]);
        setUserEmail(email);
        setSessions(sessionList);
        setCart(cartItems);

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

    const userTurn: ChatTurn = { id: uuid(), role: "user", message, ts: now() };
    setState((s) => ({ ...s, loading: true, error: null, turns: [...s.turns, userTurn] }));

    try {
      const token = await getAccessToken();
      const data = await sendChat(message, token, state.sessionId);

      if (data.sessionId) {
        saveSessionId(data.sessionId);
        // Add to sidebar history if new
        setSessions((prev) => {
          const exists = prev.some((s) => s.sessionId === data.sessionId);
          return exists ? prev : [{ sessionId: data.sessionId, lastUpdated: now(), currentMode: data.currentMode }, ...prev];
        });
      }

      const assistantTurn: ChatTurn = {
        id: uuid(), role: "assistant",
        text: data.text,
        products: data.products,
        followUpQuestions: data.followUpQuestions,
        ts: now(),
      };
      setState((s) => ({
        ...s,
        loading: false,
        sessionId: data.sessionId,
        currentMode: data.currentMode,
        turns: [...s.turns, assistantTurn],
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setState((s) => ({ ...s, loading: false, error: msg }));
    }
  }, [state.loading, state.sessionId]);

  // ── Mode switch ───────────────────────────────────────────────────────────
  async function handleModeSwitch(details: StoreDetails) {
    if (!state.sessionId) return;
    setShowStore(false);
    // Inject a mode_switch chip into the chat
    const switchTurn: ChatTurn = { id: uuid(), role: "mode_switch", toMode: "store", storeName: details.storeName, ts: now() };
    setState((s) => ({ ...s, loading: true, storeDetails: details, turns: [...s.turns, switchTurn] }));
    try {
      const token = await getAccessToken();
      const data = await sendModeSwitch(state.sessionId, "store", token, details.storeId, details.storeName);
      const assistantTurn: ChatTurn = { id: uuid(), role: "assistant", text: data.text, products: data.products, followUpQuestions: data.followUpQuestions, ts: now() };
      setState((s) => ({ ...s, loading: false, currentMode: "store", turns: [...s.turns, assistantTurn] }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }

  async function handleSwitchToOnline() {
    if (!state.sessionId) return;
    // Inject a mode_switch chip into the chat
    const switchTurn: ChatTurn = { id: uuid(), role: "mode_switch", toMode: "app", ts: now() };
    setState((s) => ({ ...s, loading: true, storeDetails: null, turns: [...s.turns, switchTurn] }));
    setStickyChip(null);
    try {
      const token = await getAccessToken();
      const data = await sendModeSwitch(state.sessionId, "app", token);
      const assistantTurn: ChatTurn = { id: uuid(), role: "assistant", text: data.text, products: data.products, followUpQuestions: data.followUpQuestions, ts: now() };
      setState((s) => ({ ...s, loading: false, currentMode: "app", turns: [...s.turns, assistantTurn] }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }

  // ── New chat ──────────────────────────────────────────────────────────────
  function newChat() {
    clearSessionId();
    setState({ sessionId: null, turns: [], loading: false, error: null, currentMode: "app", storeDetails: null });
  }

  // ── Select session from history ────────────────────────────────────────────────
  async function selectSession(sessionId: string) {
    saveSessionId(sessionId);
    setStickyChip(null);

    // Cache hit — instant restore with full session data (turns + mode + storeDetails)
    const cached = sessionCache.current.get(sessionId);
    if (cached) {
      setState({ sessionId, ...cached, loading: false, error: null });
      return;
    }

    // Not cached — show loading state then call loadSession
    setState({ sessionId, turns: [], loading: true, error: null, currentMode: "app", storeDetails: null });
    try {
      const token = await getAccessToken();
      const restored = await loadSession(sessionId, token, sessionCache.current);
      setState({ sessionId, ...restored, loading: false, error: null });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }

  // ── Cart / Wishlist ───────────────────────────────────────────────────────
  async function handleAddToCart(item: CartItem) {
    try {
      const token = await getAccessToken();
      const updatedCart = await addToCart(item, token);
      setCart(updatedCart);
    } catch (e) { console.error(e); }
  }

  async function handleAddToWishlist(item: WishlistItem) {
    try {
      const token = await getAccessToken();
      await addToWishlist(item, token);
    } catch (e) { console.error(e); }
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
      {showStore && (
        <StoreCodeModal
          onClose={() => setShowStore(false)}
          onConfirm={handleModeSwitch}
          validateCode={(code) => getAccessToken().then((t) => validateStoreCode(code, t))}
        />
      )}
      {showSettings && (
        <SettingsPanel
          userEmail={userEmail}
          cart={cart}
          onSignOut={handleSignOut}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={state.sessionId}
        currentMode={state.currentMode}
        storeDetails={state.storeDetails}
        userEmail={userEmail}
        onNewChat={newChat}
        onSelectSession={selectSession}
        onSettings={() => setShowSettings(true)}
      />

      {/* Main — key forces full remount on session switch, resetting all child state */}
      <main key={state.sessionId ?? "new"} className="flex-1 flex flex-col relative bg-white">
        <ChatHeader
          sessionId={state.sessionId}
          currentMode={state.currentMode}
          storeName={state.storeDetails?.storeName}
          onOpenStoreModal={() => setShowStore(true)}
          onSwitchToOnline={handleSwitchToOnline}
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
          onActiveModeChange={(toMode, storeName) =>
            setStickyChip(toMode ? { toMode, storeName } : null)
          }
        />

        <ChatInput onSend={sendMessage} disabled={state.loading} />
      </main>

      {/* Product Drawer */}
      <ProductDrawer
        products={drawerProducts}
        currentMode={state.currentMode}
        onAddToCart={handleAddToCart}
        onAddToWishlist={handleAddToWishlist}
      />
    </div>
  );
}
