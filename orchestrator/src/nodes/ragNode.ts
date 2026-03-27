/**
 * nodes/ragNode.ts — Pure utility: executes a Pinecone semantic search.
 * Called by toolNode when Claude invokes the search_products tool.
 * No longer a graph node itself.
 */

import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient, TITAN_EMBED_MODEL, EMBED_DIM } from "../clients/bedrock";
import { pineconeIndex } from "../clients/pinecone";
import { RetrievedProduct } from "../state";

async function embedQuery(text: string): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: TITAN_EMBED_MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      inputText: text,
      dimensions: EMBED_DIM,
      normalize: true,
    }),
  });
  const response = await bedrockClient.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding as number[];
}

/**
 * Embeds `query` with Bedrock Titan v2, then fetches `topK` results from Pinecone.
 * topK is clamped to [10, 25] defensively (Claude should respect the tool schema,
 * but belt-and-suspenders never hurts).
 */
export async function executeSearch(
  query: string,
  topK: number
): Promise<RetrievedProduct[]> {
  const clampedTopK = Math.min(25, Math.max(10, topK));

  const queryVector = await embedQuery(query);

  const results = await pineconeIndex.query({
    vector: queryVector,
    topK: clampedTopK,
    includeMetadata: true,
  });

  return (results.matches ?? []).map((match) => ({
    productId: match.id,
    name:      String(match.metadata?.name ?? ""),
    score:     match.score ?? 0,
    metadata:  (match.metadata ?? {}) as Record<string, string | number | string[]>,
  }));
}

