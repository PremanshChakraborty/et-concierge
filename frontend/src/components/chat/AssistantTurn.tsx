import type { ProductCard as ProductCardType } from "../../types";
import ChatBubble from "./ChatBubble";
import ProductCarousel from "../product/ProductCarousel";
import SuggestionChips from "./SuggestionChips";

interface Props {
  text: string;
  products: ProductCardType[];
  followUpQuestions: string[];
  onSelectChip: (q: string) => void;
}

export default function AssistantTurn({ text, products, followUpQuestions, onSelectChip }: Props) {
  return (
    <div className="flex justify-start">
      <div className="flex flex-col gap-3 max-w-[85%]">
        <ChatBubble text={text} />
        {products.length > 0 && <ProductCarousel products={products} />}
        {followUpQuestions.length > 0 && (
          <SuggestionChips questions={followUpQuestions} onSelect={onSelectChip} />
        )}
      </div>
    </div>
  );
}
