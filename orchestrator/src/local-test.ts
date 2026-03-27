/**
 * local-test.ts — Simulates Lambda Function URL invocations locally.
 * Run: npx ts-node src/local-test.ts
 *
 * Requires environment variables:
 *   PINECONE_API_KEY=...
 *   PINECONE_INDEX=retail-products
 *   BEDROCK_REGION=us-east-1
 *   SESSION_TABLE=Session
 */

import { handler } from "./handler";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

const TEST_QUERIES = [
  "I need an outfit for a beach wedding",
  "Show me something casual for brunch under ₹2000",
  "yes, show me options in the blush colour",   // conversational — should NOT trigger RAG
];

function makeFakeEvent(message: string, sessionId?: string): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/",
    rawQueryString: "",
    headers: { "content-type": "application/json" },
    requestContext: {
      accountId: "123456789",
      apiId: "local",
      domainName: "localhost",
      domainPrefix: "localhost",
      http: { method: "POST", path: "/", protocol: "HTTP/1.1", sourceIp: "127.0.0.1", userAgent: "local-test" },
      requestId: `local-${Date.now()}`,
      routeKey: "$default",
      stage: "$default",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    body: JSON.stringify({ message, sessionId }),
    isBase64Encoded: false,
  };
}

async function runTest(message: string, sessionId?: string): Promise<string> {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📤  Query: "${message}"`);
  console.log(`    Session: ${sessionId ?? "(new)"}`);
  console.log("─".repeat(60));

  const result = await handler(makeFakeEvent(message, sessionId));

  // APIGatewayProxyResultV2 can be string | object — unwrap safely
  const resultObj = typeof result === "object" && result !== null ? result : { statusCode: 0, body: "{}" };
  const statusCode = "statusCode" in resultObj ? resultObj.statusCode : 0;
  const rawBody    = "body" in resultObj ? String(resultObj.body) : "{}";
  const body       = JSON.parse(rawBody);

  console.log(`\n✅  Status     : ${statusCode}`);
  console.log(`💬  Text       : ${body.text}`);
  console.log(`📦  Products   : ${body.products?.length ?? 0}`);
  (body.products ?? []).forEach((p: { name: string; price: number; reason: string }) => {
    console.log(`    • ${p.name} — ₹${p.price}`);
    console.log(`      "${p.reason}"`);
  });
  console.log(`💡  Follow-ups :`);
  (body.followUpQuestions ?? []).forEach((q: string) => console.log(`    • ${q}`));
  console.log(`    sessionId  : ${body.sessionId}`);
  if (body.error) console.error(`❌  Error: ${body.error}`);

  return body.sessionId as string;
}

async function main() {
  console.log("🚀  Retail AI — Local Orchestrator Test\n");
  let sessionId: string | undefined;
  for (const query of TEST_QUERIES) {
    sessionId = await runTest(query, sessionId);
  }
}

main().catch(console.error);
