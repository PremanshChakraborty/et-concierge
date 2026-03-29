import { useRef, type KeyboardEvent } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";          // shrink first so scrollHeight is accurate
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleSend() {
    const value = ref.current?.value.trim();
    if (!value || disabled) return;
    onSend(value);
    if (ref.current) {
      ref.current.value = "";
      ref.current.style.height = "auto"; // reset height after send
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="p-6 bg-gradient-to-t from-white via-white to-transparent">
      <div className="max-w-2xl mx-auto">
        {/* items-end keeps send button anchored to bottom-right as textarea grows */}
        <div className="relative flex gap-2 items-end bg-neutral-50 border border-border-light rounded-2xl shadow-xl focus-within:border-black/30 transition-colors pl-4 pr-1.5 py-1.5">
          <textarea
            ref={ref}
            rows={1}
            disabled={disabled}
            onInput={autoResize}
            onKeyDown={handleKeyDown}
            placeholder="Ask about styles, sizing, or trends..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-black py-2 resize-none max-h-40 custom-scrollbar text-sm outline-none disabled:opacity-50 overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={disabled}
            className="text-white rounded-xl hover:opacity-80 transition-transform bg-primary size-9 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:scale-100 mb-0.5"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
        <p className="text-[10px] text-center text-neutral-400 mt-3 font-medium uppercase tracking-widest">
          AI responses are enriched with your profile data
        </p>
      </div>
    </div>
  );
}
