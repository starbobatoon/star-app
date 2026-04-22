/**
 * @module ghl/types
 * @description Shared GHL type definitions — safe for both client and server imports.
 */

export interface UploadMediaParams {
  file: Buffer | Blob;
  fileName: string;
  contentType: string;
}

export interface TriggerWorkflowParams {
  contactId: string;
  workflowId: string;
}