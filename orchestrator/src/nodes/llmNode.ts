/**
 * nodes/llmNode.ts — ReAct agent LLM node
 *
 * Called once per iteration of the agent loop:
 *   1. Builds full message context (system + session history + user query + agent loop so far)
 *   2. Calls Nova Premier with toolChoice:any (MUST call a tool — prevents Case 3)
 *   3. If Claude called search_products → routes to toolNode
 *   4. If Claude called structured_response → enriches products, routes to persistNode
 *   5. If no tool call (should never happen with toolChoice:any) → sets error state
 */

import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { CLAUDE_MODEL } from "../clients/bedrock";
import { OrchestratorState, ProductCard, RetrievedProduct } from "../state";
import { SYSTEM_PROMPT, ALL_TOOLS, buildStoreContext } from "../prompts/salesPersona";
import { ChatMessage } from "../state";

const MAX_ITERATIONS = 4;

// ── System prompt builder ───────────────────────────────────────────────────

function buildSystemPrompt(state: OrchestratorState): string {
  const modeBlock = state.currentMode === "store" && state.currentStoreName
    ? buildStoreContext(state.currentStoreName, state.currentStoreId ?? "")
    : "\n\n## Current Mode: APP\nThe customer is browsing on their phone or laptop.";
  return SYSTEM_PROMPT + modeBlock;
}

// ── History → LLM message conversion ───────────────────────────────────────
// Converts the last 8 turns of session history to LangChain messages.
// For assistant turns with products, injects full product details so the LLM
// can use them for taste inference and follow-up selection — NOT for RAG queries.

function formatProductsBlock(products: ProductCard[]): string {
  const lines = products.map((p) =>
    `  - ${p.productId} | ${p.name} | ${p.category} — ${p.subCategory} | ₹${p.price}` +
    (p.colors?.length  ? ` | Colors: ${p.colors.join(", ")}`  : "") +
    (p.sizes?.length   ? ` | Sizes: ${p.sizes.join(", ")}`    : "") +
    (p.tags?.length    ? ` | Tags: ${p.tags.join(", ")}`      : "")
  );
  return `\n[Products shown in this response:\n${lines.join("\n")}]`;
}

function historyToMessages(history: ChatMessage[]): (HumanMessage | AIMessage)[] {
  return history.slice(-8).map((m) => {
    if (m.role === "event") {
      return new HumanMessage(`[Context: ${m.content}]`);
    }
    if (m.role === "assistant") {
      const productsBlock = m.products?.length
        ? formatProductsBlock(m.products)
        : "";
      return new AIMessage(m.content + productsBlock);
    }
    return new HumanMessage(m.content);
  });
}

// ── Product enrichment ──────────────────────────────────────────────────────

function enrichProducts(
  stubs: { productId: string; reason: string }[],
  retrieved: RetrievedProduct[]
): ProductCard[] {
  const byId = new Map(retrieved.map((p) => [p.productId, p]));
  const cards: ProductCard[] = [];

  for (const stub of stubs) {
    const r = byId.get(stub.productId);
    if (!r) {
      console.warn(`[llmNode] enrichProducts: unknown productId ${stub.productId} — not in retrievedProducts. (Did the LLM call structured_response without search_products?)`);
      continue;
    }
    const m = r.metadata;
    cards.push({
      productId:   r.productId,
      name:        String(m.name        ?? r.name),
      category:    String(m.category    ?? ""),
      subCategory: String(m.subCategory ?? ""),
      price:       Number(m.price       ?? 0),
      imageUrl:    String(m.imageUrl    ?? ""),
      colors:      Array.isArray(m.colors) ? m.colors as string[] : [],
      sizes:       Array.isArray(m.sizes)  ? m.sizes  as string[] : [],
      tags:        Array.isArray(m.tags)   ? m.tags   as string[] : [],
      reason:      stub.reason,
    });
  }

  if (stubs.length > 0 && cards.length === 0) {
    console.error(`[llmNode] enrichProducts: ALL ${stubs.length} stub(s) failed to match. IDs requested: [${stubs.map(s => s.productId).join(", ")}]. RetrievedProducts pool size: ${retrieved.length}.`);
  }

  return cards;
}

// ── Main node ───────────────────────────────────────────────────────────────

export async function llmNode(
  state: OrchestratorState
): Promise<Partial<OrchestratorState>> {
  if (state.error) return {};

  if (state.iterationCount >= MAX_ITERATIONS) {
    console.warn(`[llmNode] Max iterations (${MAX_ITERATIONS}) reached — forcing termination`);
    return {
      responseText:      "I've had a bit of trouble finding the right products. Could you rephrase your request?",
      responseProducts:  [],
      followUpQuestions: ["What style are you looking for?", "Can you describe the occasion?"],
    };
  }

  try {
    const llm = new ChatBedrockConverse({
      model:       CLAUDE_MODEL,
      region:      process.env.BEDROCK_REGION ?? "us-east-1",
      temperature: 0.4,
    });

    // Nova Premier doesn't support toolChoice API param — rely on system prompt mandates.
    const llmWithTools = llm.bindTools(ALL_TOOLS);

    const historyMessages = historyToMessages(state.sessionHistory);

    const messages = [
      new SystemMessage(buildSystemPrompt(state)),
      ...historyMessages,
      new HumanMessage(state.userMessage),
      ...state.agentMessages,
    ];

    const response = await llmWithTools.invoke(messages);
    const toolCalls = response.tool_calls ?? [];

    console.log(
      `[llmNode] iter=${state.iterationCount + 1} mode=${state.currentMode} toolCalls=[${toolCalls.map(tc => tc.name).join(", ") || "none"}]`
    );

    const searchCall     = toolCalls.find(tc => tc.name === "search_products");
    const structuredCall = toolCalls.find(tc => tc.name === "structured_response");

    // ── Case 1: search_products requested — route to toolNode ──────────────
    if (searchCall && !structuredCall) {
      return {
        agentMessages:  [response],
        iterationCount: 1,
      };
    }

    // ── Case 2: structured_response — enrich and finish ────────────────────
    if (structuredCall) {
      const args = structuredCall.args as {
        responseText:      string;
        responseProducts:  { productId: string; reason: string }[];
        followUpQuestions: string[];
      };

      const cards = enrichProducts(args.responseProducts ?? [], state.retrievedProducts);

      return {
        agentMessages:     [response],
        responseText:      args.responseText,
        responseProducts:  cards,
        followUpQuestions: args.followUpQuestions ?? [],
      };
    }

    // ── Case 3: No tool call — should NEVER happen with toolChoice:any ─────
    // Don't silently produce a hollow response — surface as error to prevent
    // this turn from entering history and poisoning future conversation context.
    console.error(`[llmNode] CRITICAL: Model produced no tool_use block despite toolChoice:any. iter=${state.iterationCount + 1}`);
    return {
      error: "Model produced no tool_use block. This turn will not be saved to session history.",
    };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `llmNode: ${msg}` };
  }
}
