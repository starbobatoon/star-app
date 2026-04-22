/**
 * @module ghl/contacts
 * @description GoHighLevel contact upsert — searches by email, then creates
 * or updates the contact and sets custom fields.
 *
 * IMPORTANT: Server-only. Uses the GHL auth module which reads from the database.
 */

import "server-only";
import { getGhlHeaders, getGhlBaseUrl } from "./auth";

const GHL_API_BASE = getGhlBaseUrl();

interface GhlContactSearchResult {
  contacts: Array<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>;
  total: number;
}

export interface UpsertByEmailParams {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  customFields?: Record<string, string>;
}

export interface UpsertByEmailResult {
  contactId: string;
  created: boolean;
}

/**
 * Searches GHL contacts by email. Returns the first matching contact or null.
 */
async function searchContactByEmail(
  email: string,
  headers: Record<string, string>
): Promise<{ id: string } | null> {
  const url = `${GHL_API_BASE}/contacts/?query=${encodeURIComponent(email)}`;
  const res = await fetch(url, { method: "GET", headers });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GHL contact search failed (HTTP ${res.status}): ${body}`
    );
  }

  const data: GhlContactSearchResult = await res.json();

  if (data.total > 0 && data.contacts.length > 0) {
    // Find an exact email match (GHL search may return partial matches)
    const exact = data.contacts.find(
      (c) => c.email.toLowerCase() === email.toLowerCase()
    );
    if (exact) {
      return { id: exact.id };
    }
  }

  return null;
}

/**
 * Creates a new GHL contact with the given fields and custom fields.
 */
async function createContact(
  params: UpsertByEmailParams,
  headers: Record<string, string>
): Promise<string> {
  const body: Record<string, unknown> = {
    email: params.email,
  };

  if (params.firstName) body.firstName = params.firstName;
  if (params.lastName) body.lastName = params.lastName;
  if (params.phone) body.phone = params.phone;
  if (params.customFields && Object.keys(params.customFields).length > 0) {
    body.customFields = params.customFields;
  }

  const res = await fetch(`${GHL_API_BASE}/contacts/`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL contact create failed (HTTP ${res.status}): ${text}`);
  }

  const result = await res.json();
  const contactId = result.contact?.id ?? result.id;
  if (!contactId) {
    throw new Error(
      `GHL contact create returned no ID. Response: ${JSON.stringify(result)}`
    );
  }

  return contactId;
}

/**
 * Updates an existing GHL contact with the given fields and custom fields.
 */
async function updateContact(
  contactId: string,
  params: UpsertByEmailParams,
  headers: Record<string, string>
): Promise<void> {
  const body: Record<string, unknown> = {};

  if (params.firstName) body.firstName = params.firstName;
  if (params.lastName) body.lastName = params.lastName;
  if (params.phone) body.phone = params.phone;
  if (params.customFields && Object.keys(params.customFields).length > 0) {
    body.customFields = params.customFields;
  }

  // Skip update if nothing to patch
  if (Object.keys(body).length === 0) return;

  const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `GHL contact update failed (HTTP ${res.status}): ${text}`
    );
  }
}

/**
 * Upserts a GHL contact by email. If a contact with the given email exists,
 * it is updated; otherwise a new contact is created.
 *
 * Custom fields are set on both create and update paths.
 *
 * @param params - Contact data including email, name, phone, and custom fields.
 * @returns The GHL contact ID and whether the contact was newly created.
 * @throws {Error} If the GHL API call fails.
 */
export async function upsertByEmail(
  params: UpsertByEmailParams
): Promise<UpsertByEmailResult> {
  if (!params.email) {
    throw new Error("Email is required for GHL contact upsert.");
  }

  const headers = await getGhlHeaders();

  // Search for existing contact by email
  const existing = await searchContactByEmail(params.email, headers);

  if (existing) {
    // Update existing contact
    await updateContact(existing.id, params, headers);
    return { contactId: existing.id, created: false };
  }

  // Create new contact
  const contactId = await createContact(params, headers);
  return { contactId, created: true };
}