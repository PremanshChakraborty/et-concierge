/**
 * clients/pinecone.ts — singleton Pinecone index client
 */

import { Pinecone } from "@pinecone-database/pinecone";

if (!process.env.PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY environment variable is required");
}

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

export const pineconeIndex = pinecone.index(
  process.env.PINECONE_INDEX ?? "retail-products"
);
