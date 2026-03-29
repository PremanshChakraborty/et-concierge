import { useState } from "react";
import type { ETServiceCard as ETServiceCardType, ETArticleCard as ETArticleCardType, ConciergeMode } from "../../types";
import ETServiceCard from "../product/ETServiceCard";
import ETArticleCard from "../product/ETArticleCard";
import ContentMiniCard from "../product/ContentMiniCard";

interface Props {
  services: ETServiceCardType[];
  articles: ETArticleCardType[];
  currentMode: ConciergeMode;
}

export default function ContentDrawer({ services, articles, currentMode }: Props) {
  const [spotlightIdx, setSpotlightIdx] = useState(0);

  // Merge cards into a single ordered list for the spotlight
  type DrawerItem =
    | { kind: "service"; data: ETServiceCardType }
    | { kind: "article"; data: ETArticleCardType };

  const items: DrawerItem[] = [
    ...services.map((s) => ({ kind: "service" as const, data: s })),
    ...articles.map((a) => ({ kind: "article" as const, data: a })),
  ];

  const safeIdx = spotlightIdx < items.length ? spotlightIdx : 0;

  const emptyIcon = currentMode === "prime-news" ? "newspaper" : "category";
  const emptyText = currentMode === "prime-news"
    ? "Articles and services will appear here as you chat"
    : "Recommendations will appear here as you chat";

  return (
    <aside className="w-80 bg-white border-l border-border-light flex flex-col shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-black uppercase tracking-tighter">Spotlight</h3>
          {items.length > 0 && (
            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-bold">
              {safeIdx + 1}/{items.length}
            </span>
          )}
        </div>
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-neutral-300 gap-3">
            <span className="material-symbols-outlined text-4xl">{emptyIcon}</span>
            <p className="text-xs font-medium">{emptyText}</p>
          </div>
        ) : (
          <>
            {items.map((item, i) =>
              i === safeIdx ? (
                item.kind === "service" ? (
                  <ETServiceCard key={item.data.productId} service={item.data} />
                ) : (
                  <ETArticleCard key={item.data.articleId} article={item.data} />
                )
              ) : (
                <ContentMiniCard
                  key={item.kind === "service" ? item.data.productId : item.data.articleId}
                  service={item.kind === "service" ? item.data : undefined}
                  article={item.kind === "article" ? item.data : undefined}
                  onClick={() => setSpotlightIdx(i)}
                />
              )
            )}
          </>
        )}
      </div>
    </aside>
  );
}
