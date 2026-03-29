/**
 * types/index.ts — All shared TypeScript types.
 * Mirrors orchestrator/src/state.ts on the server side.
 */

// ── Orchestrator API ──────────────────────────────────────────────────────────

export type ConciergeMode = "advisory" | "prime-news";
export type RiskAppetite = "high" | "medium" | "low";

export interface ETServiceCard {
  productId:    string;
  name:         string;
  category:     string;
  subCategory:  string;
  price:        number;
  priceModel:   string;
  imageUrl:     string;
  pageUrl:      string;
  tags:         string[];
  reason:       string;
}

export interface ETArticleCard {
  articleId:    string;
  title:        string;
  summary:      string;
  reason?:      string;
  category:     string;
  sourceUrl:    string;
  imageUrl:     string;
  tags:         string[];
  published_at?: number;
}

export interface ChatApiResponse {
  sessionId:         string;
  sessionName?:      string | null;
  text:              string;
  services:          ETServiceCard[];
  articles:          ETArticleCard[];
  followUpQuestions: string[];
  currentMode:       ConciergeMode;
  error:             string | null;
}

export interface UserProfile {
  userId: string;
  occupation: string | null;
  ageBracket: string | null;
  location: string | null;
  riskAppetite: RiskAppetite | null;
  financialGoals: string[];
  topicsOfInterest: string[];
  lastUpdated: string;
  profileCompleteness: number;
}

// ── Frontend State ────────────────────────────────────────────────────────────

export interface ChatTurn {
  id:                 string;
  role:               "user" | "assistant" | "mode_switch";
  message?:           string;           // user turns
  text?:              string;           // assistant turns
  services?:          ETServiceCard[];
  articles?:          ETArticleCard[];
  followUpQuestions?: string[];
  ts:                 string;
  // mode_switch turns only
  toMode?:            ConciergeMode;
}

export interface ChatState {
  sessionId:    string | null;
  sessionName?: string | null;
  turns:        ChatTurn[];
  loading:      boolean;
  error:        string | null;
  currentMode:  ConciergeMode;
}

// ── Support APIs ──────────────────────────────────────────────────────────────

export interface Session {
  sessionId:    string;
  sessionName?: string | null;
  lastUpdated:  string;
  currentMode:  ConciergeMode;
}
