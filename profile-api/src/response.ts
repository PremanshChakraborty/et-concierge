/**
 * src/response.ts — HTTP response helpers for Lambda Function URL.
 *
 * NOTE: Do NOT add Access-Control-Allow-Origin or other CORS headers here.
 * The Lambda Function URL CORS config (set in CDK) handles them at the AWS
 * level. Adding them in code causes doubled headers which browsers reject.
 */

export interface LambdaResponse {
  statusCode: number;
  headers:    Record<string, string>;
  body:       string;
}

const BASE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};

export function ok(data: unknown): LambdaResponse {
  return { statusCode: 200, headers: BASE_HEADERS, body: JSON.stringify(data) };
}

export function created(data: unknown): LambdaResponse {
  return { statusCode: 201, headers: BASE_HEADERS, body: JSON.stringify(data) };
}

export function noContent(): LambdaResponse {
  return { statusCode: 204, headers: BASE_HEADERS, body: "" };
}

export function badRequest(message: string): LambdaResponse {
  return { statusCode: 400, headers: BASE_HEADERS, body: JSON.stringify({ error: message }) };
}

export function unauthorized(message = "Unauthorized"): LambdaResponse {
  return { statusCode: 401, headers: BASE_HEADERS, body: JSON.stringify({ error: message }) };
}

export function notFound(message = "Not found"): LambdaResponse {
  return { statusCode: 404, headers: BASE_HEADERS, body: JSON.stringify({ error: message }) };
}

export function serverError(err: unknown): LambdaResponse {
  const msg = err instanceof Error ? err.message : "Internal server error";
  console.error("[profile-api] Internal error:", err);
  return { statusCode: 500, headers: BASE_HEADERS, body: JSON.stringify({ error: msg }) };
}
