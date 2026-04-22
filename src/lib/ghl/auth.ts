/**
 * @module ghl/auth
 * @description GoHighLevel API authentication — decrypts the Private Integration
 * Token (PIT) from the database and constructs authorization headers.
 *
 * IMPORTANT: This module uses Node.js crypto (via encryption.ts) and the
 * Supabase admin client. Server-only.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-04-15";

interface GhlIntegrationRow {
  id: string;
  pit_encrypted: string;
  location_id: string;
  updated_at: string;
}

/**
 * Reads the encrypted PIT from the ghl_integration table, decrypts it,
 * and returns the authorization headers for GHL API v2 calls.
 *
 * @returns {Promise<Record<string, string>>} Headers with Authorization, Version, and Content-Type.
 * @throws {Error} If no GHL integration record exists or decryption fails.
 */
export async function getGhlHeaders(): Promise<Record<string, string>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ghl_integration")
    .select("id, pit_encrypted, location_id, updated_at")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read GHL integration from database: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "No GHL integration configured. Set up the GHL connection in /admin/ghl-integration."
    );
  }

  const row = data as GhlIntegrationRow;

  let pit: string;
  try {
    pit = decrypt(row.pit_encrypted);
  } catch (err) {
    throw new Error(
      `Failed to decrypt GHL PIT: ${err instanceof Error ? err.message : String(err)}. ` +
      "The ENCRYPTION_KEY may differ from the one used when the token was saved."
    );
  }

  if (!pit) {
    throw new Error("Decrypted GHL PIT is empty. Re-save the integration token in /admin/ghl-integration.");
  }

  return {
    Authorization: `Bearer ${pit}`,
    Version: GHL_API_VERSION,
    "Content-Type": "application/json",
  };
}

/**
 * Returns the GHL location ID from the integration record.
 * Useful for endpoints that require a locationId query param.
 */
export async function getGhlLocationId(): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ghl_integration")
    .select("location_id")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read GHL location ID: ${error.message}`);
  }

  if (!data || !data.location_id) {
    throw new Error(
      "No GHL location ID configured. Set up the GHL connection in /admin/ghl-integration."
    );
  }

  return data.location_id;
}

/**
 * Returns the base URL for the GHL API.
 */
export function getGhlBaseUrl(): string {
  return GHL_API_BASE;
}