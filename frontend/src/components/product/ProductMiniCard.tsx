import type { ProductCard as ProductCardType } from "../../types";

interface Props {
  product: ProductCardType;
  onClick?: () => void;
}

export default function ProductMiniCard({ product, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-light rounded-xl border border-border-light p-3 flex gap-3 group cursor-pointer hover:border-black/20 transition-colors${onClick ? " hover:ring-1 hover:ring-black/10" : ""}`}
    >
      <div className="size-16 rounded-lg overflow-hidden shrink-0 bg-neutral-100">
        <img
          src={product.imageUrl || "https://placehold.co/64x64/f5f5f5/c0c0c0?text=?"}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/64x64/f5f5f5/c0c0c0?text=?"; }}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-[9px] text-primary font-bold uppercase">
          {product.category}{product.aisleName ? ` · ${product.aisleName}` : ""}
        </p>
        <p className="text-xs font-bold text-black truncate">{product.name}</p>
        <p className="text-xs text-neutral-400 font-bold mt-0.5">₹{product.price.toLocaleString("en-IN")}</p>
      </div>
      <div className="flex items-center">
        <span className="material-symbols-outlined text-black/20">chevron_right</span>
      </div>
    </div>
  );
}
