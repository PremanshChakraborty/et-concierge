/**
 * src/db.ts — Shared DynamoDB Document Client.
 */

import { DynamoDBClient }         from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const raw = new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" });

export const db = DynamoDBDocumentClient.from(raw, {
  marshallOptions:   { removeUndefinedValues: true },
  unmarshallOptions: { wrapNumbers: false },
});

// Table names from environment (set by CDK)
export const SESSION_TABLE     = process.env.SESSION_TABLE     ?? "Session";
export const USER_PROFILE_TABLE = process.env.USER_PROFILE_TABLE ?? "UserProfile";
export const STORES_TABLE       = process.env.STORES_TABLE       ?? "Stores";
