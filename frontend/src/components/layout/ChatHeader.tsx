import ModeSwitchChip from "../chat/ModeSwitchChip";

interface Props {
  sessionId:        string | null;
  currentMode:      "app" | "store";
  storeName?:       string;
  onOpenStoreModal: () => void;
  onSwitchToOnline: () => void;
  /** Set by ChatHistory's IntersectionObserver when a mode chip scrolls above the viewport */
  stickyChip:       { toMode: "app" | "store"; storeName?: string } | null;
}

export default function ChatHeader({
  sessionId,
  currentMode,
  onOpenStoreModal,
  onSwitchToOnline,
  stickyChip,
}: Props) {
  const isStore = currentMode === "store";
  const showStickyChip = stickyChip !== null;

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border-light">
      <div className="h-16 flex items-center justify-between px-8">

        {/* Left: session label + mode entry/exit button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-500">Session:</span>
            <span className="text-sm font-bold text-black">
              {sessionId ? sessionId.replace("ses_", "").slice(0, 8).toUpperCase() : "New Chat"}
            </span>
          </div>
        </div>

        {/* Right: mode pill + share */}
        <div className="flex items-center gap-4">
          {!isStore && (
            <button
              onClick={onOpenStoreModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-black/10 hover:bg-neutral-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">store</span>
              <span className="text-sm font-bold">Store</span>
            </button>
          )}

          {/* Exit store mode — only in store mode */}
          {isStore && (
            <button
              onClick={onSwitchToOnline}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-black/10 hover:bg-neutral-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">language</span>
              <span className="text-sm font-bold">Exit Store</span>
            </button>
          )}

          <button className="text-black hover:text-black/70 transition-colors">
            <span className="material-symbols-outlined">share</span>
          </button>
        </div>
      </div>

      {/* Floating mode chip — absolute positioned to float outside the header's bounds */}
      {showStickyChip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <ModeSwitchChip toMode={stickyChip!.toMode} storeName={stickyChip!.storeName} />
          </div>
        </div>
      )}
    </header>
  );
}