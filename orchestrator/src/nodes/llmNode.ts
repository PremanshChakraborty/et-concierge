/**
 * nodes/llmNode.ts — ET Concierge ReAct agent LLM node
 *
 * Key changes from Retail AI:
 *   - Mode-aware context injection: articles+summaries in Prime News, services in Advisory
 *   - Context block injected BEFORE user message (not inline on assistant turns)
 *   - Enrichment for both services and articles
 *   - Three tools: search_et_catalog, search_prime_news, structured_response
 */

import { ChatGoogle } from "@langchain/google";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { LLM_MODEL } from "../clients/bedrock";
import {
  OrchestratorState,
  ETServiceCard,
  ETArticleCard,
  RetrievedItem,
  ChatMessage,
  ConciergeMode,
  applyProfileUpdate,
} from "../state";
import { SYSTEM_PROMPT, ALL_TOOLS, SEARCH_CATALOG_TOOL, STRUCTURED_RESPONSE_TOOL, UPDATE_USER_PROFILE_TOOL } from "../prompts/etConcierge";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, PROFILES_TABLE } from "../clients/dynamodb";

const MAX_ITERATIONS = 4;

// ── History → LLM messages ──────────────────────────────────────────────────
// Converts session history to LangChain messages.
// Text only — no inline product/service/article blocks.
// Structured data is injected separately via buildContextBlock().

function historyToMessages(history: ChatMessage[]): (HumanMessage | AIMessage)[] {
  return history.slice(-10).map((m) => {
    if (m.role === "event") {
      return new HumanMessage(`[Context: ${m.content}]`);
    }
    if (m.role === "assistant") {
      return new AIMessage(m.content);
    }
    return new HumanMessage(m.content);
  });
}

// ── Mode-aware context block ────────────────────────────────────────────────
// Injected BEFORE the current user message so the LLM has fresh structured data.

function buildContextBlock(
  mode: ConciergeMode,
  services: ETServiceCard[],
  articles: ETArticleCard[]
): string | null {
  if (mode === "prime-news" && articles.length > 0) {
    const lines = articles.map((a) =>
      `  - ${a.articleId} | "${a.title}" | ${a.category}\n    Summary: ${a.summary}`
    );
    return `[Currently surfaced articles:\n${lines.join("\n")}]`;
  }

  if (mode === "advisory" && services.length > 0) {
    const lines = services.map((s) =>
      `  - ${s.productId} | "${s.name}" | ${s.category} | ₹${s.price} (${s.priceModel}) | Page: ${s.pageUrl}` +
      (s.reason ? `\n    Reason: ${s.reason}` : "")
    );
    return `[Currently recommended services:\n${lines.join("\n")}]`;
  }

  return null;
}

// ── Service enrichment ──────────────────────────────────────────────────────

function enrichServices(
  stubs: { productId: string; reason: string }[],
  retrieved: RetrievedItem[]
): ETServiceCard[] {
  const byId = new Map(retrieved.map((r) => [r.id, r]));
  const cards: ETServiceCard[] = [];

  for (const stub of stubs) {
    const r = byId.get(stub.productId);
    if (!r) {
      console.warn(`[llmNode] enrichServices: unknown ${stub.productId}`);
      continue;
    }
    const m = r.metadata;
    cards.push({
      productId:      r.id,
      name:           String(m.name ?? r.name),
      category:       String(m.category ?? ""),
      subCategory:    String(m.subCategory ?? ""),
      price:          Number(m.price ?? 0),
      priceModel:     String(m.priceModel ?? ""),
      pageUrl:        String(m.pageUrl ?? ""),
      imageUrl:       String(m.imageUrl ?? ""),
      tags:           (m.tags as string[]) ?? [],
      targetAudience: (m.targetAudience as string[]) ?? [],
      relevantGoals:  (m.relevantGoals as string[]) ?? [],
      partnerBrand:   String(m.partnerBrand ?? ""),
      reason:         stub.reason,
    });
  }

  if (stubs.length > 0 && cards.length === 0) {
    console.error(`[llmNode] enrichServices: ALL ${stubs.length} stubs failed. IDs: [${stubs.map(s => s.productId).join(", ")}]`);
  }

  return cards;
}

// ── Article enrichment ──────────────────────────────────────────────────────

function enrichArticles(
  stubs: { articleId: string; reason?: string }[],
  retrieved: RetrievedItem[]
): ETArticleCard[] {
  const byId = new Map(retrieved.map((r) => [r.id, r]));
  const cards: ETArticleCard[] = [];

  for (const stub of stubs) {
    const r = byId.get(stub.articleId);
    if (!r) {
      console.warn(`[llmNode] enrichArticles: unknown ${stub.articleId}`);
      continue;
    }
    const m = r.metadata;
    cards.push({
      articleId:    r.id,
      title:        String(m.title ?? r.name),
      summary:      String(m.summary ?? ""),
      reason:       stub.reason ?? "",
      sourceUrl:    String(m.sourceUrl ?? ""),
      category:     String(m.category ?? ""),
      published_at: Number(m.published_at ?? 0),
      imageUrl:     String(m.imageUrl ?? ""),
      tags:         (m.tags as string[]) ?? [],
    });
  }

  return cards;
}

// ── Main node ───────────────────────────────────────────────────────────────

export async function llmNode(
  state: OrchestratorState
): Promise<Partial<OrchestratorState>> {
  if (state.error) return {};

  if (state.iterationCount >= MAX_ITERATIONS) {
    console.warn(`[llmNode] Max iterations (${MAX_ITERATIONS}) reached`);
    return {
      responseText:      "I had trouble finding the right results. Could you rephrase your request?",
      responseServices:  [],
      responseArticles:  [],
      followUpQuestions: ["What topic interests you?", "Would you like to explore ET services or news?"],
    };
  }

  try {
    const llm = new ChatGoogle({
      model:       LLM_MODEL,
      apiKey:      process.env.GOOGLE_API_KEY,
      temperature: 0.4,
    });

    // Mode-based tool binding: advisory only gets catalog+structured+profile, prime-news gets all
    const modeTools = state.currentMode === "advisory"
      ? [SEARCH_CATALOG_TOOL, STRUCTURED_RESPONSE_TOOL, UPDATE_USER_PROFILE_TOOL]
      : ALL_TOOLS;
    
    console.log(`[llmNode] Bound tools: [${modeTools.map(t => t.name).join(", ")}]`);
      
    const llmWithTools = llm.bindTools(modeTools, { tool_choice: "any" });
    const historyMessages = historyToMessages(state.sessionHistory);

    // Build mode-aware context block
    const contextBlock = buildContextBlock(
      state.currentMode,
      state.currentServices,
      state.currentArticles
    );

    // ── TRACE: Log context block ────────────────────────────────────────
    console.log(`[llmNode] contextBlock: ${contextBlock ? `"${contextBlock}"` : "null (no previous services/articles)"}`);

    // Short mode reminder — detailed instructions are in the system prompt
    const modeBlock = state.currentMode === "prime-news"
      ? "\n\n## Current Mode: PRIME NEWS\nPrimary goal: article discovery + cross-sell. You have both tools."
      : "\n\n## Current Mode: ADVISORY\nPrimary goal: user profiling + service recommendations. search_et_catalog only.";

    const promptWithProfile = SYSTEM_PROMPT.replace(
      "{{PROFILE_COMPLETENESS}}", 
      (state.userProfile?.profileCompleteness ?? 0).toString()
    );

    const profileBlock = state.userProfile 
      ? `\n\n## CURRENT USER PROFILE\n\`\`\`json\n${JSON.stringify(state.userProfile, null, 2)}\n\`\`\``
      : "\n\n## CURRENT USER PROFILE\nNo profile exists yet.";

    const messages = [
      new SystemMessage(promptWithProfile + modeBlock + profileBlock),
      ...historyMessages,
      ...(contextBlock ? [new HumanMessage(contextBlock)] : []),
      new HumanMessage(state.userMessage),
      ...state.agentMessages,
    ];

    // ── TRACE: Log what we're sending to the model ────────────────────────
    console.log(`\n[llmNode] ═══ ITER ${state.iterationCount + 1} ═══`);
    console.log(`[llmNode] mode=${state.currentMode} agentMessages=${state.agentMessages.length}`);
    console.log(`[llmNode] Total messages: ${messages.length}`);
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i] as any;
      const type = m._getType?.() ?? m.constructor?.name ?? "unknown";
      const contentLen = typeof m.content === "string" ? m.content.length : JSON.stringify(m.content).length;
      const toolCalls = m.tool_calls?.length ?? 0;
      const toolCallId = m.tool_call_id ?? "";
      console.log(`[llmNode]   [${i}] ${type} len=${contentLen}${toolCalls ? ` tool_calls=${toolCalls}` : ""}${toolCallId ? ` tool_call_id=${toolCallId}` : ""}`);
      // Show first 200 chars for human and tool messages
      if ((type === "tool" || type === "human") && typeof m.content === "string") {
        console.log(`[llmNode]       content: "${m.content.slice(0, 200)}..."`);
      }
    }

    const response = await llmWithTools.invoke(messages);
    const toolCalls = response.tool_calls ?? [];

    // ── TRACE: Log raw model response ─────────────────────────────────────
    const stopReason = (response as any).response_metadata?.stopReason ?? (response as any).additional_kwargs?.stop_reason ?? "unknown";
    const usage = (response as any).response_metadata?.usage ?? (response as any).usage_metadata ?? {};
    console.log(`[llmNode] Response tool_calls: [${toolCalls.map(tc => tc.name).join(", ") || "none"}] stop_reason=${stopReason}`);
    console.log(`[llmNode] Usage: ${JSON.stringify(usage)}`);
    if (typeof response.content === "string") {
      console.log(`[llmNode] FULL Response content (text):\n${response.content}\n--- END ---`);
    } else if (Array.isArray(response.content)) {
      for (const block of response.content) {
        const b = block as any;
        if (b.type === "text") console.log(`[llmNode] Response block (text FULL):\n${b.text}\n--- END TEXT ---`);
        if (b.type === "tool_use") console.log(`[llmNode] Response block: tool_use name=${b.name} input=${JSON.stringify(b.input)}`);
      }
    }

    const searchCatalogCall = toolCalls.find(tc => tc.name === "search_et_catalog");
    const searchNewsCall    = toolCalls.find(tc => tc.name === "search_prime_news");
    const structuredCall    = toolCalls.find(tc => tc.name === "structured_response");
    const updateProfileCall = toolCalls.find(tc => tc.name === "update_user_profile");

    // ── Case 1: Search tool requested — route to toolNode ──────────────────
    if ((searchCatalogCall || searchNewsCall || updateProfileCall) && !structuredCall) {
      return {
        agentMessages:  [response],
        iterationCount: 1,
      };
    }

    // ── Case 2: structured_response — enrich and finish ────────────────────
    if (structuredCall) {
      const args = structuredCall.args as {
        responseText:      string;
        responseServices:  { productId: string; reason: string }[];
        responseArticles:  { articleId: string; reason: string }[];
        followUpQuestions: string[];
      };

      // Use both newly retrieved items AND previously recommended items for enrichment
      const allServices = [...state.retrievedServices, ...state.currentServices.map(s => ({ id: s.productId, name: s.name, metadata: s as Record<string, any>, score: 1.0 }))];
      const allArticles = [...state.retrievedArticles, ...state.currentArticles.map(a => ({ id: a.articleId, name: a.title, metadata: a as Record<string, any>, score: 1.0 }))];

      const serviceCards = enrichServices(args.responseServices ?? [], allServices);
      const articleCards = enrichArticles(args.responseArticles ?? [], allArticles);

      let nextProfile = state.userProfile;
      if (updateProfileCall) {
        console.log(`[llmNode] Intercepting update_user_profile natively alongside structured_response`);
        nextProfile = applyProfileUpdate(state.userProfile, updateProfileCall.args);
        
        // Asynchronous fire-and-forget to permanent PROFILES_TABLE
        if (state.userId) {
          dynamoDb.send(new PutCommand({
            TableName: PROFILES_TABLE,
            Item: { ...nextProfile, userId: state.userId, lastUpdated: new Date().toISOString() }
          })).catch(err => console.error(`[llmNode] PROFILES_TABLE update failed: ${err}`));
        }
      }

      return {
        agentMessages:     [response],
        responseText:      args.responseText,
        responseServices:  serviceCards,
        responseArticles:  articleCards,
        currentServices:   serviceCards,  // Persist for next turn's contextBlock
        currentArticles:   articleCards,  // Persist for next turn's contextBlock
        userProfile:       nextProfile,
        followUpQuestions: args.followUpQuestions ?? [],
      };
    }

    // ── Case 3: No tool call ───────────────────────────────────────────────
    console.error(`[llmNode] CRITICAL: No tool_use block. iter=${state.iterationCount + 1}`);
    return {
      error: "Model produced no tool_use block. This turn will not be saved.",
    };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `llmNode: ${msg}` };
  }
}
