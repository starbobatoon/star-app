/**
 * @module ghl
 * @description GoHighLevel API v2 client — re-exports all GHL modules
 * for convenient imports.
 *
 * Usage:
 * ```ts
 * import { upsertByEmail, uploadMedia, triggerWorkflow } from "@/lib/ghl";
 * ```
 *
 * All modules are server-only. GHL credentials are read from the database,
 * not from environment variables.
 */

export { getGhlHeaders, getGhlLocationId, getGhlBaseUrl } from "./auth";
export { upsertByEmail } from "./contacts";
export type { UpsertByEmailParams, UpsertByEmailResult } from "./contacts";
export { listCustomFields } from "./customFields";
export { uploadMedia } from "./media";
export { triggerWorkflow } from "./workflows";

// Re-export types explicitly to avoid "declares locally but is not exported" errors
// with server-only modules under moduleResolution: "bundler"
export type { UploadMediaParams } from "./media";
export type { TriggerWorkflowParams } from "./workflows";