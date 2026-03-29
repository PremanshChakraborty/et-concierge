/**
 * local-test.ts — Aggressive test for ET AI Concierge orchestrator.
 * Forces the search → structured_response flow.
 *
 * Run: npx ts-node --transpile-only src/local-test.ts
 */

import { graph } from "./graph";

async function runTest(label: string, message: string, sessionId?: string): Promise<string> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🧪  ${label}`);
  console.log(`📤  Query: "${message}"`);
  console.log(`    Session: ${sessionId ?? "(new)"}`);
  console.log("═".repeat(60));

  const result = await graph.invoke({
    userId: "local-test-user",
    sessionId: sessionId ?? "",
    userMessage: message,
  });

  console.log(`\n✅  Mode       : ${result.currentMode}`);
  console.log(`💬  Text       : ${result.responseText}`);

  console.log(`📦  Services   : ${result.responseServices?.length ?? 0}`);
  (result.responseServices ?? []).forEach((s: { name: string; price: number; reason: string; category: string }) => {
    console.log(`    • ${s.name} [${s.category}] — ₹${s.price}`);
    if (s.reason) console.log(`      "${s.reason}"`);
  });

  console.log(`📰  Articles   : ${result.responseArticles?.length ?? 0}`);
  (result.responseArticles ?? []).forEach((a: { title: string; category: string }) => {
    console.log(`    • ${a.title} [${a.category}]`);
  });

  console.log(`💡  Follow-ups :`);
  (result.followUpQuestions ?? []).forEach((q: string) => console.log(`    • ${q}`));
  console.log(`    sessionId  : ${result.sessionId}`);
  if (result.error) console.error(`❌  Error: ${result.error}`);

  return result.sessionId as string;
}

async function main() {
  console.log("🚀  ET AI Concierge — Aggressive Local Test\n");

  // Test 1: Direct "show me" query — MUST trigger search → structured_response
  const sid = await runTest(
    "TEST 1: Direct search (Advisory)",
    "Show me courses for options trading and technical analysis"
  );

  // Test 2: Follow-up on same session — should use structured_response only
  await runTest(
    "TEST 2: Follow-up (same session)",
    "Tell me more about the first one",
    sid
  );
}

main().catch(console.error);
