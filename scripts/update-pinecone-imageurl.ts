#!/usr/bin/env ts-node
/**
 * update-pinecone-imageurl.ts
 *
 * One-time script to patch existing Pinecone vectors with the imageUrl metadata
 * field that was missing from the original embed-and-upsert run.
 *
 * Does NOT re-embed — only calls pinecone.update() to merge metadata.
 * Runs in batches to stay within Pinecone free-tier rate limits.
 *
 * Usage:
 *   set PINECONE_API_KEY=your-key-here
 *   npx ts-node scripts/update-pinecone-imageurl.ts
 */

import { Pinecone } from "@pinecone-database/pinecone";
import * as fs   from "fs";
import * as path from "path";

interface ProjectConfig { pineconeIndex?: string; }
const configPath = path.join(__dirname, "../retail-ai.config.json");
const cfg: ProjectConfig = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, "utf-8"))
  : {};

const PINECONE_KEY = process.env.PINECONE_API_KEY ?? "";
const INDEX_NAME   = cfg.pineconeIndex ?? "retail-products";
const BATCH_SIZE   = 50;   // Pinecone update is done per-vector; send in parallel batches
const DELAY_MS     = 300;  // Brief delay between batches

interface Product {
  productId: string;
  imageUrl?: string;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!PINECONE_KEY) {
    console.error("❌  PINECONE_API_KEY is required (set env var or pass --pinecone-key=)");
    process.exit(1);
  }

  const productsPath = path.join(__dirname, "../data/products.json");
  const products: Product[] = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
  console.log(`\n📦  Loaded ${products.length} products`);
  console.log(`🔗  Pinecone index: ${INDEX_NAME}\n`);

  const pinecone = new Pinecone({ apiKey: PINECONE_KEY });
  const index    = pinecone.index(INDEX_NAME);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);
    process.stdout.write(`⚙️   Batch ${batchNum}/${totalBatches} — updating ${batch.length} vectors...`);

    await Promise.all(
      batch.map(async (p) => {
        if (!p.imageUrl) { skipped++; return; }
        try {
          await index.update({
            id:       p.productId,
            metadata: { imageUrl: p.imageUrl },
          });
          updated++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`\n  ⚠️  Failed to update ${p.productId}: ${msg}`);
        }
      })
    );

    console.log(` done`);
    if (i + BATCH_SIZE < products.length) await sleep(DELAY_MS);
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅  Updated : ${updated} vectors`);
  if (skipped > 0) console.log(`⏭️   Skipped : ${skipped} (no imageUrl in products.json)`);
  console.log(`\n🎯  Done! Product images will now appear in the frontend.`);
}

main().catch((err) => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
