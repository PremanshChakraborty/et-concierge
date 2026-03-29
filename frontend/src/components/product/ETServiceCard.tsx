import type { ETServiceCard as ETServiceCardType } from "../../types";

interface Props {
  service: ETServiceCardType;
}

export default function ETServiceCard({ service }: Props) {
  return (
    <div className="bg-surface-light rounded-xl border border-border-light overflow-hidden group">
      {/* Image */}
      <div className="aspect-[4/3] relative">
        <img
          src={service.imageUrl || "https://placehold.co/280x350/f5f5f5/c0c0c0?text=No+Image"}
          alt={service.name}
          className="w-full h-full object-cover grayscale-0 group-hover:grayscale transition-all duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/280x350/f5f5f5/c0c0c0?text=No+Image"; }}
        />
        {/* Price badge */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold rounded">
          ₹{service.price.toLocaleString("en-IN")}{service.priceModel !== "one-time" ? `/${service.priceModel}` : ""}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-primary font-bold mb-1">
            {service.category} · {service.subCategory}
          </p>
          <h4 className="text-sm font-bold text-black">{service.name}</h4>
        </div>

        {/* Reason blurb */}
        {service.reason && (
          <div className="space-y-1">
            <p className="text-[11px] text-neutral-600 font-medium">Why this fits:</p>
            <p className="text-[11px] text-neutral-500 leading-tight italic">"{service.reason}"</p>
          </div>
        )}

        {/* Tags */}
        {service.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {service.tags.slice(0, 4).map((t) => (
              <span key={t} className="text-[9px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
        )}

        {/* CTA → external pageUrl */}
        <div className="pt-2">
          <a
            href={service.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full premium-gradient-horizontal text-white text-[11px] font-bold py-2 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            Learn More
          </a>
        </div>
      </div>
    </div>
  );
}
