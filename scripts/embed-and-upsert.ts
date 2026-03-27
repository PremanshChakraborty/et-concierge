#!/usr/bin/env ts-node
/**
 * embed-and-upsert.ts
 *
 * Generates vector embeddings for all products using Amazon Bedrock
 * (Titan Embeddings v2, dim=1024) and upserts them into a Pinecone index.
 *
 * Prerequisites:
 *   npm install @pinecone-database/pinecone @aws-sdk/client-bedrock-runtime
 *   aws configure  (credentials with AmazonBedrockFullAccess)
 *   PINECONE_API_KEY set as environment variable (or passed via --pinecone-key=)
 *
 * Pinecone index must be created first (see instructions below):
 *   - Name:      retail-products
 *   - Dimension: 1024
 *   - Metric:    cosine
 *   - Cloud:     aws / us-east-1  (free Serverless tier)
 *
 * Usage:
 *   # Set API key in env (recommended)
 *   set PINECONE_API_KEY=your-key-here
 *   npx ts-node scripts/embed-and-upsert.ts
 *
 *   # Or pass it directly
 *   npx ts-node scripts/embed-and-upsert.ts --pinecone-key=your-key-here
 *
 * Flags:
 *   --pinecone-key=KEY   Pinecone API key (overrides env var)
 *   --index=NAME         Pinecone index name (default: retail-products)
 *   --region=REGION      AWS region for Bedrock (default: us-east-1)
 *   --batch=N            Products per upsert batch (default: 50)
 *   --dry-run            Embed one product only, print vector, no upsert
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
const DRY_RUN         = args.includes("--dry-run");
const PINECONE_KEY    = (() => {
  const arg = args.find((a) => a.startsWith("--pinecone-key="));
  return arg ? arg.split("=")[1] : (process.env.PINECONE_API_KEY ?? "");
})();
const INDEX_NAME      = (() => {
  const arg = args.find((a) => a.startsWith("--index="));
  return arg ? arg.split("=")[1] : (cfg.pineconeIndex ?? "retail-products");
})();
const REGION          = (() => {
  const arg = args.find((a) => a.startsWith("--region="));
  return arg ? arg.split("=")[1] : (cfg.awsRegion ?? "us-east-1");
})();
const BATCH_SIZE      = (() => {
  const arg = args.find((a) => a.startsWith("--batch="));
  return arg ? parseInt(arg.split("=")[1], 10) : 50;
})();

// Bedrock model for embeddings
const BEDROCK_MODEL_ID = "amazon.titan-embed-text-v2:0";
const EMBEDDING_DIM    = 1024;

// ---------- Types ----------
interface Product {
  productId:   string;
  name:        string;
  category:    string;
  subCategory: string;
  description: string;
  price:       number;
  imageUrl?:   string;
  sizes?:      string[];
  colors?:     string[];
  tags?:       string[];
}

// ---------- Helpers ----------
/**
 * Build a rich text string from a product — this is what gets embedded.
 * More descriptive text = better semantic search results.
 */
function buildEmbedText(product: Product): string {
  const parts = [
    product.name,
    product.description,
    `Category: ${product.category}`,
    `Type: ${product.subCategory}`,
    product.tags?.length ? `Tags: ${product.tags.join(", ")}` : "",
    product.colors?.length ? `Colors: ${product.colors.join(", ")}` : "",
    `Price: ₹${product.price}`,
  ];
  return parts.filter(Boolean).join(". ");
}

/**
 * Call Amazon Bedrock Titan Embeddings v2 to get a 1024-dimension vector.
 */
async function embedText(
  client: BedrockRuntimeClient,
  text: string
): Promise<number[]> {
  const payload = {
    inputText: text,
    dimensions: EMBEDDING_DIM,
    normalize: true,
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding as number[];
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Main ----------
async function main() {
  console.log(`\n🚀  Retail AI — Pinecone Embedding Pipeline`);
  console.log(`    Index   : ${INDEX_NAME}`);
  console.log(`    Model   : ${BEDROCK_MODEL_ID} (dim=${EMBEDDING_DIM})`);
  console.log(`    Region  : ${REGION}`);
  console.log(`    Batch   : ${BATCH_SIZE}`);
  console.log(`    Dry Run : ${DRY_RUN}`);
  console.log(`─────────────────────────────────────\n`);

  if (!PINECONE_KEY) {
    console.error("❌  PINECONE_API_KEY is required.");
    console.error("    Set it with:  set PINECONE_API_KEY=your-key-here");
    console.error("    Or pass:      --pinecone-key=your-key-here");
    process.exit(1);
  }

  // Load products
  const productsPath = path.join(__dirname, "../data/products.json");
  if (!fs.existsSync(productsPath)) {
    console.error(`❌  products.json not found at ${productsPath}`);
    console.error("    Run: npm run merge  first");
    process.exit(1);
  }
  const products: Product[] = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
  console.log(`📦  Products loaded: ${products.length}\n`);

  // Bedrock client
  const bedrock = new BedrockRuntimeClient({ region: REGION });

  // Pinecone client
  const pinecone = new Pinecone({ apiKey: PINECONE_KEY });
  const index = pinecone.index(INDEX_NAME);

  // DRY RUN — embed one product and print the vector shape
  if (DRY_RUN) {
    const sample = products[0];
    const text = buildEmbedText(sample);
    console.log(`🧪  DRY RUN — embedding first product only`);
    console.log(`    Product : ${sample.productId} — ${sample.name}`);
    console.log(`    Text    : "${text.slice(0, 120)}..."\n`);

    console.log("    Calling Bedrock Titan Embeddings v2...");
    const vector = await embedText(bedrock, text);
    console.log(`\n✅  Embedding successful!`);
    console.log(`    Dimension  : ${vector.length}`);
    console.log(`    First 5 vals: [${vector.slice(0, 5).map((v) => v.toFixed(6)).join(", ")}]`);
    console.log(`\n🟡  DRY RUN complete — no data was upserted to Pinecone.`);
    return;
  }

  // FULL RUN — embed all products in batches and upsert to Pinecone
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);
    console.log(`⚙️   Batch ${batchNum}/${totalBatches} — products ${i + 1} to ${Math.min(i + BATCH_SIZE, products.length)}`);

    const vectors: { id: string; values: number[]; metadata: Record<string, string | number | boolean | string[]> }[] = [];

    for (const product of batch) {
      try {
        const text = buildEmbedText(product);
        const embedding = await embedText(bedrock, text);

        vectors.push({
          id: product.productId,
          values: embedding,
          metadata: {
            productId:   product.productId,
            name:        product.name,
            category:    product.category,
            subCategory: product.subCategory,
            price:       product.price,
            imageUrl:    product.imageUrl ?? "",
            tags:        product.tags   ?? [],
            colors:      product.colors ?? [],
            sizes:       product.sizes  ?? [],
          },
        });

        successCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ⚠️  Failed to embed ${product.productId}: ${msg}`);
        errorCount++;
      }

      // Small delay to avoid Bedrock rate limits (60 req/min on free tier)
      await sleep(200);
    }

    // Upsert the batch to Pinecone
    if (vectors.length > 0) {
      await index.upsert(vectors);
      console.log(`    ✅  Upserted ${vectors.length} vectors`);
    }

    // Brief pause between batches
    if (i + BATCH_SIZE < products.length) {
      await sleep(500);
    }
  }

  // Summary
  console.log(`\n─────────────────────────────────────`);
  console.log(`✅  Embedded + upserted : ${successCount} products`);
  if (errorCount > 0) {
    console.warn(`⚠️  Errors             : ${errorCount} products (see above)`);
  }
  console.log(`\n🎯  Pinecone index "${INDEX_NAME}" is ready for vector search!`);
  console.log(`    Verify at: https://app.pinecone.io`);
}

main().catch((err) => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
