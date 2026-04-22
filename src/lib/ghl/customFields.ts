/**
 * @module ghl/customFields
 * @description GoHighLevel custom field listing — fetches all custom fields
 * for a given location, used by the admin mapping screen.
 *
 * IMPORTANT: Server-only.
 */

import "server-only";
import { getGhlHeaders, getGhlBaseUrl } from "./auth";

const GHL_API_BASE = getGhlBaseUrl();

interface GhlCustomField {
  id: string;
  name: string;
  fieldKey: string;
  dataType: string;
}

interface GhlCustomFieldsResponse {
  customFields: GhlCustomField[];
}

/**
 * Lists all custom fields for a GHL location.
 *
 * Used by the admin integration screen to populate the field mapping dropdowns.
 *
 * @param locationId - The GHL location ID to fetch custom fields for.
 * @returns Array of custom field descriptors.
 * @throws {Error} If the GHL API call fails.
 */
export async function listCustomFields(
  locationId: string
): Promise<Array<{ id: string; name: string; fieldKey: string; dataType: string }>> {
  if (!locationId) {
    throw new Error("locationId is required to list custom fields.");
  }

  const headers = await getGhlHeaders();

  const url = `${GHL_API_BASE}/locations/${encodeURIComponent(locationId)}/customFields`;
  const res = await fetch(url, { method: "GET", headers });

  if (!res.ok) {
    // 429 rate limit
    if (res.status === 429) {
      throw new Error(
        "GHL API rate limit exceeded while fetching custom fields. Please try again in a moment."
      );
    }

    const body = await res.text();
    throw new Error(
      `GHL custom fields fetch failed (HTTP ${res.status}): ${body}`
    );
  }

  const data: GhlCustomFieldsResponse = await res.json();
  const fields = data.customFields ?? [];

  return fields.map((f) => ({
    id: f.id,
    name: f.name,
    fieldKey: f.fieldKey,
    dataType: f.dataType,
  }));
}