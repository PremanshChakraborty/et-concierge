import { useState } from "react";
import type { ProductCard as ProductCardType, CartItem, WishlistItem } from "../../types";
import ProductCard from "../product/ProductCard";
import ProductMiniCard from "../product/ProductMiniCard";

interface Props {
  products: ProductCardType[];
  currentMode: "app" | "store";
  onAddToCart: (item: CartItem) => void;
  onAddToWishlist: (item: WishlistItem) => void;
}

export default function ProductDrawer({ products, currentMode, onAddToCart, onAddToWishlist }: Props) {
  //const isStore = currentMode === "store";
  const [spotlightIdx, setSpotlightIdx] = useState(0);

  // Reset spotlight to 0 if products list shrinks (e.g. session switch)
  const safeIdx = spotlightIdx < products.length ? spotlightIdx : 0;
  //const spotlight = products[safeIdx];

  return (
    <aside className="w-80 bg-white border-l border-border-light flex flex-col shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-black uppercase tracking-tighter">Spotlight</h3>
          {products.length > 0 && (
            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-bold">
              {safeIdx + 1}/{products.length}
            </span>
          )}
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-neutral-300 gap-3">
            <span className="material-symbols-outlined text-4xl">checkroom</span>
            <p className="text-xs font-medium">Products will appear here as you chat</p>
          </div>
        ) : (
          <>
            {products.map((p, i) =>
              i === safeIdx ? (
                <ProductCard
                  key={p.productId}
                  product={p}
                  currentMode={currentMode}
                  onAddToCart={onAddToCart}
                  onAddToWishlist={onAddToWishlist}
                />
              ) : (
                <ProductMiniCard
                  key={p.productId}
                  product={p}
                  onClick={() => setSpotlightIdx(i)}
                />
              )
            )}
          </>
        )}
      </div>

      {/* CTA Footer
      {products.length > 0 && (
        <div className="p-4 border-t border-border-light bg-white">
          {isStore ? (
            <button className="w-full bg-black text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors shadow-lg">
              <span className="material-symbols-outlined">qr_code_scanner</span>
              <span>Scan to Purchase</span>
            </button>
          ) : (
            <button
              onClick={() => spotlight && onAddToCart({
                productId: spotlight.productId,
                name:      spotlight.name,
                imageUrl:  spotlight.imageUrl,
                price:     spotlight.price,
                size:      spotlight.sizes[0] ?? "M",
                color:     spotlight.colors[0] ?? "",
                quantity:  1,
              })}
              className="w-full bg-black text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors shadow-lg"
            >
              <span className="material-symbols-outlined">payments</span>
              <span>Add to Cart</span>
            </button>
          )}
        </div>
      )} */}
    </aside>
  );
}
