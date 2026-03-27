/**
 * ModeSwitchChip — renders like a WhatsApp date divider.
 * Appears inline in the chat thread at the point a mode change happened.
 */

interface Props {
  toMode: "app" | "store";
  storeName?: string;
}

export default function ModeSwitchChip({ toMode, storeName }: Props) {
  const isStore = toMode === "store";

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <div className="flex-1 h-px bg-neutral-200" />
      <div
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest select-none ${
          isStore
            ? "bg-amber-50 border border-amber-200 text-amber-700"
            : "bg-green-50 border border-green-200 text-green-700"
        }`}
      >
        <span className="material-symbols-outlined text-[13px]">
          {isStore ? "store" : "language"}
        </span>
        {isStore ? (storeName ?? "Store Mode") : "Online Mode"}
      </div>
      <div className="flex-1 h-px bg-neutral-200" />
    </div>
  );
}
