/**
 * src/routes/profile.ts — User cart and wishlist CRUD.
 *
 * GET  /profile/cart               → { cart, total }
 * POST /profile/cart               → add a CartItem
 * DELETE /profile/cart/:productId  → remove a CartItem
 *
 * GET  /profile/wishlist               → { wishlist }
 * POST /profile/wishlist               → add a WishlistItem
 * DELETE /profile/wishlist/:productId  → remove a WishlistItem
 */

import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { db, USER_PROFILE_TABLE } from "../db";
import { ok, badRequest } from "../response";
import type { LambdaResponse } from "../response";

interface CartItem {
  productId: string;
  name:      string;
  imageUrl:  string;
  price:     number;
  size:      string;
  color:     string;
  quantity:  number;
}

interface WishlistItem {
  productId: string;
  name:      string;
  imageUrl:  string;
  price:     number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getProfile(userId: string) {
  const result = await db.send(new GetCommand({
    TableName: USER_PROFILE_TABLE,
    Key: { userId },
  }));
  return result.Item;
}

async function ensureProfile(userId: string) {
  const existing = await getProfile(userId);
  if (!existing) {
    await db.send(new PutCommand({
      TableName: USER_PROFILE_TABLE,
      Item: { userId, cart: [], wishlist: [], lastUpdated: new Date().toISOString() },
      ConditionExpression: "attribute_not_exists(userId)",
    }));
  }
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export async function getCart(userId: string): Promise<LambdaResponse> {
  const profile = await getProfile(userId);
  const cart: CartItem[] = profile?.cart ?? [];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return ok({ cart, total });
}

export async function addToCart(userId: string, body: string | null): Promise<LambdaResponse> {
  if (!body) return badRequest("Request body is required");

  let item: CartItem;
  try {
    item = JSON.parse(body);
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!item.productId || !item.size || typeof item.price !== "number") {
    return badRequest("productId, size, and price are required");
  }

  await ensureProfile(userId);

  // If same productId+size already in cart, increment quantity
  const profile = await getProfile(userId);
  const cart: CartItem[] = profile?.cart ?? [];
  const existingIdx = cart.findIndex(
    (c) => c.productId === item.productId && c.size === item.size
  );

  let updatedCart: CartItem[];
  if (existingIdx >= 0) {
    updatedCart = cart.map((c, i) =>
      i === existingIdx ? { ...c, quantity: c.quantity + (item.quantity ?? 1) } : c
    );
  } else {
    updatedCart = [...cart, { ...item, quantity: item.quantity ?? 1 }];
  }

  await db.send(new UpdateCommand({
    TableName:                 USER_PROFILE_TABLE,
    Key:                       { userId },
    UpdateExpression:          "SET cart = :cart, lastUpdated = :ts",
    ExpressionAttributeValues: {
      ":cart": updatedCart,
      ":ts":   new Date().toISOString(),
    },
  }));

  return ok({ cart: updatedCart });
}

export async function removeFromCart(userId: string, productId: string): Promise<LambdaResponse> {
  const profile = await getProfile(userId);
  const cart: CartItem[] = (profile?.cart ?? []).filter((c: CartItem) => c.productId !== productId);

  await db.send(new UpdateCommand({
    TableName:                 USER_PROFILE_TABLE,
    Key:                       { userId },
    UpdateExpression:          "SET cart = :cart, lastUpdated = :ts",
    ExpressionAttributeValues: { ":cart": cart, ":ts": new Date().toISOString() },
  }));

  return ok({ cart });
}

// ── Wishlist ──────────────────────────────────────────────────────────────────

export async function getWishlist(userId: string): Promise<LambdaResponse> {
  const profile = await getProfile(userId);
  return ok({ wishlist: profile?.wishlist ?? [] });
}

export async function addToWishlist(userId: string, body: string | null): Promise<LambdaResponse> {
  if (!body) return badRequest("Request body is required");

  let item: WishlistItem;
  try {
    item = JSON.parse(body);
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!item.productId || typeof item.price !== "number") {
    return badRequest("productId and price are required");
  }

  await ensureProfile(userId);
  const profile = await getProfile(userId);
  const wishlist: WishlistItem[] = profile?.wishlist ?? [];

  // Idempotent — don't add duplicates
  if (!wishlist.some((w) => w.productId === item.productId)) {
    wishlist.push(item);
    await db.send(new UpdateCommand({
      TableName:                 USER_PROFILE_TABLE,
      Key:                       { userId },
      UpdateExpression:          "SET wishlist = :wishlist, lastUpdated = :ts",
      ExpressionAttributeValues: { ":wishlist": wishlist, ":ts": new Date().toISOString() },
    }));
  }

  return ok({ wishlist });
}

export async function removeFromWishlist(userId: string, productId: string): Promise<LambdaResponse> {
  const profile = await getProfile(userId);
  const wishlist: WishlistItem[] = (profile?.wishlist ?? []).filter(
    (w: WishlistItem) => w.productId !== productId
  );

  await db.send(new UpdateCommand({
    TableName:                 USER_PROFILE_TABLE,
    Key:                       { userId },
    UpdateExpression:          "SET wishlist = :wishlist, lastUpdated = :ts",
    ExpressionAttributeValues: { ":wishlist": wishlist, ":ts": new Date().toISOString() },
  }));

  return ok({ wishlist });
}
