/**
 * @jest-environment node
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { encrypt, decrypt } from "../encryption";

const TEST_KEY = "a18d91caf85f4473c829e93d629f637c3824e5519e9ff50799504939b33d025d";
const ORIGINAL_ENV = process.env.ENCRYPTION_KEY;

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  // Restore key between tests that modify env
  process.env.ENCRYPTION_KEY = ORIGINAL_ENV ?? TEST_KEY;
});

describe("encrypt()", () => {
  it("produces a different ciphertext each time (different IV)", () => {
    const plaintext = "test-secret-value";
    const c1 = encrypt(plaintext);
    const c2 = encrypt(plaintext);
    expect(c1).not.toEqual(c2);
  });

  it("throws a clear error if ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("hello")).toThrow(/ENCRYPTION_KEY is not set/);
  });

  it("throws a clear error if ENCRYPTION_KEY is wrong length", () => {
    process.env.ENCRYPTION_KEY = "tooshort";
    expect(() => encrypt("hello")).toThrow(/64 hex characters/);
  });

  it("throws a clear error if ENCRYPTION_KEY contains non-hex chars", () => {
    process.env.ENCRYPTION_KEY = "z".repeat(64);
    expect(() => encrypt("hello")).toThrow(/64 hex characters/);
  });
});

describe("decrypt()", () => {
  it("round-trips: decrypt(encrypt(plaintext)) === plaintext", () => {
    const plaintext = "my-ghl-private-token-12345";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(plaintext);
  });

  it("round-trips with special characters and unicode", () => {
    const plaintext = "p@ssw0rd! 🔒 日本語テスト";
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toEqual(plaintext);
  });

  it("round-trips with an empty string", () => {
    const plaintext = "";
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toEqual(plaintext);
  });

  it("throws if ENCRYPTION_KEY is missing", () => {
    const encrypted = encrypt("test");
    delete process.env.ENCRYPTION_KEY;
    expect(() => decrypt(encrypted)).toThrow(/ENCRYPTION_KEY is not set/);
  });

  it("throws if ciphertext is malformed (too short)", () => {
    // base64 of just a few bytes — not enough for IV + authTag
    const malformed = Buffer.from("short").toString("base64");
    expect(() => decrypt(malformed)).toThrow(/Malformed ciphertext/);
  });

  it("throws if ciphertext is not valid base64", () => {
    // Base64 silently ignores invalid chars, so the result is just too short
    expect(() => decrypt("!!!not-base64!!!")).toThrow(/Malformed ciphertext/);
  });

  it("throws if ENCRYPTION_KEY differs from encryption key", () => {
    const encrypted = encrypt("secret");
    process.env.ENCRYPTION_KEY = "b18d91caf85f4473c829e93d629f637c3824e5519e9ff50799504939b33d025d";
    expect(() => decrypt(encrypted)).toThrow(/Decryption failed/);
  });
});