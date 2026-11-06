import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  createVerificationToken,
  verifyVerificationToken,
} from "@/lib/email-verification";

beforeAll(() => {
  // 64-char hex key, same shape as production ENCRYPTION_KEY
  process.env.ENCRYPTION_KEY = "ab".repeat(32);
});

describe("email verification tokens", () => {
  it("round-trips a valid token", () => {
    const token = createVerificationToken("User@Example.com");
    const result = verifyVerificationToken(token, "user@example.com");
    expect(result.valid).toBe(true);
    expect(result.email).toBe("user@example.com");
  });

  it("rejects a token issued for a different email", () => {
    const token = createVerificationToken("owner@example.com");
    const result = verifyVerificationToken(token, "victim@example.com");
    expect(result.valid).toBe(false);
  });

  it("rejects a tampered payload", () => {
    const token = createVerificationToken("owner@example.com");
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({
        e: "victim@example.com",
        exp: Math.floor(Date.now() / 1000) + 600,
      })
    ).toString("base64url");
    const result = verifyVerificationToken(
      `${forgedPayload}.${signature}`,
      "victim@example.com"
    );
    expect(result.valid).toBe(false);
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    try {
      const token = createVerificationToken("owner@example.com");
      vi.advanceTimersByTime(31 * 60 * 1000);
      const result = verifyVerificationToken(token, "owner@example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/expired/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects garbage input", () => {
    expect(verifyVerificationToken("").valid).toBe(false);
    expect(verifyVerificationToken("not-a-token").valid).toBe(false);
    expect(verifyVerificationToken("a.b.c").valid).toBe(false);
  });
});
