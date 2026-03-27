#!/usr/bin/env ts-node
/**
 * upload-catalog.ts
 *
 * Uploads data/products.json to S3 at:
 *   s3://<bucket>/catalog/products.json
 *
 * Usage:
 *   npx ts-node scripts/upload-catalog.ts --bucket=retail-ai-product-catalog-pb
 *   npx ts-node scripts/upload-catalog.ts --bucket=retail-ai-product-catalog-pb --region=us-east-1
 */

import { S3Client, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

// ---------- Config ----------
interface ProjectConfig { s3Bucket?: string; awsRegion?: string; }
const configPath = path.join(__dirname, "../retail-ai.config.json");
const cfg: ProjectConfig = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, "utf-8"))
  : {};

const args = process.argv.slice(2);
const BUCKET_ARG = args.find((a) => a.startsWith("--bucket="));
const REGION_ARG = args.find((a) => a.startsWith("--region="));
const REGION = REGION_ARG ? REGION_ARG.split("=")[1] : (cfg.awsRegion ?? "us-east-1");
const BUCKET = BUCKET_ARG ? BUCKET_ARG.split("=")[1] : (cfg.s3Bucket ?? "");
const S3_KEY = "catalog/products.json";

async function main() {
  if (!BUCKET) {
    console.error("❌  --bucket is required. Example:");
    console.error("    npx ts-node scripts/upload-catalog.ts --bucket=retail-ai-product-catalog-pb");
    process.exit(1);
  }

  const productsPath = path.join(__dirname, "../data/products.json");
  if (!fs.existsSync(productsPath)) {
    console.error(`❌  products.json not found at ${productsPath}`);
    console.error("    Run: npm run merge  first");
    process.exit(1);
  }

  const fileContent = fs.readFileSync(productsPath);
  const fileSizeKb = (fileContent.length / 1024).toFixed(1);

  console.log(`\n🚀  Retail AI — S3 Catalog Upload`);
  console.log(`    Bucket : s3://${BUCKET}`);
  console.log(`    Key    : ${S3_KEY}`);
  console.log(`    Region : ${REGION}`);
  console.log(`    Size   : ${fileSizeKb} KB`);
  console.log(`─────────────────────────────────────\n`);

  const client = new S3Client({ region: REGION });

  // Verify the bucket exists and we have access
  try {
    await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`✅  Bucket verified: s3://${BUCKET}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌  Cannot access bucket s3://${BUCKET}: ${message}`);
    console.error("    Make sure the bucket exists and your IAM user has s3:PutObject permission.");
    process.exit(1);
  }

  // Upload
  console.log(`\n📤  Uploading products.json...`);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: S3_KEY,
        Body: fileContent,
        ContentType: "application/json",
      })
    );
    console.log(`\n🟢  Upload successful!`);
    console.log(`    s3://${BUCKET}/${S3_KEY}`);
    console.log(`\n    You can verify in the AWS Console:`);
    console.log(`    https://s3.console.aws.amazon.com/s3/object/${BUCKET}?prefix=${S3_KEY}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌  Upload failed: ${message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
