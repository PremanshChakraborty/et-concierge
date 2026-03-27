#!/usr/bin/env ts-node
/**
 * merge-products.ts
 * Merges products-batch1.json, products-batch2.json, products-batch3.json
 * into a single products.json file in the same data/ directory.
 *
 * Run: npx ts-node scripts/merge-products.ts
 */

import * as fs from "fs";
import * as path from "path";

const dataDir = path.join(__dirname, "../data");

const batches = ["products-batch1.json", "products-batch2.json", "products-batch3.json"];

let merged: unknown[] = [];

for (const batchFile of batches) {
  const filePath = path.join(dataDir, batchFile);
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  merged = merged.concat(content);
  console.log(`✅  Merged ${batchFile} — ${content.length} products`);
}

const outputPath = path.join(dataDir, "products.json");
fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), "utf-8");

console.log(`\n🎉  Total products merged: ${merged.length}`);
console.log(`📄  Written to: ${outputPath}`);
