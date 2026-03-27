/**
 * nodes/toolNode.ts
 * Executes tool calls made by the LLM in the ReAct loop.
 * Currently handles: search_products (Pinecone RAG).
 * Appends a ToolMessage back into agentMessages so the LLM can continue.
 */

import { ToolMessage } from "@langchain/core/messages";
import { executeSearch } from "./ragNode";
import { OrchestratorState, RetrievedProduct } from "../state";

export async function toolNode(
  state: OrchestratorState
): Promise<Partial<OrchestratorState>> {
  // The last agentMessage is the AIMessage containing the tool call(s)
  const lastMessage = state.agentMessages[state.agentMessages.length - 1];

  if (!lastMessage || !("tool_calls" in lastMessage)) {
    return { error: "toolNode called but last message has no tool_calls" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolCalls: any[] = (lastMessage as any).tool_calls ?? [];
  const newMessages: ToolMessage[] = [];
  const newProducts: RetrievedProduct[] = [];

  for (const call of toolCalls) {
    if (call.name !== "search_products") {
      // structured_response is handled in llmNode — skip here
      continue;
    }

    try {
      const { query, topK } = call.args as { query: string; topK: number };
      console.log(`[toolNode] search_products query="${query}" topK=${topK}`);

      const results = await executeSearch(query, topK);
      newProducts.push(...results);

      // Format results as a readable product list for Claude's context
      const content = results
        .map((p, i) => {
          const m = p.metadata;
          return [
            `${i + 1}. productId: ${p.productId}  (score: ${p.score.toFixed(3)})`,
            `   Name: ${m.name}`,
            `   Category: ${m.category} › ${m.subCategory}`,
            `   Price: ₹${m.price}`,
            `   Colors: ${Array.isArray(m.colors) ? (m.colors as string[]).join(", ") : m.colors}`,
            `   Sizes: ${Array.isArray(m.sizes) ? (m.sizes as string[]).join(", ") : m.sizes}`,
            `   Tags: ${Array.isArray(m.tags) ? (m.tags as string[]).join(", ") : m.tags}`,
            `   Description: ${m.description ?? ""}`,
          ].join("\n");
        })
        .join("\n\n");

      newMessages.push(
        new ToolMessage({
          content: `Found ${results.length} products:\n\n${content}`,
          tool_call_id: call.id,
          name: call.name,
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[toolNode] search_products failed:`, msg);
      newMessages.push(
        new ToolMessage({
          content: `Search failed: ${msg}. Please try rephrasing the query or proceed without search results.`,
          tool_call_id: call.id,
          name: call.name,
        })
      );
    }
  }

  return {
    agentMessages:     newMessages,
    retrievedProducts: newProducts,
    iterationCount:    1,
  };
}
