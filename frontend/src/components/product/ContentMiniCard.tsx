import type { ETServiceCard, ETArticleCard } from "../../types";

interface Props {
  service?: ETServiceCard;
  article?: ETArticleCard;
  onClick?: () => void;
}

export default function ContentMiniCard({ service, article, onClick }: Props) {
  const name     = service?.name     ?? article?.title ?? "";
  const imageUrl = service?.imageUrl ?? article?.imageUrl ?? "";
  const label    = service
    ? service.category
    : `ET Prime · ${article?.category ?? ""}`;
  const detail   = service
    ? `₹${service.price.toLocaleString("en-IN")}${service.priceModel !== "one-time" ? `/${service.priceModel}` : ""}`
    : article?.reason ?? article?.category ?? "";

  return (
    <div
      onClick={onClick}
      className={`bg-surface-light rounded-xl border border-border-light p-3 flex gap-3 group cursor-pointer hover:border-black/20 transition-colors${onClick ? " hover:ring-1 hover:ring-black/10" : ""}`}
    >
      <div className="size-16 rounded-lg overflow-hidden shrink-0 bg-neutral-100">
        <img
          src={imageUrl || "https://placehold.co/64x64/f5f5f5/c0c0c0?text=?"}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/64x64/f5f5f5/c0c0c0?text=?"; }}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-[9px] text-primary font-bold uppercase">{label}</p>
        <p className="text-xs font-bold text-black truncate">{name}</p>
        <p className="text-xs text-neutral-400 font-bold mt-0.5">{detail}</p>
      </div>
      <div className="flex items-center">
        <span className="material-symbols-outlined text-black/20">chevron_right</span>
      </div>
    </div>
  );
}
