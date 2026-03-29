/**
 * nodes/toolNode.ts — ET Concierge
 *
 * Executes tool calls made by the LLM in the ReAct loop.
 * Handles:
 *   - search_et_catalog  → searchServices() on et-services index
 *   - search_prime_news  → searchArticles() on et-news index
 *
 * Appends ToolMessage back into agentMessages so the LLM can continue.
 * RAG results are stored in retrievedServices/retrievedArticles for enrichment in llmNode.
 * currentServices/currentArticles are only updated in persistNode from the LLM's structured_response.
 */

import { ToolMessage } from "@langchain/core/messages";
import { searchServices, searchArticles } from "./ragNode";
import { OrchestratorState, RetrievedItem, applyProfileUpdate } from "../state";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, PROFILES_TABLE } from "../clients/dynamodb";

export async function toolNode(
  state: OrchestratorState
): Promise<Partial<OrchestratorState>> {
  const lastMessage = state.agentMessages[state.agentMessages.length - 1];

  if (!lastMessage || !("tool_calls" in lastMessage)) {
    return { error: "toolNode called but last message has no tool_calls" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolCalls: any[] = (lastMessage as any).tool_calls ?? [];
  const newMessages: ToolMessage[] = [];
  const newServices: RetrievedItem[] = [];
  const newArticles: RetrievedItem[] = [];
  let nextProfile = state.userProfile;

  for (const call of toolCalls) {
    // ── search_et_catalog ─────────────────────────────────────────────
    if (call.name === "search_et_catalog") {
      try {
        const { query, topK } = call.args as { query: string; topK: number };
        console.log(`[toolNode] search_et_catalog query="${query}" topK=${topK}`);

        const results = await searchServices(query, topK);
        newServices.push(...results);

        const content = results
          .map((r, i) => {
            const m = r.metadata;
            return [
              `${i + 1}. productId: ${r.id}  (score: ${r.score.toFixed(3)})`,
              `   Name: ${m.name}`,
              `   Category: ${m.category} › ${m.subCategory}`,
              `   Price: ₹${m.price} (${m.priceModel})`,
              `   Page: ${m.pageUrl}`,
              `   Tags: ${Array.isArray(m.tags) ? (m.tags as string[]).join(", ") : m.tags}`,
              `   Target: ${Array.isArray(m.targetAudience) ? (m.targetAudience as string[]).join(", ") : m.targetAudience}`,
            ].join("\n");
          })
          .join("\n\n");

        newMessages.push(
          new ToolMessage({
            content: `Found ${results.length} ET services:\n\n${content}`,
            tool_call_id: call.id,
            name: call.name,
          })
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[toolNode] search_et_catalog failed:`, msg);
        newMessages.push(
          new ToolMessage({
            content: `Service search failed: ${msg}. Try rephrasing the query.`,
            tool_call_id: call.id,
            name: call.name,
          })
        );
      }
    }

    // ── search_prime_news ─────────────────────────────────────────────
    else if (call.name === "search_prime_news") {
      try {
        const { query, topK } = call.args as { query: string; topK: number };
        console.log(`[toolNode] search_prime_news query="${query}" topK=${topK}`);

        const results = await searchArticles(query, topK);
        newArticles.push(...results);

        const content = results
          .map((r, i) => {
            const m = r.metadata;
            return [
              `${i + 1}. articleId: ${r.id}  (score: ${r.score.toFixed(3)})`,
              `   Title: ${m.title}`,
              `   Category: ${m.category}`,
              `   Summary: ${m.summary}`,
              `   URL: ${m.sourceUrl}`,
              `   Tags: ${Array.isArray(m.tags) ? (m.tags as string[]).join(", ") : m.tags}`,
            ].join("\n");
          })
          .join("\n\n");

        newMessages.push(
          new ToolMessage({
            content: `Found ${results.length} ET Prime articles:\n\n${content}`,
            tool_call_id: call.id,
            name: call.name,
          })
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[toolNode] search_prime_news failed:`, msg);
        newMessages.push(
          new ToolMessage({
            content: `News search failed: ${msg}. Try rephrasing the query.`,
            tool_call_id: call.id,
            name: call.name,
          })
        );
      }
    }

    // ── update_user_profile ───────────────────────────────────────────
    else if (call.name === "update_user_profile") {
      console.log(`[toolNode] update_user_profile called alongside search`);
      try {
        nextProfile = applyProfileUpdate(nextProfile, call.args);
        
        // We MUST await this, otherwise Lambda might freeze the container before the network request finishes
        console.log(`[toolNode] Attempting PROFILES_TABLE update... userId=${state.userId}`);
        if (state.userId) {
          const item = { ...nextProfile, userId: state.userId, lastUpdated: new Date().toISOString() };
          console.log(`[toolNode] PutCommand Item:`, JSON.stringify(item));
          
          await dynamoDb.send(new PutCommand({
            TableName: PROFILES_TABLE,
            Item: item
          })).catch(err => {
            console.error(`[toolNode] PROFILES_TABLE update threw an error:`, err);
          });
          
          console.log(`[toolNode] PROFILES_TABLE updated successfully for ${state.userId}`);
        } else {
          console.error(`[toolNode] FATAL: No userId found in state! Cannot update PROFILES_TABLE.`);
        }

        newMessages.push(
          new ToolMessage({
            content: "Profile updated successfully.",
            tool_call_id: call.id,
            name: call.name,
          })
        );
      } catch (err) {
        console.error(`[toolNode] update_user_profile failed:`, err);
        newMessages.push(
          new ToolMessage({
            content: "Failed to update profile.",
            tool_call_id: call.id,
            name: call.name,
          })
        );
      }
    }

    // structured_response is handled in llmNode — skip
  }

  return {
    agentMessages:     newMessages,
    retrievedServices: newServices,
    retrievedArticles: newArticles,
    userProfile:       nextProfile,
    iterationCount:    1,
  };
}
