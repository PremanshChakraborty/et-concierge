import type { ETServiceCard, ETArticleCard } from "../../types";

interface Props {
  services: ETServiceCard[];
  articles: ETArticleCard[];
}

/** Inline carousel in chat — shows service/article thumbnails horizontally. */
export default function ContentCarousel({ services, articles }: Props) {
  const hasContent = services.length > 0 || articles.length > 0;
  if (!hasContent) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory custom-scrollbar">
      {services.map((s) => (
        <a
          key={s.productId}
          href={s.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="snap-start shrink-0 w-44 rounded-xl border border-border-light overflow-hidden bg-surface-light hover:border-black/20 transition-colors"
        >
          <div className="h-32 relative">
            <img
              src={s.imageUrl || "https://placehold.co/176x128/f5f5f5/c0c0c0?text=?"}
              alt={s.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/176x128/f5f5f5/c0c0c0?text=?"; }}
            />
          </div>
          <div className="p-2.5 space-y-1">
            <p className="text-[9px] text-primary font-bold uppercase truncate">{s.subCategory}</p>
            <p className="text-xs font-bold text-black truncate">{s.name}</p>
            <p className="text-[10px] text-neutral-500 font-bold">
              ₹{s.price.toLocaleString("en-IN")}{s.priceModel !== "one-time" ? `/${s.priceModel}` : ""}
            </p>
            {s.reason && (
              <p className="text-[10px] text-neutral-400 italic leading-tight line-clamp-2">"{s.reason}"</p>
            )}
          </div>
        </a>
      ))}

      {articles.map((a) => (
        <a
          key={a.articleId}
          href={a.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="snap-start shrink-0 w-44 rounded-xl border border-border-light overflow-hidden bg-surface-light hover:border-black/20 transition-colors"
        >
          <div className="h-32 relative">
            <img
              src={a.imageUrl || "https://placehold.co/176x128/f5f5f5/c0c0c0?text=?"}
              alt={a.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/176x128/f5f5f5/c0c0c0?text=?"; }}
            />
          </div>
          <div className="p-2.5 space-y-1">
            <p className="text-[9px] text-primary font-bold uppercase truncate">ET Prime · {a.category}</p>
            <p className="text-xs font-bold text-black truncate">{a.title}</p>
            {a.reason && (
              <p className="text-[10px] text-neutral-400 italic leading-tight line-clamp-2">"{a.reason}"</p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
