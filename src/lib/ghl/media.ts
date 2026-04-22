/**
 * @module ghl/media
 * @description GoHighLevel media upload — uploads files to the GHL Media Library.
 *
 * IMPORTANT: Server-only. Uses the GHL auth module which reads from the database.
 */

import "server-only";
import { getGhlHeaders, getGhlLocationId, getGhlBaseUrl } from "./auth";

const GHL_API_BASE = getGhlBaseUrl();

export interface UploadMediaParams {
  file: Buffer | Blob;
  fileName: string;
  contentType: string;
}

interface GhlMediaUploadResponse {
  url: string;
  id?: string;
}

/**
 * Uploads a file to the GHL Media Library and returns the public URL.
 *
 * GHL expects a multipart/form-data POST to the media upload endpoint.
 * The returned URL is stored in the speech record and can be written back
 * to the contact's custom fields.
 *
 * @param params - The file buffer/blob, file name, and content type.
 * @returns The public URL of the uploaded media.
 * @throws {Error} If the upload fails.
 */
export async function uploadMedia(
  params: UploadMediaParams
): Promise<{ url: string }> {
  const headers = await getGhlHeaders();
  const locationId = await getGhlLocationId();

  // Build multipart form data
  const formData = new FormData();

  if (params.file instanceof Blob) {
    formData.append("file", params.file, params.fileName);
  } else {
    // Buffer → Blob for FormData
    const blob = new Blob([new Uint8Array(params.file)], { type: params.contentType });
    formData.append("file", blob, params.fileName);
  }

  formData.append("name", params.fileName);

  // Remove Content-Type from headers so fetch sets the multipart boundary
  const { "Content-Type": _ct, ...uploadHeaders } = headers;

  const url = `${GHL_API_BASE}/locations/${encodeURIComponent(locationId)}/media/upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: uploadHeaders as Record<string, string>,
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        "GHL API rate limit exceeded while uploading media. Please try again in a moment."
      );
    }

    const body = await res.text();
    throw new Error(
      `GHL media upload failed (HTTP ${res.status}): ${body}`
    );
  }

  const data: GhlMediaUploadResponse = await res.json();

  if (!data.url) {
    throw new Error(
      `GHL media upload succeeded but returned no URL. Response: ${JSON.stringify(data)}`
    );
  }

  return { url: data.url };
}