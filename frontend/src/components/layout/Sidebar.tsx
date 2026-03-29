
import type { Session, ConciergeMode } from "../../types";

interface Props {
  sessions:        Session[];
  activeSessionId: string | null;
  currentMode:     ConciergeMode;
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
  userEmail,
  onNewChat,
  onSelectSession,
  onSettings,
}: Props) {
  // Cap sessions at 5 in the sidebar
  const recentSessions = sessions.slice(0, 5);

  return (
    <aside className="w-72 bg-white border-r border-border-light flex flex-col shrink-0">
      {/* Header */}
      <div className="p-6 pb-4">
        <h1 className="text-2xl font-black tracking-tighter text-gradient mb-6">ET Concierge</h1>

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
                      {s.sessionName || truncateId(s.sessionId)}
                    </span>
                    <span className="text-[10px] text-neutral-400 shrink-0 ml-2">{timeAgo(s.lastUpdated)}</span>
                  </div>
                  <p className="text-xs text-neutral-400 truncate">
                    {s.currentMode === "prime-news" ? "📰 Prime News" : "💼 Advisory"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
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
