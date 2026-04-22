/**
 * @module openrouter
 * @description OpenRouter API client with slot-based model selection.
 *
 * Reads the encrypted API key from the database, loads model/temperature/max_tokens
 * per slot from the model_slots table, and provides chat, testConnection, and
 * listModels functions.
 *
 * IMPORTANT: This module uses Node.js APIs and Supabase admin client — server-only.
 * Never import this from a client component.
 */

import "server-only";
import { decrypt } from "@/lib/encryption";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelSlot = "primary" | "brainstorm";

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatParams {
  slot: ModelSlot;
  messages: ChatMessage[];
  stream?: boolean;
}

export interface TestConnectionResult {
  ok: boolean;
  credits?: number;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

interface ModelSlotRow {
  slot: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
}

interface OpenRouterIntegrationRow {
  api_key_encrypted: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

// ---------------------------------------------------------------------------
// In-memory model list cache
// ---------------------------------------------------------------------------

let modelCache: { timestamp: number; models: ModelInfo[] } | null = null;

// ---------------------------------------------------------------------------
// getDecryptedApiKey — read encrypted key from DB and decrypt
// ---------------------------------------------------------------------------

/**
 * Reads the encrypted OpenRouter API key from the `openrouter_integration`
 * table via the admin Supabase client, decrypts it using the AES-256-GCM
 * encryption helper, and returns the plaintext key.
 *
 * @throws {Error} If no key is stored in the database or decryption fails.
 */
export async function getDecryptedApiKey(): Promise<string> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("openrouter_integration")
    .select("api_key_encrypted")
    .limit(1)
    .single<OpenRouterIntegrationRow>();

  if (error) {
    throw new Error(`Failed to read OpenRouter integration: ${error.message}`);
  }

  if (!data?.api_key_encrypted) {
    throw new Error(
      "No OpenRouter API key is stored in the database. Please configure one first."
    );
  }

  return decrypt(data.api_key_encrypted);
}

// ---------------------------------------------------------------------------
// chat — slot-based OpenRouter chat completions
// ---------------------------------------------------------------------------

/**
 * Loads the model/temperature/max_tokens for the given slot from the
 * `model_slots` table, then calls the OpenRouter chat completions API.
 *
 * Returns the raw fetch Response so the caller can handle streaming.
 *
 * @param params.slot       - "primary" or "brainstorm"
 * @param params.messages   - Chat messages in OpenAI-compatible format
 * @param params.stream     - Whether to request a streaming response
 */
export async function chat(params: ChatParams): Promise<Response> {
  const { slot, messages, stream = false } = params;

  // Load slot config from database
  const admin = createAdminClient();

  const { data: slotRow, error: slotError } = await admin
    .from("model_slots")
    .select("slot, model_id, temperature, max_tokens")
    .eq("slot", slot)
    .single<ModelSlotRow>();

  if (slotError) {
    throw new Error(`Failed to load model slot "${slot}": ${slotError.message}`);
  }

  if (!slotRow) {
    throw new Error(`No model slot configured for "${slot}".`);
  }

  // Decrypt the API key server-side
  const apiKey = await getDecryptedApiKey();

  // Call OpenRouter chat completions
  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://star.app",
      "X-Title": "STAR App",
    },
    body: JSON.stringify({
      model: slotRow.model_id,
      temperature: slotRow.temperature,
      max_tokens: slotRow.max_tokens,
      messages,
      stream,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const status = response.status;

    if (status === 401 || status === 403) {
      throw new Error(
        `OpenRouter auth failed (HTTP ${status}): API key is invalid or expired. ${body}`
      );
    }
    if (status === 429) {
      throw new Error(
        `OpenRouter rate limit exceeded (HTTP 429): ${body}`
      );
    }
    if (status === 400) {
      throw new Error(
        `OpenRouter request error (HTTP 400): ${body}`
      );
    }
    if (status === 402) {
      throw new Error(
        `OpenRouter billing error (HTTP 402): Insufficient credits. ${body}`
      );
    }
    throw new Error(
      `OpenRouter API error (HTTP ${status}): ${body}`
    );
  }

  return response;
}

// ---------------------------------------------------------------------------
// testConnection — validate an API key via GET /auth/key
// ---------------------------------------------------------------------------

/**
 * Validates an OpenRouter API key by calling the /auth/key endpoint.
 *
 * @param apiKey - The plaintext API key to test.
 * @returns Object with `ok`, optional `credits`, and optional `error`.
 */
export async function testConnection(
  apiKey: string
): Promise<TestConnectionResult> {
  try {
    const response = await fetch(`${OPENROUTER_BASE}/auth/key`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `API returned ${response.status}: ${await response.text()}`,
      };
    }

    const data = await response.json();

    return {
      ok: true,
      credits: data?.data?.limit_remaining ?? undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// listModels — fetch available models with 60-minute cache
// ---------------------------------------------------------------------------

/**
 * Fetches the list of available models from OpenRouter, with an in-memory
 * cache that expires after 60 minutes.
 *
 * @param apiKey - The plaintext API key for authentication.
 * @returns Array of model objects with id, name, context_length, and pricing.
 */
export async function listModels(apiKey: string): Promise<ModelInfo[]> {
  // Return cached results if still fresh
  if (modelCache && Date.now() - modelCache.timestamp < CACHE_TTL_MS) {
    return modelCache.models;
  }

  const response = await fetch(`${OPENROUTER_BASE}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const status = response.status;
    const body = await response.text().catch(() => "");

    if (status === 401 || status === 403) {
      throw new Error(`OpenRouter auth failed (HTTP ${status}): API key is invalid or expired.`);
    }
    if (status === 429) {
      throw new Error(`OpenRouter rate limit exceeded (HTTP 429) while fetching models.`);
    }
    throw new Error(`Failed to fetch OpenRouter models (HTTP ${status}): ${body}`);
  }

  const data = await response.json();

  // OpenRouter returns { data: [...] }
  const models: ModelInfo[] = (data?.data ?? []).map(
    (m: Record<string, unknown>) => {
      const pricing = m.pricing as Record<string, string> | undefined;
      return {
        id: String(m.id ?? ""),
        name: String(m.name ?? ""),
        context_length: Number(m.context_length ?? 0),
        pricing: {
          prompt: String(pricing?.prompt ?? "0"),
          completion: String(pricing?.completion ?? "0"),
        },
      };
    }
  );

  // Update cache
  modelCache = { timestamp: Date.now(), models };

  return models;
}