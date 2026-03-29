import { useState } from "react";
import type { ConciergeMode } from "../../types";
import ModeSwitchChip from "../chat/ModeSwitchChip";

interface Props {
  sessionId:      string | null;
  sessionName?:   string | null;
  currentMode:    ConciergeMode;
  onToggleMode:   () => void;
  /** Set by ChatHistory's IntersectionObserver when a mode chip scrolls above the viewport */
  stickyChip:     { toMode: ConciergeMode } | null;
}

export default function ChatHeader({
  sessionId,
  sessionName,
  currentMode,
  onToggleMode,
  stickyChip,
}: Props) {
  const isNews = currentMode === "prime-news";
  const showStickyChip = stickyChip !== null;
  const [showInfo, setShowInfo] = useState(false);

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border-light">
      <div className="h-16 flex items-center justify-between px-8">

        {/* Left: session label */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-500">Session:</span>
            <span className="text-sm font-bold text-black truncate max-w-[200px]">
              {sessionName || (sessionId ? sessionId.replace("ses_", "").slice(0, 8).toUpperCase() : "New Chat")}
            </span>
          </div>
        </div>

        {/* Right: mode toggle + share */}
        <div className="flex items-center gap-4">
          {/* Sliding Mode Toggle */}
          <div className="relative flex items-center bg-neutral-100/80 border border-neutral-200 rounded-lg p-0 overflow-hidden transition-colors shadow-inner">
            {/* Sliding Pill Background */}
            <div
              className={`absolute top-0 bottom-0 w-[130px] rounded-lg bg-primary shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isNews ? "translate-x-[130px]" : "translate-x-0"
              }`}
            />
            
            {/* Option 1: Advisory */}
            <button
              onClick={() => { if (isNews) onToggleMode(); }}
              className={`relative z-10 w-[130px] flex items-center justify-center gap-1.5 py-1.5 transition-colors duration-200 cursor-pointer ${
                !isNews ? "text-white" : "text-neutral-500 hover:text-black"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">assistant</span>
              <span className="text-sm font-bold tracking-tight">Advisory</span>
            </button>

            {/* Option 2: Prime News */}
            <button
              onClick={() => { if (!isNews) onToggleMode(); }}
              className={`relative z-10 w-[130px] flex items-center justify-center gap-1.5 py-1.5 transition-colors duration-200 cursor-pointer ${
                isNews ? "text-white" : "text-neutral-500 hover:text-black"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">newspaper</span>
              <span className="text-sm font-bold tracking-tight">Prime News</span>
            </button>
          </div>

          <div className="relative flex items-center">
            <button 
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
              onClick={() => setShowInfo(!showInfo)}
              className="text-black hover:text-black/70 transition-colors flex items-center"
            >
              <span className="material-symbols-outlined">info</span>
            </button>

            {showInfo && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-black/10 shadow-2xl rounded-xl p-4 z-50">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  <strong className="text-black">Advisory Mode:</strong> Explore the various services in the ET ecosystem and help us know about you.<br/><br/>
                  <strong className="text-black">Prime News Mode:</strong> Get a personalized feed of articles and deep-dives tailored to your financial profile.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating mode chip — absolute positioned to float outside the header's bounds */}
      {/* {showStickyChip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <ModeSwitchChip toMode={stickyChip!.toMode} />
          </div>
        </div>
      )} */}
    </header>
  );
}