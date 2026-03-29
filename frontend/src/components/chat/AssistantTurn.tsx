import type { ETServiceCard, ETArticleCard } from "../../types";
import ChatBubble from "./ChatBubble";
import ContentCarousel from "../product/ContentCarousel";
import SuggestionChips from "./SuggestionChips";

interface Props {
  turnId: string;
  text: string;
  services: ETServiceCard[];
  articles: ETArticleCard[];
  followUpQuestions: string[];
  onSelectChip: (q: string) => void;
  isSpotlight?: boolean;
  onShowInSpotlight?: (turnId: string) => void;
}

export default function AssistantTurn({ turnId, text, services, articles, followUpQuestions, onSelectChip, isSpotlight, onShowInSpotlight }: Props) {
  const hasCards = services.length > 0 || articles.length > 0;

  return (
    <div className="flex justify-start">
      <div className="flex flex-col gap-3 max-w-[85%]">
        <ChatBubble text={text} />
        {hasCards && (
          <div className="flex flex-col gap-2 items-start mt-1">
            <div className="w-full">
              <ContentCarousel services={services} articles={articles} />
            </div>
            {!isSpotlight && (
              <button 
                onClick={() => onShowInSpotlight?.(turnId)}
                className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm border border-neutral-200"
                title="View these in the right sidebar spotlight"
              >
                <span className="material-symbols-outlined text-[16px]">view_sidebar</span>
                Show in Spotlight
              </button>
            )}
            {isSpotlight && (
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold border border-primary/20 shadow-sm cursor-default">
                <span className="material-symbols-outlined text-[16px]">view_sidebar</span>
                Active in Spotlight
              </div>
            )}
          </div>
        )}
        {followUpQuestions.length > 0 && (
          <SuggestionChips questions={followUpQuestions} onSelect={onSelectChip} />
        )}
      </div>
    </div>
  );
}
