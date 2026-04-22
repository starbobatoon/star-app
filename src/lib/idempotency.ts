import { createHash } from "crypto";
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generate a deterministic idempotency key from email + questionnaire answers.
 * Uses SHA-256 to produce a hex string. Same inputs always produce the same key.
 */
export function generateIdempotencyKey(
  email: string,
  answers: Record<string, string>
): string {
  // Sort keys for deterministic ordering
  const sorted = Object.entries(answers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const input = `${email}:${sorted}`;
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Check whether an idempotency key already exists in the speeches table.
 * Returns the existing speech ID if found, or null if no match exists.
 */
export async function checkIdempotencyKey(
  key: string
): Promise<string | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("speeches")
    .select("id")
    .eq("idempotency_key", key)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Idempotency check failed: ${error.message}`
    );
  }

  return data?.id ?? null;
}