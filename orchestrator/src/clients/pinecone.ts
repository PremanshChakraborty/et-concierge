/**
 * clients/pinecone.ts — Dual Pinecone index clients for ET Concierge
 *
 * et-services: 1024d, static — subscriptions, tools, courses, events, financial services
 * et-news:     256d, dynamic  — ET Prime news article summaries
 */

import { Pinecone } from "@pinecone-database/pinecone";

if (!process.env.PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY environment variable is required");
}

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

/** 1024-dimension index for ET services, events, courses, subscriptions */
export const servicesIndex = pinecone.index(
  process.env.PINECONE_SERVICES_INDEX ?? "et-services"
);

/** 256-dimension index for ET Prime news articles */
export const newsIndex = pinecone.index(
  process.env.PINECONE_NEWS_INDEX ?? "et-news"
);
