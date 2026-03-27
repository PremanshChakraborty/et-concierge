/**
 * clients/dynamodb.ts — singleton DynamoDBDocumentClient
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const rawClient = new DynamoDBClient({
  region: process.env.BEDROCK_REGION ?? "us-east-1",
});

export const dynamoDb = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions:   { removeUndefinedValues: true },
  unmarshallOptions: { wrapNumbers: false },
});

export const SESSION_TABLE   = process.env.SESSION_TABLE   ?? "Session";
