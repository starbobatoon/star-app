import "server-only";

import { createAdminClient } from "./supabase/admin";

/**
 * Represents a single audit log entry to be recorded.
 *
 * @property actorEmail   - Email of the user performing the action (omitted for system actions).
 * @property action       - Verb describing what happened, e.g. "create", "update", "delete".
 * @property entityType   - The table/collection the action targets, e.g. "prompts".
 * @property entityId     - Optional identifier of the affected record.
 * @property beforeValue  - Snapshot of the record before the mutation (for updates/deletes).
 * @property afterValue   - Snapshot of the record after the mutation (for creates/updates).
 */
export interface AuditLogEntry {
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
}

/**
 * Writes an audit log entry to the `audit_log` table.
 *
 * Uses the admin Supabase client which bypasses RLS, so this function
 * is safe to call from server-side code acting on behalf of an admin.
 * The `server-only` import ensures this module can never leak to the client.
 *
 * @param entry - The audit log entry to persist.
 * @throws Re-throws any database insert error after logging to stderr.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("audit_log").insert({
    actor_email: entry.actorEmail ?? null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    before_value: entry.beforeValue ?? null,
    after_value: entry.afterValue ?? null,
  });

  if (error) {
    console.error("[audit-log] Failed to write audit entry:", error);
    throw error;
  }
}