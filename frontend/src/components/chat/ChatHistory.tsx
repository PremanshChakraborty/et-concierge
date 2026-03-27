import { useEffect, useRef } from "react";
import type { ChatTurn } from "../../types";
import UserBubble from "./UserBubble";
import AssistantTurn from "./AssistantTurn";
import TypingIndicator from "./TypingIndicator";
import ModeSwitchChip from "./ModeSwitchChip";

interface Props {
  turns: ChatTurn[];
  loading: boolean;
  onSelectChip: (q: string) => void;
  /** Called whenever a mode_switch chip enters/leaves the viewport — used by ChatHeader for the sticky chip */
  onActiveModeChange?: (toMode: "app" | "store" | null, storeName?: string) => void;
}

export default function ChatHistory({ turns, loading, onSelectChip, onActiveModeChange }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const chipRefs  = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-scroll to bottom on new turns / loading state
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  // Track which mode_switch chips are visible → let ChatHeader know the "last scrolled-past" mode
  useEffect(() => {
    if (!onActiveModeChange) return;

    const modeSwitchTurns = turns.filter((t) => t.role === "mode_switch");
    if (modeSwitchTurns.length === 0) {
      onActiveModeChange(null);
      return;
    }

    const observers: IntersectionObserver[] = [];

    // For each chip: when it scrolls OUT of view (above the header), report its mode as "active"
    modeSwitchTurns.forEach((turn) => {
      const el = chipRefs.current.get(turn.id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          // chip just scrolled up/out of view → its mode is now "current"
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            onActiveModeChange?.(turn.toMode ?? null, turn.storeName);
          }
          // chip came back into view → possibly no longer the sticky one
          // We let the last out-of-view chip win (handled by ChatHeader)
        },
        { threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [turns, onActiveModeChange]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 custom-scrollbar relative">
      <div className="max-w-2xl mx-auto py-10 space-y-8">
        {turns.map((turn) => {
          if (turn.role === "mode_switch") {
            return (
              <div
                key={turn.id}
                ref={(el) => {
                  if (el) chipRefs.current.set(turn.id, el);
                  else chipRefs.current.delete(turn.id);
                }}
              >
                <ModeSwitchChip toMode={turn.toMode ?? "app"} storeName={turn.storeName} />
              </div>
            );
          }
          if (turn.role === "user") {
            return <UserBubble key={turn.id} message={turn.message ?? ""} />;
          }
          return (
            <AssistantTurn
              key={turn.id}
              text={turn.text ?? ""}
              products={turn.products ?? []}
              followUpQuestions={turn.followUpQuestions ?? []}
              onSelectChip={onSelectChip}
            />
          );
        })}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
