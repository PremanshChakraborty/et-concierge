/**
 * state.ts — OrchestratorState for ET AI Concierge
 */

import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

// ── Supporting types ───────────────────────────────────────────────────────

export type ConciergeMode = "advisory" | "prime-news";
export type RiskAppetite = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE" | "UNKNOWN";

export interface UserProfile {
  occupation?: string;
  ageBracket?: string;
  location?: string;
  riskAppetite: RiskAppetite;
  financialGoals: string[];
  investmentHorizon?: string;
  topicsOfInterest: string[];
  preferredFormats: string[];
  ownedServices: string[];
  profileCompleteness: number;
}

export function applyProfileUpdate(current: UserProfile | null, args: any): UserProfile {
  const p: UserProfile = current ? { ...current } : {
    riskAppetite: "UNKNOWN",
    financialGoals: [],
    topicsOfInterest: [],
    preferredFormats: [],
    ownedServices: [],
    profileCompleteness: 0,
  };

  if (args.occupation) p.occupation = args.occupation;
  if (args.ageBracket) p.ageBracket = args.ageBracket;
  if (args.location) p.location = args.location;
  if (args.riskAppetite) p.riskAppetite = args.riskAppetite as RiskAppetite;

  const addUnique = (arr: string[], newItems?: string[]) => {
    if (!newItems) return arr;
    const set = new Set(arr);
    newItems.forEach(i => set.add(i));
    return Array.from(set);
  };

  p.financialGoals = addUnique(p.financialGoals, args.addedFinancialGoals);
  p.topicsOfInterest = addUnique(p.topicsOfInterest, args.addedTopicsOfInterest);
  p.preferredFormats = addUnique(p.preferredFormats, args.addedPreferredFormats);
  p.ownedServices = addUnique(p.ownedServices, args.addedOwnedServices);

  // Recalculate completeness
  let score = 0;
  if (p.occupation) score += 15;
  if (p.ageBracket) score += 15;
  if (p.location) score += 10;
  if (p.riskAppetite && p.riskAppetite !== "UNKNOWN") score += 20;
  if (p.financialGoals.length > 0) score += 20;
  if (p.topicsOfInterest.length > 0) score += 20;
  p.profileCompleteness = Math.min(100, score);

  return p;
}

export interface ChatMessage {
  role:    "user" | "assistant" | "event";
  type?:   "mode_switch";
  content: string;
  /** Services/articles attached for frontend display only — NOT sent to LLM context */
  services?: ETServiceCard[];
  articles?: ETArticleCard[];
  mode?:   ConciergeMode;
  ts:      string;
}

export interface RetrievedItem {
  id:       string;
  name:     string;
  score:    number;
  metadata: Record<string, string | number | boolean | string[]>;
}

export interface ETServiceCard {
  productId:   string;
  name:        string;
  category:    string;
  subCategory: string;
  price:       number;
  priceModel:  string;
  pageUrl:     string;
  imageUrl:    string;
  tags:        string[];
  targetAudience: string[];
  relevantGoals:  string[];
  partnerBrand:   string;
  reason:      string;          // LLM-generated explanation
}

export interface ETArticleCard {
  articleId:   string;
  title:       string;
  summary:     string;
  reason?:     string;          // LLM-generated explanation
  sourceUrl:   string;
  category:    string;
  published_at: number;
  imageUrl:    string;
  tags:        string[];
}

// ── LangGraph state annotation ─────────────────────────────────────────────

export const StateAnnotation = Annotation.Root({
  // ── Auth ──────────────────────────────────────────────────────────────────
  userId: Annotation<string>({
    default: () => "",
    reducer:  (_, next) => next,
  }),

  // ── Input ─────────────────────────────────────────────────────────────────
  sessionId: Annotation<string>({
    default: () => "",
    reducer:  (_, next) => next,
  }),
  userMessage: Annotation<string>({
    default: () => "",
    reducer:  (_, next) => next,
  }),

  // ── Mode switch ───────────────────────────────────────────────────────────
  isModeSwitch: Annotation<boolean>({
    default: () => false,
    reducer:  (_, next) => next,
  }),
  requestedMode: Annotation<ConciergeMode | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),

  // ── Loaded from DynamoDB session ──────────────────────────────────────────
  sessionHistory: Annotation<ChatMessage[]>({
    default: () => [],
    reducer:  (_, next) => next,
  }),
  sessionName: Annotation<string | null>({
    default: () => null,
    reducer:  (_, next) => next,
  }),
  currentMode: Annotation<ConciergeMode>({
    default: () => "advisory",
    reducer:  (_, next) => next,
  }),
  /** Session-level: latest recommended services (full JSON, overwritten per search) */
  currentServices: Annotation<ETServiceCard[]>({
    default: () => [],
    reducer:  (_, next) => next,
  }),
  /** Session-level: latest surfaced articles (full JSON with summaries) */
  currentArticles: Annotation<ETArticleCard[]>({
    default: () => [],
    reducer:  (_, next) => next,
  }),
  userProfile: Annotation<UserProfile | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),

  // ── Agent loop ────────────────────────────────────────────────────────────
  agentMessages: Annotation<BaseMessage[]>({
    default: () => [],
    reducer:  (current, next) => current.concat(next),
  }),
  iterationCount: Annotation<number>({
    default: () => 0,
    reducer:  (current, next) => current + next,
  }),

  // ── RAG results ───────────────────────────────────────────────────────────
  retrievedServices: Annotation<RetrievedItem[]>({
    default: () => [],
    reducer:  (current, next) => {
      const seen = new Set(current.map(p => p.id));
      return current.concat(next.filter(p => !seen.has(p.id)));
    },
  }),
  retrievedArticles: Annotation<RetrievedItem[]>({
    default: () => [],
    reducer:  (current, next) => {
      const seen = new Set(current.map(a => a.id));
      return current.concat(next.filter(a => !seen.has(a.id)));
    },
  }),

  // ── Structured LLM output ─────────────────────────────────────────────────
  responseText: Annotation<string>({
    default: () => "",
    reducer:  (_, next) => next,
  }),
  responseServices: Annotation<ETServiceCard[]>({
    default: () => [],
    reducer:  (_, next) => next,
  }),
  responseArticles: Annotation<ETArticleCard[]>({
    default: () => [],
    reducer:  (_, next) => next,
  }),
  followUpQuestions: Annotation<string[]>({
    default: () => [],
    reducer:  (_, next) => next,
  }),

  // ── Error ─────────────────────────────────────────────────────────────────
  error: Annotation<string | null>({
    default: () => null,
    reducer:  (_, next) => next,
  }),
});

export type OrchestratorState = typeof StateAnnotation.State;
