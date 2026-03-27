#!/usr/bin/env ts-node
/**
 * fix-missing-imageurl.ts
 *
 * Scans all Pinecone vectors, detects those with an empty or missing imageUrl,
 * then re-embeds ONLY those products using Bedrock Titan and upserts them back.
 *
 * Usage:
 *   $env:PINECONE_API_KEY="..."
 *   $env:AWS_REGION="us-east-1"
 *   npx ts-node scripts/fix-missing-imageurl.ts
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import * as fs   from "fs";
import * as path from "path";

const PINECONE_KEY  = process.env.PINECONE_API_KEY ?? "";
const INDEX_NAME    = "retail-products";
const AWS_REGION    = process.env.AWS_REGION ?? "us-east-1";
const EMBED_MODEL   = "amazon.titan-embed-text-v2:0";
const FETCH_BATCH   = 100;  // Pinecone max per fetch
const EMBED_DELAY   = 200;  // ms between Bedrock calls to avoid throttling

interface Product {
  productId:   string;
  name:        string;
  category:    string;
  subCategory: string;
  description: string;
  price:       number;
  imageUrl?:   string;
  tags?:       string[];
  colors?:     string[];
  sizes?:      string[];
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function embed(client: BedrockRuntimeClient, text: string): Promise<number[]> {
  const cmd = new InvokeModelCommand({
    modelId:     EMBED_MODEL,
    contentType: "application/json",
    accept:      "application/json",
    body:        JSON.stringify({ inputText: text }),
  });
  const res  = await client.send(cmd);
  const body = JSON.parse(Buffer.from(res.body).toString("utf-8"));
  return body.embedding as number[];
}

async function main() {
  if (!PINECONE_KEY) { console.error("❌  PINECONE_API_KEY required"); process.exit(1); }

  const products: Product[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/products.json"), "utf-8")
  );
  const productMap = new Map(products.map(p => [p.productId, p]));
  const allIds     = products.map(p => p.productId);

  console.log(`\n🔍  Scanning ${allIds.length} Pinecone vectors for missing imageUrl...\n`);

  const pc  = new Pinecone({ apiKey: PINECONE_KEY });
  const idx = pc.index(INDEX_NAME);
  const bedrock = new BedrockRuntimeClient({ region: AWS_REGION });

  // Fetch all vectors in batches to check metadata
  const missingIds: string[] = [];
  for (let i = 0; i < allIds.length; i += FETCH_BATCH) {
    const batch  = allIds.slice(i, i + FETCH_BATCH);
    const result = await idx.fetch(batch);
    for (const [id, record] of Object.entries(result.records)) {
      const imageUrl = (record.metadata as Record<string, unknown>)?.imageUrl;
      if (!imageUrl || imageUrl === "") missingIds.push(id);
    }
    process.stdout.write(`  Checked ${Math.min(i + FETCH_BATCH, allIds.length)}/${allIds.length}...\r`);
  }

  console.log(`\n✅  Scan complete. ${missingIds.length} products have missing imageUrl.`);
  if (missingIds.length === 0) { console.log("🎉  Nothing to fix!"); return; }
  console.log(`   IDs: ${missingIds.join(", ")}\n`);

  // Re-embed and upsert only the missing ones
  let fixed = 0;
  for (const productId of missingIds) {
    const p = productMap.get(productId);
    if (!p) { console.warn(`  ⚠️  ${productId} not found in products.json`); continue; }

    process.stdout.write(`  ⚙️  Re-embedding ${productId} (${p.name})...`);
    const text      = `${p.name} ${p.category} ${p.subCategory} ${p.description} ${(p.tags ?? []).join(" ")}`;
    const embedding = await embed(bedrock, text);

    await idx.upsert([{
      id:     p.productId,
      values: embedding,
      metadata: {
        productId:   p.productId,
        name:        p.name,
        category:    p.category,
        subCategory: p.subCategory,
        price:       p.price,
        imageUrl:    p.imageUrl ?? "",
        tags:        p.tags   ?? [],
        colors:      p.colors ?? [],
        sizes:       p.sizes  ?? [],
      },
    }]);

    fixed++;
    console.log(` done → ${p.imageUrl ?? "(still empty in products.json)"}`);
    await sleep(EMBED_DELAY);
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅  Fixed ${fixed}/${missingIds.length} vectors`);
  if (fixed < missingIds.length) console.log(`⚠️   ${missingIds.length - fixed} skipped (not in products.json)`);
}

main().catch(err => { console.error("❌  Fatal:", err); process.exit(1); });
