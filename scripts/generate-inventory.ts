#!/usr/bin/env ts-node
/**
 * generate-inventory.ts
 *
 * Seeds the DynamoDB tables:
 *   - `Stores`         → from data/stores.json
 *   - `StoreInventory` → computed probabilistically from data/products.json × stores
 *
 * Prerequisites:
 *   npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
 *   AWS credentials configured via: aws configure
 *
 * Usage:
 *   # Dry run (no writes to DynamoDB)
 *   npx ts-node scripts/generate-inventory.ts --dry-run
 *
 *   # Real seeding
 *   npx ts-node scripts/generate-inventory.ts
 *
 * Flags:
 *   --dry-run     Print stats without writing to DynamoDB
 *   --region=XX   AWS region (default: us-east-1)
 *   --skip-stores Skip seeding the Stores table
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import * as fs from "fs";
import * as path from "path";

// ---------- Config ----------
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_STORES = args.includes("--skip-stores");
const REGION_ARG = args.find((a) => a.startsWith("--region="));
const REGION = REGION_ARG ? REGION_ARG.split("=")[1] : "us-east-1";

const STORE_INVENTORY_TABLE = "StoreInventory";
const STORES_TABLE = "Stores";
const BATCH_SIZE = 25; // DynamoDB BatchWriteItem max

// Per-store stocking probabilities and stock ranges
const STORE_CONFIG: Record<"large" | "small", {
  stockProbability: number;  // chance a product is stocked
  minStock: number;           // min units per size
  maxStock: number;           // max units per size
}> = {
  large: { stockProbability: 0.85, minStock: 3, maxStock: 20 },
  small: { stockProbability: 0.40, minStock: 0, maxStock:  8 },
};

// Standard clothing sizes — used when product has no sizes field
const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL"];

// ---------- Types ----------
interface Product {
  productId: string;
  name: string;
  category: string;
  subCategory: string;
  sizes?: string[];
  [key: string]: unknown;
}

interface Store {
  storeId: string;
  name: string;
  type: "large" | "small";
  address: string;
  city: string;
  coordinates: { lat: number; lng: number };
  hours: Record<string, string>;
  phone: string;
  aisleMap: Record<string, { description: string; directions: string }>;
}

// ---------- Helpers ----------
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(probability: number): boolean {
  return Math.random() < probability;
}

/** Pick a random aisle name from the store's aisleMap */
function pickAisle(store: Store): string {
  const aisles = Object.keys(store.aisleMap);
  return aisles[Math.floor(Math.random() * aisles.length)];
}

/** Pick a rack label */
function pickRack(): string {
  const racks = ["Rack A", "Rack B", "Rack C", "Rack D"];
  return racks[Math.floor(Math.random() * racks.length)];
}

/** Generate sizeStock map for a product in a given store */
function generateSizeStock(
  product: Product,
  config: typeof STORE_CONFIG["large"]
): Record<string, number> {
  const sizes = product.sizes && product.sizes.length > 0
    ? product.sizes
    : CLOTHING_SIZES;

  const sizeStock: Record<string, number> = {};
  for (const size of sizes) {
    // Some sizes may be 0 even in a large store (realistic stock gaps)
    const outOfStock = chance(0.1); // 10% chance a size is completely OOS
    sizeStock[size] = outOfStock ? 0 : randomInt(config.minStock, config.maxStock);
  }
  return sizeStock;
}

/** Flush a batch of write requests to DynamoDB */
async function flushBatch(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  requests: Record<string, unknown>[],
  dryRun: boolean
): Promise<void> {
  if (dryRun) return;

  const command = new BatchWriteCommand({
    RequestItems: {
      [tableName]: requests,
    },
  });

  const response = await docClient.send(command);
  const unprocessed = response.UnprocessedItems?.[tableName]?.length ?? 0;
  if (unprocessed > 0) {
    console.warn(`  ⚠️  ${unprocessed} unprocessed items — consider retrying`);
  }
}

// ---------- Main ----------
async function main() {
  console.log(`\n🚀  Retail AI — Inventory Seeder`);
  console.log(`    Region  : ${REGION}`);
  console.log(`    Dry Run : ${DRY_RUN}`);
  console.log(`    Skip Stores: ${SKIP_STORES}`);
  console.log(`─────────────────────────────────────\n`);

  // Load data files
  const dataDir = path.join(__dirname, "../data");
  const productsPath = path.join(dataDir, "products.json");
  const storesPath = path.join(dataDir, "stores.json");

  if (!fs.existsSync(productsPath)) {
    console.error(`❌  products.json not found at ${productsPath}`);
    console.error(`    Run: npx ts-node scripts/merge-products.ts  first`);
    process.exit(1);
  }

  const products: Product[] = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
  const stores: Store[] = JSON.parse(fs.readFileSync(storesPath, "utf-8"));

  console.log(`📦  Products loaded : ${products.length}`);
  console.log(`🏪  Stores loaded   : ${stores.length}`);
  console.log();

  const client = new DynamoDBClient({ region: REGION });
  const docClient = DynamoDBDocumentClient.from(client);

  // ── STEP 1: Seed Stores table ──────────────────────────────────────────────
  if (!SKIP_STORES) {
    console.log(`📋  Seeding Stores table...`);
    let storesBatch: Record<string, unknown>[] = [];

    for (const store of stores) {
      storesBatch.push({
        PutRequest: { Item: store },
      });

      if (storesBatch.length === BATCH_SIZE) {
        await flushBatch(docClient, STORES_TABLE, storesBatch, DRY_RUN);
        storesBatch = [];
      }
    }
    if (storesBatch.length > 0) {
      await flushBatch(docClient, STORES_TABLE, storesBatch, DRY_RUN);
    }
    console.log(`    ✅  ${stores.length} stores ${DRY_RUN ? "(dry-run, not written)" : "written"}`);
  }

  // ── STEP 2: Generate + Seed StoreInventory ─────────────────────────────────
  console.log(`\n📦  Generating StoreInventory records...`);

  let inventoryBatch: Record<string, unknown>[] = [];
  let totalRecords = 0;
  let totalStockUnits = 0;

  const now = new Date().toISOString();

  for (const store of stores) {
    const config = STORE_CONFIG[store.type];
    let storeRecords = 0;

    for (const product of products) {
      // Probabilistically decide if this store stocks this product
      if (!chance(config.stockProbability)) continue;

      const sizeStock = generateSizeStock(product, config);
      const totalForProduct = Object.values(sizeStock).reduce((a, b) => a + b, 0);

      // Skip if all sizes are 0 (entirely OOS, pointless record)
      if (totalForProduct === 0) continue;

      const aisleName = pickAisle(store);
      const rack = pickRack();

      const item = {
        productId: product.productId,
        storeId: store.storeId,
        sizeStock,
        aisleName,
        rack,
        lastUpdated: now,
      };

      inventoryBatch.push({
        PutRequest: { Item: item },
      });

      totalRecords++;
      totalStockUnits += totalForProduct;
      storeRecords++;

      // Flush when batch is full
      if (inventoryBatch.length === BATCH_SIZE) {
        await flushBatch(docClient, STORE_INVENTORY_TABLE, inventoryBatch, DRY_RUN);
        inventoryBatch = [];
      }
    }
    console.log(`    🏪  ${store.name} (${store.type}) → ${storeRecords} product SKUs stocked`);
  }

  // Flush remaining
  if (inventoryBatch.length > 0) {
    await flushBatch(docClient, STORE_INVENTORY_TABLE, inventoryBatch, DRY_RUN);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n─────────────────────────────────────`);
  console.log(`✅  StoreInventory records : ${totalRecords}`);
  console.log(`📊  Total stock units      : ${totalStockUnits}`);
  if (totalStockUnits < 500) {
    console.warn(`⚠️  Warning: total stock units (${totalStockUnits}) is below the 500 target.`);
    console.warn(`    Try increasing STORE_CONFIG probabilities or running the seeder again.`);
  }
  if (DRY_RUN) {
    console.log(`\n🟡  DRY RUN — no data was written to DynamoDB.`);
    console.log(`    Remove --dry-run to perform the actual seeding.`);
  } else {
    console.log(`\n🟢  All data written to DynamoDB in region: ${REGION}`);
  }
}

main().catch((err) => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
