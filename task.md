# Mock Data Generation Task

## Product Catalog (products.json)
- [/] Batch 1 — PRD-001 to PRD-075: Women's Western Wear (Dresses, Tops, Bottoms, Co-ords)
- [ ] Batch 2 — PRD-076 to PRD-150: Women's Ethnic + Men's Wear
- [ ] Batch 3 — PRD-151 to PRD-220: Accessories + Footwear
- [ ] Merge all batches into final products.json

## Stores Data (stores.json)
- [ ] Generate 6 stores (3 large, 3 small) in one city with aisleMap

## StoreInventory Seeding Script
- [ ] Write generate-inventory.ts script
  - Large store probability: higher stock counts, more products stocked
  - Small store probability: lower stock counts, sparse product coverage
  - Target: 500+ total stock units across all store-product combos

# Phase 4 (Frontend Integration)

## 1. Project Setup
- [ ] Initialize React frontend (Vite + TS).
- [ ] Set up a lightweight mock backend (e.g., Express) to serve `products.json` and simulate the `/chat` endpoint.

## 2. Core Components
- [ ] Implement `<ChatHeader>` and base `<App>` layout.
- [ ] Implement `<ChatInput>` and `<TypingIndicator>`.
- [ ] Implement message bubbles: `<UserBubble>`, `<AssistantTurn>`, `<ChatBubble>`.
- [ ] Implement `<ProductCarousel>` and `<ProductCard>` matching the Stitch design.
- [ ] Implement `<SuggestionChips>`.

## 3. State & Integration
- [ ] Wire up state (`turns`, `loading`, `error`, `sessionId`).
- [ ] Connect `sendMessage` to the lightweight mock backend.
- [ ] Adjust styling to match the deep aesthetics of the Stitch prototype.
