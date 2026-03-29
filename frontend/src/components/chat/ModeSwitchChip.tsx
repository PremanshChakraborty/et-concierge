/**
 * ModeSwitchChip — renders like a WhatsApp date divider.
 * Appears inline in the chat thread at the point a mode change happened.
 */

import type { ConciergeMode } from "../../types";

interface Props {
  toMode: ConciergeMode;
}

export default function ModeSwitchChip({ toMode }: Props) {
  const isNews = toMode === "prime-news";

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <div className="flex-1 h-px bg-neutral-200" />
      <div
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest select-none ${
          isNews
            ? "bg-amber-50 border border-amber-300 text-amber-700"
            : "bg-primary/10 border border-primary/40 text-primary"
        }`}
      >
        <span className="material-symbols-outlined text-[13px]">
          {isNews ? "newspaper" : "assistant"}
        </span>
        {isNews ? "Prime News" : "Advisory"}
      </div>
      <div className="flex-1 h-px bg-neutral-200" />
    </div>
  );
}
