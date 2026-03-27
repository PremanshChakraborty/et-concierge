/**
 * types/index.ts — All shared TypeScript types.
 * Mirrors orchestrator/src/state.ts on the server side.
 */

// ── Orchestrator API ──────────────────────────────────────────────────────────

export interface ProductCard {
  productId:   string;
  name:        string;
  category:    string;
  subCategory: string;
  price:       number;
  imageUrl:    string;
  colors:      string[];
  sizes:       string[];
  tags:        string[];
  reason:      string;
  /** Populated only in store mode; from StoreInventory */
  aisleName?:  string;
  rack?:       string;
}

export interface ChatApiResponse {
  sessionId:         string;
  text:              string;
  products:          ProductCard[];
  followUpQuestions: string[];
  currentMode:       "app" | "store";
  error:             string | null;
}

// ── Frontend State ────────────────────────────────────────────────────────────

export interface ChatTurn {
  id:                 string;
  role:               "user" | "assistant" | "mode_switch";
  message?:           string;       // user turns
  text?:              string;       // assistant turns
  products?:          ProductCard[];
  followUpQuestions?: string[];
  ts:                 string;
  // mode_switch turns only
  toMode?:            "app" | "store";
  storeName?:         string;
}

export interface ChatState {
  sessionId:    string | null;
  turns:        ChatTurn[];
  loading:      boolean;
  error:        string | null;
  currentMode:  "app" | "store";
  storeDetails: StoreDetails | null;
}

// ── Support APIs ──────────────────────────────────────────────────────────────

export interface Session {
  sessionId:         string;
  lastUpdated:       string;
  currentMode:       "app" | "store";
  currentStoreId?:   string | null;
  currentStoreName?: string | null;
}

export interface AisleEntry {
  label:       string;  // "Aisle 1"
  description: string;  // "Women's Dresses and Tops"
  directions:  string;  // "Enter main doors, turn left"
}

export interface StoreDetails {
  storeId:   string;
  storeName: string;
  address:   string;
  hours:     string;   // e.g. "Open today 10:00 – 22:00"
  phone?:    string;
  aisleMap:  AisleEntry[];
}

// ── User Profile ──────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  name:      string;
  imageUrl:  string;
  price:     number;
  size:      string;
  color:     string;
  quantity:  number;
}

export interface WishlistItem {
  productId: string;
  name:      string;
  imageUrl:  string;
  price:     number;
}
