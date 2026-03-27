/**
 * state.ts — OrchestratorState definition using LangGraph Annotation API
 */

import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

// ── Supporting types ───────────────────────────────────────────────────────

export interface ChatMessage {
  role:       "user" | "assistant" | "event";
  type?:      "mode_switch";          // present when role === "event"
  content:    string;
  products?:  ProductCard[];          // present on assistant turns that returned suggestions
  mode?:      "app" | "store";
  storeId?:   string;
  storeName?: string;
  ts:         string;
}

export interface RetrievedProduct {
  productId: string;
  name:      string;
  score:     number;
  metadata:  Record<string, string | number | string[]>;
}

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
  // Set to true by inputNode when request type === "mode_switch"
  isModeSwitch: Annotation<boolean>({
    default: () => false,
    reducer:  (_, next) => next,
  }),
  requestedMode:      Annotation<"app" | "store" | null>({ default: () => null, reducer: (_, next) => next }),
  requestedStoreId:   Annotation<string | null>({ default: () => null, reducer: (_, next) => next }),
  requestedStoreName: Annotation<string | null>({ default: () => null, reducer: (_, next) => next }),

  // ── Loaded from DynamoDB session ──────────────────────────────────────────
  sessionHistory: Annotation<ChatMessage[]>({
    default: () => [],
    reducer:  (_, next) => next,
  }),
  currentMode: Annotation<"app" | "store">({
    default: () => "app",
    reducer:  (_, next) => next,
  }),
  currentStoreId:   Annotation<string | null>({ default: () => null, reducer: (_, next) => next }),
  currentStoreName: Annotation<string | null>({ default: () => null, reducer: (_, next) => next }),

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
  retrievedProducts: Annotation<RetrievedProduct[]>({
    default: () => [],
    reducer:  (current, next) => {
      const seen = new Set(current.map(p => p.productId));
      return current.concat(next.filter(p => !seen.has(p.productId)));
    },
  }),

  // ── Structured LLM output ─────────────────────────────────────────────────
  responseText: Annotation<string>({
    default: () => "",
    reducer:  (_, next) => next,
  }),
  responseProducts: Annotation<ProductCard[]>({
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
