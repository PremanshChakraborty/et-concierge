import { useEffect, useRef } from "react";
import type { ChatTurn, ConciergeMode } from "../../types";
import UserBubble from "./UserBubble";
import AssistantTurn from "./AssistantTurn";
import TypingIndicator from "./TypingIndicator";
import ModeSwitchChip from "./ModeSwitchChip";

interface Props {
  turns: ChatTurn[];
  loading: boolean;
  onSelectChip: (q: string) => void;
  /** Called whenever a mode_switch chip enters/leaves the viewport — used by ChatHeader for the sticky chip */
  onActiveModeChange?: (toMode: ConciergeMode | null) => void;
  activeSpotlightId?: string | null;
  onShowInSpotlight?: (turnId: string) => void;
}

export default function ChatHistory({ turns, loading, onSelectChip, onActiveModeChange, activeSpotlightId, onShowInSpotlight }: Props) {
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

    modeSwitchTurns.forEach((turn) => {
      const el = chipRefs.current.get(turn.id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            onActiveModeChange?.(turn.toMode ?? null);
          }
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
                <ModeSwitchChip toMode={turn.toMode ?? "advisory"} />
              </div>
            );
          }
          if (turn.role === "user") {
            return <UserBubble key={turn.id} message={turn.message ?? ""} />;
          }
          return (
            <AssistantTurn
              key={turn.id}
              turnId={turn.id}
              text={turn.text ?? ""}
              services={turn.services ?? []}
              articles={turn.articles ?? []}
              followUpQuestions={turn.followUpQuestions ?? []}
              onSelectChip={onSelectChip}
              isSpotlight={activeSpotlightId === turn.id}
              onShowInSpotlight={onShowInSpotlight}
            />
          );
        })}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
