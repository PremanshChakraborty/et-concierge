import type { ETArticleCard as ETArticleCardType } from "../../types";

interface Props {
  article: ETArticleCardType;
}

export default function ETArticleCard({ article }: Props) {
  return (
    <div className="bg-surface-light rounded-xl border border-border-light overflow-hidden group">
      {/* Image */}
      <div className="aspect-[4/3] relative">
        <img
          src={article.imageUrl || "https://placehold.co/280x350/f5f5f5/c0c0c0?text=No+Image"}
          alt={article.title}
          className="w-full h-full object-cover grayscale-0 group-hover:grayscale transition-all duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/280x350/f5f5f5/c0c0c0?text=No+Image"; }}
        />
        {/* Category badge */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold rounded">
          {article.category}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <p className="text-[9px] uppercase tracking-wider text-primary font-bold">
              ET Prime · {article.category}
            </p>
            {article.published_at && (
              <p className="text-[9px] text-neutral-400 font-semibold tracking-wide">
                {new Date(article.published_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <h4 className="text-sm font-bold text-black leading-snug">{article.title}</h4>
        </div>

        {/* LLM Reason */}
        {article.reason && (
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-2.5 flex gap-2">
            <span className="material-symbols-outlined text-primary text-[14px] mt-0.5">auto_awesome</span>
            <p className="text-[11px] text-neutral-700 leading-snug">{article.reason}</p>
          </div>
        )}

        {/* Summary preview */}
        {article.summary && (
          <p className="text-[11px] text-neutral-500 leading-tight line-clamp-4">
            {article.summary}
          </p>
        )}

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {article.tags.slice(0, 4).map((t) => (
              <span key={t} className="text-[9px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
        )}

        {/* CTA → external sourceUrl */}
        <div className="pt-2">
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full premium-gradient-horizontal text-white text-[11px] font-bold py-2 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">article</span>
            Read on ET Prime
          </a>
        </div>
      </div>
    </div>
  );
}
