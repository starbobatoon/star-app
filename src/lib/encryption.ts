/**
 * @module encryption
 * @description Symmetric encryption helpers using AES-256-GCM.
 *
 * IMPORTANT: This module uses Node.js `crypto` and must only run server-side.
 * Never import this from a client component.
 *
 * The ENCRYPTION_KEY environment variable must be a 64-character hex string
 * (32 bytes). Generate one with: `openssl rand -hex 32`
 *
 * Encrypted output format (base64): IV (12 bytes) | AuthTag (16 bytes) | Ciphertext
 */

import { createCipheriv, createDecipheriv, randomBytes, getRandomValues } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Validates that the ENCRYPTION_KEY environment variable is present and
 * exactly 32 bytes (64 hex characters).
 * @throws {Error} If the key is missing or the wrong length.
 */
function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Add a 64-character hex string to your .env.local."
    );
  }
  if (keyHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got ${keyHex.length} characters.`
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * The output is a base64-encoded string containing the IV, authentication tag,
 * and ciphertext concatenated together. A fresh random IV is generated for
 * every call, so encrypting the same plaintext twice produces different output.
 *
 * @param plaintext - The string to encrypt.
 * @returns Base64-encoded string: IV (12 bytes) | AuthTag (16 bytes) | Ciphertext.
 * @throws {Error} If ENCRYPTION_KEY is missing or invalid.
 *
 * @example
 * ```ts
 * // Server-side only
 * import { encrypt } from "@/lib/encryption";
 * const cipher = encrypt("my-secret-value");
 * ```
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Concatenate: IV | AuthTag | Ciphertext, then base64-encode
  const result = Buffer.concat([iv, authTag, encrypted]);
  return result.toString("base64");
}

/**
 * Decrypts a base64-encoded ciphertext string that was produced by {@link encrypt}.
 *
 * @param encoded - Base64-encoded string: IV (12 bytes) | AuthTag (16 bytes) | Ciphertext.
 * @returns The original plaintext string.
 * @throws {Error} If ENCRYPTION_KEY is missing or invalid, or if the ciphertext is malformed.
 *
 * @example
 * ```ts
 * // Server-side only
 * import { decrypt } from "@/lib/encryption";
 * const plain = decrypt(cipherText);
 * ```
 */
export function decrypt(encoded: string): string {
  const key = getKey();

  let combined: Buffer;
  try {
    combined = Buffer.from(encoded, "base64");
  } catch {
    throw new Error("Failed to decode ciphertext: invalid base64.");
  }

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error(
      `Malformed ciphertext: expected at least ${IV_LENGTH + AUTH_TAG_LENGTH} bytes, got ${combined.length}.`
    );
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted: Buffer;
  try {
    decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
  } catch (err) {
    throw new Error(
      `Decryption failed: ${err instanceof Error ? err.message : String(err)}. The ciphertext may be corrupted or the ENCRYPTION_KEY may differ from the one used to encrypt.`
    );
  }

  return decrypted.toString("utf8");
}