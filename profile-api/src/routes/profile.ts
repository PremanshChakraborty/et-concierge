import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { db, USER_PROFILE_TABLE } from "../db";
import { ok, notFound } from "../response";
import type { LambdaResponse } from "../response";

export async function getUserProfile(userId: string): Promise<LambdaResponse> {
  const result = await db.send(new GetCommand({
    TableName: USER_PROFILE_TABLE,
    Key:       { userId },
  }));

  if (!result.Item) {
    // If no profile exists yet, return empty profile gracefully
    return ok({ profile: {} });
  }

  return ok({
    profile: result.Item
  });
}
