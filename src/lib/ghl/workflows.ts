/**
 * @module ghl/workflows
 * @description GoHighLevel workflow trigger — fires a GHL email workflow
 * by subscribing a contact to it.
 *
 * IMPORTANT: Server-only. Uses the GHL auth module which reads from the database.
 */

import "server-only";
import { getGhlHeaders, getGhlBaseUrl } from "./auth";

const GHL_API_BASE = getGhlBaseUrl();

import type { TriggerWorkflowParams } from "./types";
export type { TriggerWorkflowParams };

/**
 * Triggers a GHL workflow by subscribing a contact to it.
 *
 * This is the standard way to fire email workflows in GHL v2: POST to
 * /workflows/{workflowId}/subscriptions with the contact ID. GHL will
 * execute the workflow steps (send email, apply tags, etc.) for that contact.
 *
 * @param params - The workflow ID and contact ID.
 * @throws {Error} If the workflow trigger fails.
 */
export async function triggerWorkflow(
  params: TriggerWorkflowParams
): Promise<void> {
  if (!params.workflowId) {
    throw new Error("workflowId is required to trigger a GHL workflow.");
  }
  if (!params.contactId) {
    throw new Error("contactId is required to trigger a GHL workflow.");
  }

  const headers = await getGhlHeaders();

  const url = `${GHL_API_BASE}/workflows/${encodeURIComponent(params.workflowId)}/subscriptions`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contactId: params.contactId,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        "GHL API rate limit exceeded while triggering workflow. Please try again in a moment."
      );
    }

    const body = await res.text();
    throw new Error(
      `GHL workflow trigger failed (HTTP ${res.status}): ${body}`
    );
  }
}