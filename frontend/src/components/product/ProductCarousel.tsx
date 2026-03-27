import type { ProductCard as ProductCardType } from "../../types";

interface Props {
  products: ProductCardType[];
}

export default function ProductCarousel({ products }: Props) {
  if (!products.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory custom-scrollbar">
      {products.map((p) => (
        <div key={p.productId} className="snap-start shrink-0 w-44 rounded-xl border border-border-light overflow-hidden bg-surface-light">
          <div className="h-32 relative">
            <img
              src={p.imageUrl || "https://placehold.co/176x128/f5f5f5/c0c0c0?text=?"}
              alt={p.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/176x128/f5f5f5/c0c0c0?text=?"; }}
            />
          </div>
          <div className="p-2.5 space-y-1">
            <p className="text-[9px] text-primary font-bold uppercase truncate">{p.subCategory}</p>
            <p className="text-xs font-bold text-black truncate">{p.name}</p>
            <p className="text-[10px] text-neutral-500 font-bold">₹{p.price.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-neutral-400 italic leading-tight line-clamp-2">"{p.reason}"</p>
          </div>
        </div>
      ))}
    </div>
  );
}
