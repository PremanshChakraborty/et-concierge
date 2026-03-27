import { useState } from "react";
import type { Session, StoreDetails } from "../../types";

interface Props {
  sessions:        Session[];
  activeSessionId: string | null;
  currentMode:     "app" | "store";
  storeDetails:    StoreDetails | null;
  userEmail:       string;
  onNewChat:       () => void;
  onSelectSession: (sessionId: string) => void;
  onSettings:      () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function truncateId(id: string): string {
  return id.replace("ses_", "").slice(0, 8).toUpperCase();
}

export default function Sidebar({
  sessions,
  activeSessionId,
  currentMode,
  storeDetails,
  userEmail,
  onNewChat,
  onSelectSession,
  onSettings,
}: Props) {
  const isStore = currentMode === "store";
  const [storeExpanded, setStoreExpanded] = useState(true);

  // Cap sessions at 5 in the sidebar
  const recentSessions = sessions.slice(0, 5);

  return (
    <aside className="w-72 bg-white border-r border-border-light flex flex-col shrink-0">
      {/* Header */}
      <div className="p-6 pb-4">
        <h1 className="text-2xl font-black tracking-tighter text-gradient mb-6">Retail AI</h1>

        {/* New Chat — always visible */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-between gap-2 bg-transparent border border-black/10 text-black font-medium py-3 px-4 rounded-xl transition-all hover:bg-black/5 hover:border-black/20"
        >
          <span className="text-sm">New Chat</span>
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar space-y-4 pb-4">

        {/* Recent sessions — always visible, max 5 */}
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-2">Recent</p>
          <div className="space-y-1">
            {recentSessions.length === 0 && (
              <p className="text-xs text-neutral-400 px-2">No sessions yet</p>
            )}
            {recentSessions.map((s) => {
              const isActive = s.sessionId === activeSessionId;
              return (
                <button
                  key={s.sessionId}
                  onClick={() => onSelectSession(s.sessionId)}
                  className={`w-full text-left flex flex-col gap-1 p-3 rounded-lg cursor-pointer transition-colors ${
                    isActive ? "bg-surface-light border border-black/10" : "hover:bg-surface-light border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium truncate ${isActive ? "text-black" : "text-black/60"}`}>
                      {truncateId(s.sessionId)}
                    </span>
                    <span className="text-[10px] text-neutral-400 shrink-0 ml-2">{timeAgo(s.lastUpdated)}</span>
                  </div>
                  <p className="text-xs text-neutral-400 truncate">
                    {s.currentMode === "store" ? "🏪 In-store session" : "Online shopping"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Store mode panel — only in store mode */}
        {isStore && storeDetails && (
          <div>
            {/* Collapsible store mode button */}
            <button
              onClick={() => setStoreExpanded((v) => !v)}
              className="w-full flex items-center justify-between bg-black text-white py-2.5 px-4 rounded-xl shadow-md mb-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-lg text-yellow-400"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  storefront
                </span>
                <span className="text-sm font-bold tracking-tight">Store Mode</span>
              </div>
              <span className="material-symbols-outlined text-white text-sm transition-transform duration-200"
                style={{ transform: storeExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                expand_more
              </span>
            </button>

            {/* Expandable store details */}
            {storeExpanded && (
              <div className="space-y-4 pt-1">
                {/* Store info */}
                <div className="space-y-1 px-1">
                  <p className="text-sm font-bold text-black leading-tight">{storeDetails.storeName}</p>
                  {storeDetails.address && (
                    <p className="text-[11px] text-neutral-500 leading-snug">{storeDetails.address}</p>
                  )}
                  {storeDetails.hours && (
                    <p className="text-[11px] text-neutral-500">{storeDetails.hours}</p>
                  )}
                  {storeDetails.phone && (
                    <p className="text-[11px] text-neutral-500">{storeDetails.phone}</p>
                  )}
                </div>

                {/* Aisle map */}
                <div>
                  <h2 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">Aisle Map</h2>
                  <div className="space-y-2">
                    {storeDetails.aisleMap.map((a) => (
                      <div key={a.label} className="p-3 rounded-lg bg-surface-light border border-black/5 space-y-0.5">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{a.label}</p>
                        <p className="text-sm font-semibold text-black leading-snug">{a.description}</p>
                        <p className="text-[11px] text-neutral-400 italic leading-snug">{a.directions}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User chip */}
      <div className="p-4 border-t border-border-light">
        <button
          onClick={onSettings}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light transition-colors"
        >
          <div className="size-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-neutral-400">person</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-black truncate">{userEmail}</p>
            <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-tight">Member</p>
          </div>
          <span className="material-symbols-outlined text-black">settings</span>
        </button>
      </div>
    </aside>
  );
}
