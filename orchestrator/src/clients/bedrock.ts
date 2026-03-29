/**
 * clients/llm.ts
 * LLM model constants and shared configuration
 */

import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

export const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION ?? "us-east-1",
});

// Gemini 2.5 Flash — fast, reliable tool-use, no verbose thinking
export const LLM_MODEL = "gemini-2.5-flash";

// Amazon Titan Embeddings v2 — used by ragNode for query embedding
// (still using Bedrock for embeddings)
export const TITAN_EMBED_MODEL = "amazon.titan-embed-text-v2:0";
export const EMBED_DIM = 1024;
export const NEWS_EMBED_DIM = 256;
