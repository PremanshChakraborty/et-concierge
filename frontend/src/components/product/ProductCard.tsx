import { useState } from "react";
import type { ProductCard as ProductCardType, CartItem, WishlistItem } from "../../types";

const COLOR_MAP: Record<string, string> = {
  Blush: "#f4a7b9", White: "#ffffff", Coral: "#ff6b6b", Ivory: "#fffff0",
  Black: "#000000", Navy: "#001f5b", Red: "#e53935", Blue: "#1e88e5",
  Green: "#43a047", Yellow: "#fdd835", Pink: "#f06292", Gold: "#ffc107",
  "Dusty Rose": "#c2889a", "Sage Green": "#8fbc8f", Maroon: "#800000",
};

interface Props {
  product: ProductCardType;
  currentMode?: "app" | "store";
  onAddToCart?: (item: CartItem) => void;
  onAddToWishlist?: (item: WishlistItem) => void;
}

export default function ProductCard({ product, currentMode = "app", onAddToCart, onAddToWishlist }: Props) {
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? "M");
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? "");
  const [wishlisted, setWishlisted] = useState(false);

  function handleWishlist() {
    setWishlisted((w) => !w);
    onAddToWishlist?.({ productId: product.productId, name: product.name, imageUrl: product.imageUrl, price: product.price });
  }

  return (
    <div className="bg-surface-light rounded-xl border border-border-light overflow-hidden group">
      {/* Image */}
      <div className="aspect-[4/5] relative">
        <img
          src={product.imageUrl || "https://placehold.co/280x350/f5f5f5/c0c0c0?text=No+Image"}
          alt={product.name}
          className="w-full h-full object-cover grayscale-0 group-hover:grayscale transition-all duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/280x350/f5f5f5/c0c0c0?text=No+Image"; }}
        />
        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          className="absolute top-3 right-3 size-8 bg-white/80 backdrop-blur-md rounded-full text-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
        >
          <span
            className="material-symbols-outlined text-sm"
            style={{ fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>
        {/* Store aisle badge */}
        {currentMode === "store" && product.aisleName && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/80 backdrop-blur-md text-white text-[9px] font-bold rounded flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">location_on</span>
            {product.aisleName}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-primary font-bold mb-1">
            {product.category} · {product.subCategory}
          </p>
          <h4 className="text-sm font-bold text-black">{product.name}</h4>
        </div>

        <p className="text-black font-black">
          ₹{product.price.toLocaleString("en-IN")}
        </p>

        {/* Reason blurb */}
        <div className="space-y-1">
          <p className="text-[11px] text-neutral-600 font-medium">Why you'll love it:</p>
          <p className="text-[11px] text-neutral-500 leading-tight italic">"{product.reason}"</p>
        </div>

        {/* Colors */}
        {product.colors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-neutral-400 mr-1">Colors:</span>
            {product.colors.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => setSelectedColor(c)}
                className={`size-3.5 rounded-full border transition-all ${selectedColor === c ? "border-black scale-125" : "border-black/10"}`}
                style={{ backgroundColor: COLOR_MAP[c] ?? "#ccc" }}
              />
            ))}
          </div>
        )}

        {/* Sizes */}
        {product.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[10px] text-neutral-400 mr-1">Sizes:</span>
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSize(s)}
                className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                  selectedSize === s ? "bg-black text-white border-black font-bold" : "bg-white border-border-light"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {product.tags.slice(0, 4).map((t) => (
              <span key={t} className="text-[9px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="pt-2">
          {currentMode === "store" ? (
            <button className="w-full premium-gradient-horizontal text-white text-[11px] font-bold py-2 rounded-lg hover:opacity-90 transition-all">
              Check Availability
            </button>
          ) : (
            <button
              onClick={() => onAddToCart?.({ productId: product.productId, name: product.name, imageUrl: product.imageUrl, price: product.price, size: selectedSize, color: selectedColor, quantity: 1 })}
              className="w-full premium-gradient-horizontal text-white text-[11px] font-bold py-2 rounded-lg hover:opacity-90 transition-all"
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
