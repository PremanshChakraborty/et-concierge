/**
 * clients/bedrock.ts
 * Bedrock model constants and shared client
 */

import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

// Amazon Nova Premier — best tool-use consistency, no international billing required
export const CLAUDE_MODEL = "us.amazon.nova-premier-v1:0";

// Amazon Titan Embeddings v2 — used by ragNode for query embedding
export const TITAN_EMBED_MODEL = "amazon.titan-embed-text-v2:0";
export const EMBED_DIM = 1024;

// Shared Bedrock runtime client
export const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION ?? "us-east-1",
});
