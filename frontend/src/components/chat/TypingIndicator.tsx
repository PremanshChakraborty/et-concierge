import { useEffect, useState } from "react";

const STATUS_MESSAGES = [
  "Searching the catalog...",
  "Finding best matches...",
  "Almost there...",
];

export default function TypingIndicator() {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex justify-start">
      <div className="flex flex-col gap-3 max-w-[85%] w-full">
        {/* Status text */}
        <p className="text-xs text-neutral-400 font-medium">{STATUS_MESSAGES[statusIdx]}</p>

        {/* Skeleton product cards */}
        <div className="flex gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="w-40 rounded-xl border border-border-light overflow-hidden">
              <div className="h-28 skeleton" />
              <div className="p-3 space-y-2">
                <div className="h-2.5 w-3/4 skeleton rounded-full" />
                <div className="h-2 w-1/2 skeleton rounded-full" />
                <div className="h-2 w-2/3 skeleton rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
