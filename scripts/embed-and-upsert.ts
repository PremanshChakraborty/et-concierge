#!/usr/bin/env ts-node
/**
 * embed-and-upsert.ts
 *
 * Dual-index embedding pipeline for ET AI Concierge.
 *
 * Index 1: et-services  — 1024d Titan v2, static (~76 entries)
 * Index 2: et-news      — 256d  Titan v2, dynamic (~40 articles)
 *
 * Usage:
 *   npx ts-node scripts/embed-and-upsert.ts                       # embed both
 *   npx ts-node scripts/embed-and-upsert.ts --target=services     # services only
 *   npx ts-node scripts/embed-and-upsert.ts --target=articles     # articles only
 *   npx ts-node scripts/embed-and-upsert.ts --dry-run             # test one embed
 *
 * Environment:
 *   PINECONE_API_KEY  (required)
 *   AWS credentials   (required — with AmazonBedrockFullAccess)
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { Pinecone } from "@pinecone-database/pinecone";
import * as fs from "fs";
import * as path from "path";

// ---------- Config ----------
interface ProjectConfig { awsRegion?: string; pineconeIndex?: string; }
const configPath = path.join(__dirname, "../retail-ai.config.json");
const cfg: ProjectConfig = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, "utf-8"))
  : {};

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const TARGET = (() => {
  const arg = args.find((a) => a.startsWith("--target="));
  return arg ? arg.split("=")[1] : "both";
})();
const PINECONE_KEY = (() => {
  const arg = args.find((a) => a.startsWith("--pinecone-key="));
  return arg ? arg.split("=")[1] : (process.env.PINECONE_API_KEY ?? "");
})();
const REGION = (() => {
  const arg = args.find((a) => a.startsWith("--region="));
  return arg ? arg.split("=")[1] : (cfg.awsRegion ?? "us-east-1");
})();
const BATCH_SIZE = 50;

// Index config
const SERVICES_INDEX = "et-services";
const NEWS_INDEX     = "et-news";
const SERVICES_DIM   = 1024;
const NEWS_DIM       = 256;

const BEDROCK_MODEL_ID = "amazon.titan-embed-text-v2:0";

// ---------- Types ----------
interface ETService {
  productId: string;
  name: string;
  category: string;
  subCategory: string;
  description: string;
  price: number;
  priceModel: string;
  pageUrl: string;
  imageUrl?: string;
  targetAudience?: string[];
  relevantGoals?: string[];
  tags?: string[];
  partnerBrand?: string | null;
  details?: Record<string, unknown>;
}

interface ETArticle {
  articleId: string;
  title: string;
  summary: string;
  sourceUrl: string;
  category: string;
  published_at: number;
  author: string;
  imageUrl?: string;
  tags?: string[];
}

// ---------- Embed text builders ----------
function buildServiceEmbedText(s: ETService): string {
  const parts = [
    s.name,
    s.description,
    `Category: ${s.category}`,
    `Type: ${s.subCategory}`,
    s.targetAudience?.length ? `For: ${s.targetAudience.join(", ")}` : "",
    s.relevantGoals?.length ? `Goals: ${s.relevantGoals.join(", ")}` : "",
    s.tags?.length ? `Tags: ${s.tags.join(", ")}` : "",
    s.partnerBrand ? `Partner: ${s.partnerBrand}` : "",
    `Price: ₹${s.price} (${s.priceModel})`,
  ];
  return parts.filter(Boolean).join(". ");
}

function buildArticleEmbedText(a: ETArticle): string {
  const parts = [
    a.title,
    a.summary,
    `Category: ${a.category}`,
    a.tags?.length ? `Tags: ${a.tags.join(", ")}` : "",
  ];
  return parts.filter(Boolean).join(". ");
}

// ---------- Embedding call ----------
async function embedText(
  client: BedrockRuntimeClient,
  text: string,
  dimensions: number
): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({ inputText: text, dimensions, normalize: true }),
  });
  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding as number[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Pipeline: Services ----------
async function embedServices(bedrock: BedrockRuntimeClient, pinecone: Pinecone) {
  const dataPath = path.join(__dirname, "../data/et-services.json");
  if (!fs.existsSync(dataPath)) {
    console.error(`❌  et-services.json not found at ${dataPath}`);
    return;
  }
  const services: ETService[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`\n📦  Services loaded: ${services.length}`);
  console.log(`    Index: ${SERVICES_INDEX} (dim=${SERVICES_DIM})\n`);

  const index = pinecone.index(SERVICES_INDEX);
  let success = 0, errors = 0;

  for (let i = 0; i < services.length; i += BATCH_SIZE) {
    const batch = services.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const total = Math.ceil(services.length / BATCH_SIZE);
    console.log(`  ⚙️  Batch ${batchNum}/${total} — items ${i + 1} to ${Math.min(i + BATCH_SIZE, services.length)}`);

    const vectors: { id: string; values: number[]; metadata: Record<string, any> }[] = [];

    for (const s of batch) {
      try {
        const text = buildServiceEmbedText(s);
        const embedding = await embedText(bedrock, text, SERVICES_DIM);
        vectors.push({
          id: s.productId,
          values: embedding,
          metadata: {
            productId: s.productId,
            name: s.name,
            category: s.category,
            subCategory: s.subCategory,
            price: s.price,
            priceModel: s.priceModel,
            pageUrl: s.pageUrl,
            imageUrl: s.imageUrl ?? "",
            tags: s.tags ?? [],
            targetAudience: s.targetAudience ?? [],
            relevantGoals: s.relevantGoals ?? [],
            partnerBrand: s.partnerBrand ?? "",
          },
        });
        success++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`    ⚠️  Failed ${s.productId}: ${msg}`);
        errors++;
      }
      await sleep(200);
    }

    if (vectors.length > 0) {
      await index.upsert(vectors);
      console.log(`    ✅  Upserted ${vectors.length} vectors`);
    }
    if (i + BATCH_SIZE < services.length) await sleep(500);
  }

  console.log(`\n  📊  Services: ${success} embedded, ${errors} errors`);
}

// ---------- Pipeline: Articles ----------
async function embedArticles(bedrock: BedrockRuntimeClient, pinecone: Pinecone) {
  const dataPath = path.join(__dirname, "../data/et-articles.json");
  if (!fs.existsSync(dataPath)) {
    console.error(`❌  et-articles.json not found at ${dataPath}`);
    return;
  }
  const articles: ETArticle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`\n📰  Articles loaded: ${articles.length}`);
  console.log(`    Index: ${NEWS_INDEX} (dim=${NEWS_DIM})\n`);

  const index = pinecone.index(NEWS_INDEX);
  let success = 0, errors = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const total = Math.ceil(articles.length / BATCH_SIZE);
    console.log(`  ⚙️  Batch ${batchNum}/${total} — items ${i + 1} to ${Math.min(i + BATCH_SIZE, articles.length)}`);

    const vectors: { id: string; values: number[]; metadata: Record<string, any> }[] = [];

    for (const a of batch) {
      try {
        const text = buildArticleEmbedText(a);
        const embedding = await embedText(bedrock, text, NEWS_DIM);
        vectors.push({
          id: a.articleId,
          values: embedding,
          metadata: {
            articleId: a.articleId,
            title: a.title,
            summary: a.summary,
            sourceUrl: a.sourceUrl,
            category: a.category,
            published_at: a.published_at,
            imageUrl: a.imageUrl ?? "",
            tags: a.tags ?? [],
          },
        });
        success++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`    ⚠️  Failed ${a.articleId}: ${msg}`);
        errors++;
      }
      await sleep(200);
    }

    if (vectors.length > 0) {
      await index.upsert(vectors);
      console.log(`    ✅  Upserted ${vectors.length} vectors`);
    }
    if (i + BATCH_SIZE < articles.length) await sleep(500);
  }

  console.log(`\n  📊  Articles: ${success} embedded, ${errors} errors`);
}

// ---------- Main ----------
async function main() {
  console.log(`\n🚀  ET AI Concierge — Dual-Index Embedding Pipeline`);
  console.log(`    Target  : ${TARGET}`);
  console.log(`    Region  : ${REGION}`);
  console.log(`    Dry Run : ${DRY_RUN}`);
  console.log(`─────────────────────────────────────\n`);

  if (!PINECONE_KEY) {
    console.error("❌  PINECONE_API_KEY is required.");
    process.exit(1);
  }

  const bedrock = new BedrockRuntimeClient({ region: REGION });
  const pinecone = new Pinecone({ apiKey: PINECONE_KEY });

  // DRY RUN
  if (DRY_RUN) {
    const services: ETService[] = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../data/et-services.json"), "utf-8")
    );
    const sample = services[0];
    const text = buildServiceEmbedText(sample);
    console.log(`🧪  DRY RUN — embedding first service`);
    console.log(`    Item : ${sample.productId} — ${sample.name}`);
    console.log(`    Text : "${text.slice(0, 120)}..."\n`);

    const vec1024 = await embedText(bedrock, text, 1024);
    console.log(`    ✅  1024d vector: [${vec1024.slice(0, 3).map(v => v.toFixed(6)).join(", ")}, ...]`);

    const vec256 = await embedText(bedrock, text, 256);
    console.log(`    ✅  256d  vector: [${vec256.slice(0, 3).map(v => v.toFixed(6)).join(", ")}, ...]`);

    console.log(`\n🟡  DRY RUN complete — no data upserted.`);
    return;
  }

  // FULL RUN
  if (TARGET === "both" || TARGET === "services") {
    await embedServices(bedrock, pinecone);
  }
  if (TARGET === "both" || TARGET === "articles") {
    await embedArticles(bedrock, pinecone);
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`🎯  Pipeline complete! Verify at: https://app.pinecone.io`);
}

main().catch((err) => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
