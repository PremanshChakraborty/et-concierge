/**
 * src/auth.ts — Cognito JWT verification middleware.
 * Same pattern as the orchestrator's handler.ts auth logic.
 */

import { CognitoJwtVerifier } from "aws-jwt-verify";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse:   "access",
  clientId:   process.env.COGNITO_CLIENT_ID!,
});

/**
 * Extracts and verifies the Bearer token from an Authorization header.
 * Returns the Cognito `sub` (userId) on success, throws on failure.
 */
export async function verifyToken(authHeader: string | undefined): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or malformed Authorization header");
  }
  const token   = authHeader.slice(7);
  const payload = await verifier.verify(token);
  return payload.sub;
}
