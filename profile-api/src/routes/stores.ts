/**
 * src/routes/stores.ts — Store code validation.
 *
 * POST /stores/validate
 * Body: { storeCode: string }
 *
 * Looks up the storeCode in the Stores DynamoDB table.
 * The storeCode entered by the user IS the storeId (e.g. "STR-001").
 * Returns the full store record including aisleMap.
 */

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { db, STORES_TABLE } from "../db";
import { ok, badRequest, notFound } from "../response";
import type { LambdaResponse } from "../response";

export async function validateStore(body: string | null): Promise<LambdaResponse> {
  if (!body) return badRequest("Request body is required");

  let storeCode: string;
  try {
    ({ storeCode } = JSON.parse(body));
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!storeCode || typeof storeCode !== "string" || storeCode.trim().length === 0) {
    return badRequest("storeCode is required");
  }

  // Normalize: uppercase, strip spaces  (accepts "str-001" or "STR-001")
  const storeId = storeCode.toUpperCase().trim();

  const result = await db.send(new GetCommand({
    TableName: STORES_TABLE,
    Key: { storeId },
  }));

  if (!result.Item) {
    return notFound(`No store found with code "${storeId}". Please check the code and try again.`);
  }

  const store = result.Item;

  // Build aisleMap array for frontend — new schema: { [label]: { description, directions } }
  const aisleMap: { label: string; description: string; directions: string }[] = [];
  if (store.aisleMap && typeof store.aisleMap === "object") {
    for (const [label, value] of Object.entries(store.aisleMap as Record<string, { description: string; directions: string }>)) {
      aisleMap.push({
        label,
        description: value?.description ?? "",
        directions:  value?.directions  ?? "",
      });
    }
  }

  // Derive a human-readable hours string for today
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = days[new Date().getDay()];
  const todayHours = store.hours?.[today] as string | undefined;
  // Hours stored as "10:00-22:00" — convert to readable format
  const hoursStr = todayHours
    ? `Open today ${todayHours.replace("-", " \u2013 ")}`
    : "Hours unavailable";

  return ok({
    storeId:   store.storeId,
    storeName: store.name,
    address:   store.address,
    hours:     hoursStr,
    phone:     store.phone,
    aisleMap,
  });
}
