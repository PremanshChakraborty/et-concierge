import { useEffect, useState } from "react";

const STATUS_MESSAGES = [
  "Analyzing request...",
  "Searching ET ecosystem...",
  "Gathering insights...",
];

export default function TypingIndicator() {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length), 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex justify-start">
      <div className="flex gap-3 max-w-[85%] w-full">
        {/* Avatar */}
        <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-white text-[16px]">assistant</span>
        </div>
        
        <div className="flex flex-col gap-2 mt-1">
          {/* Status text + Pulse dots */}
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-neutral-500 font-semibold tracking-wide">
              {STATUS_MESSAGES[statusIdx]}
            </p>
            <div className="flex gap-[3px] items-center">
              <span className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce"></span>
            </div>
          </div>

          {/* Sleek Skeleton Blocks replacing big product images */}
          <div className="flex flex-col gap-2 w-48 mt-1">
            <div className="h-3 w-full skeleton rounded-full" />
            <div className="h-3 w-4/5 skeleton rounded-full" />
            <div className="h-3 w-2/3 skeleton rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
