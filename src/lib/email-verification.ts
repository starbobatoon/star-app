/**
 * @module email-verification
 * @description Stateless email-ownership verification for public
 * speech submissions.
 *
 * Why: the public compose page used to accept any email address and
 * immediately spend LLM/TTS credits, push the address into
 * GoHighLevel as a contact, and trigger GHL workflow emails to it.
 * Anyone could submit speeches under someone else's email — spam
 * complaints and sender-reputation damage for Star's GHL account.
 *
 * How: before a public (anonymous) speech is created, the submitter
 * must prove they control the inbox:
 *   1. POST /api/speeches/verify-email sends a confirmation link
 *      (via Resend) containing a signed token.
 *   2. The link returns to /compose?verify=<token>; the compose page
 *      stores the token and includes it in the final submission.
 *   3. POST /api/speeches validates the token: signature, expiry,
 *      and that the token's email matches the submitted contact email.
 *
 * Tokens are HMAC-SHA256 signed with the existing ENCRYPTION_KEY, so
 * verification needs no new database table, no new third-party
 * service, and works across serverless instances. Tokens expire
 * after 30 minutes.
 *
 * IMPORTANT: Server-only in practice — it uses Node crypto and the
 * ENCRYPTION_KEY server secret, and is only imported by API routes.
 * (No `server-only` import marker, matching encryption.ts, so the
 * module stays unit-testable under vitest.)
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 30 * 60; // 30 minutes

interface TokenPayload {
  /** Email address (lowercased) the token was issued for. */
  e: string;
  /** Expiry, unix seconds. */
  exp: number;
}

function getSigningKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      "ENCRYPTION_KEY must be set to a 64-character hex string to sign verification tokens."
    );
  }
  return Buffer.from(keyHex, "hex");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSigningKey())
    .update(payloadB64)
    .digest("base64url");
}

/**
 * Creates a signed verification token for an email address.
 */
export function createVerificationToken(email: string): string {
  const payload: TokenPayload = {
    e: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  return `${payloadB64}.${sign(payloadB64)}`;
}

export interface VerificationResult {
  valid: boolean;
  email?: string;
  error?: string;
}

/**
 * Validates a verification token. When `expectedEmail` is provided,
 * the token must have been issued for that exact address.
 */
export function verifyVerificationToken(
  token: string,
  expectedEmail?: string
): VerificationResult {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing verification token" };
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed verification token" };
  }
  const [payloadB64, signature] = parts;

  let expectedSignature: string;
  try {
    expectedSignature = sign(payloadB64);
  } catch (err) {
    console.error("[email-verification] Signing key unavailable:", err);
    return { valid: false, error: "Verification unavailable" };
  }

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return { valid: false, error: "Invalid verification token" };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as TokenPayload;
  } catch {
    return { valid: false, error: "Malformed verification token" };
  }

  if (!payload.e || typeof payload.exp !== "number") {
    return { valid: false, error: "Malformed verification token" };
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, error: "Verification link has expired" };
  }
  if (
    expectedEmail &&
    payload.e !== expectedEmail.trim().toLowerCase()
  ) {
    return {
      valid: false,
      error: "Verification token was issued for a different email address",
    };
  }
  return { valid: true, email: payload.e };
}
