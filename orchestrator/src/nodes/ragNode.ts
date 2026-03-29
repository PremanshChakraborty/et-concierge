/**
 * nodes/ragNode.ts — Dual-index Pinecone semantic search for ET Concierge
 *
 * Exports two search functions (no longer a graph node):
 *   searchServices() → et-services index (1024d)
 *   searchArticles() → et-news index (256d)
 */

import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient, TITAN_EMBED_MODEL, EMBED_DIM, NEWS_EMBED_DIM } from "../clients/bedrock";
import { servicesIndex, newsIndex } from "../clients/pinecone";
import { RetrievedItem } from "../state";

// ── Embedding helper ───────────────────────────────────────────────────────

async function embedQuery(text: string, dimensions: number): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: TITAN_EMBED_MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      inputText: text,
      dimensions,
      normalize: true,
    }),
  });
  const response = await bedrockClient.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding as number[];
}

// ── Search functions ───────────────────────────────────────────────────────

/**
 * Semantic search on the et-services index (1024d).
 * Used by search_et_catalog tool.
 */
export async function searchServices(
  query: string,
  topK: number
): Promise<RetrievedItem[]> {
  const clampedTopK = Math.min(25, Math.max(5, topK));
  const queryVector = await embedQuery(query, EMBED_DIM);

  const results = await servicesIndex.query({
    vector: queryVector,
    topK: clampedTopK,
    includeMetadata: true,
  });

  return (results.matches ?? []).map((match) => ({
    id:       match.id,
    name:     String(match.metadata?.name ?? ""),
    score:    match.score ?? 0,
    metadata: (match.metadata ?? {}) as Record<string, string | number | boolean | string[]>,
  }));
}

/**
 * Semantic search on the et-news index (256d).
 * Used by search_prime_news tool.
 */
export async function searchArticles(
  query: string,
  topK: number
): Promise<RetrievedItem[]> {
  const clampedTopK = Math.min(15, Math.max(3, topK));
  const queryVector = await embedQuery(query, NEWS_EMBED_DIM);

  const results = await newsIndex.query({
    vector: queryVector,
    topK: clampedTopK,
    includeMetadata: true,
  });

  return (results.matches ?? []).map((match) => ({
    id:       match.id,
    name:     String(match.metadata?.title ?? ""),
    score:    match.score ?? 0,
    metadata: (match.metadata ?? {}) as Record<string, string | number | boolean | string[]>,
  }));
}
