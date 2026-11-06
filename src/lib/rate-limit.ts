/**
 * @module rate-limit
 * @description Distributed rate limiting for API routes.
 *
 * The previous implementation used RateLimiterMemory, which keeps
 * counters in a single process's memory. On Vercel every serverless
 * invocation may run in a fresh instance, so the limiter effectively
 * never triggered and a bot could submit speeches (spending real
 * LLM/TTS credits) without limit.
 *
 * Primary backend: a Postgres function `consume_rate_limit` in
 * Supabase (migration 014), which atomically consumes a point in a
 * fixed window. All instances share the same counters, so limits
 * hold across the whole deployment.
 *
 * Fallback: if the RPC is unavailable because migration 014 has not
 * been applied yet (function missing) or Supabase errors, we fall
 * back to the in-memory limiter for this process and log loudly.
 * The app never breaks because of rate limiting, and once the
 * migration is applied the distributed limiter takes over with no
 * code change.
 */

import "server-only";

import { RateLimiterMemory } from "rate-limiter-flexible";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitConfig {
  /** Key namespace, e.g. "speech" — combined with the caller key. */
  name: string;
  /** Max requests allowed per window. */
  points: number;
  /** Window length in seconds. */
  duration: number;
  /** How long (seconds) a key stays blocked once the budget is spent. */
  blockDuration: number;
}

// Login rate limiter: 5 attempts per minute per IP
export const loginRateLimiter: RateLimitConfig = {
  name: "login",
  points: 5,
  duration: 60,
  blockDuration: 60,
};

// Speech submission rate limiter: 10 per minute per IP
export const speechRateLimiter: RateLimitConfig = {
  name: "speech",
  points: 10,
  duration: 60,
  blockDuration: 60,
};

// Speech submission per-email cap: 5 per hour per email address.
// Blunts scripted abuse that rotates IPs but reuses one inbox,
// and stops one inbox from being flooded with speeches.
export const speechEmailRateLimiter: RateLimitConfig = {
  name: "speech_email",
  points: 5,
  duration: 3600,
  blockDuration: 3600,
};

// Brainstorm rate limiter: 15 per minute per IP
export const brainstormRateLimiter: RateLimitConfig = {
  name: "brainstorm",
  points: 15,
  duration: 60,
  blockDuration: 60,
};

// Forgot-password rate limiter: 5 per minute per IP
export const forgotPasswordRateLimiter: RateLimitConfig = {
  name: "forgot_password",
  points: 5,
  duration: 60,
  blockDuration: 60,
};

// Email-verification request limiters. Verification emails cost money
// and can be abused to bomb a third-party inbox, so both the caller's
// IP and the target email are capped.
export const verificationIpRateLimiter: RateLimitConfig = {
  name: "verify_email_ip",
  points: 10,
  duration: 3600,
  blockDuration: 3600,
};

export const verificationEmailRateLimiter: RateLimitConfig = {
  name: "verify_email",
  points: 3,
  duration: 3600,
  blockDuration: 3600,
};

/**
 * Extracts the client IP from a request, accounting for proxies.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// In-memory fallback (used only until migration 014 is applied)
// ---------------------------------------------------------------------------

const memoryLimiters = new Map<string, RateLimiterMemory>();

function getMemoryLimiter(config: RateLimitConfig): RateLimiterMemory {
  let limiter = memoryLimiters.get(config.name);
  if (!limiter) {
    limiter = new RateLimiterMemory({
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration,
    });
    memoryLimiters.set(config.name, limiter);
  }
  return limiter;
}

let distributedUnavailable = false;
let fallbackWarned = false;

async function consumeFromDistributed(
  config: RateLimitConfig,
  key: string
): Promise<boolean | null> {
  if (distributedUnavailable) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_key: `${config.name}:${key}`,
      p_points: config.points,
      p_duration_seconds: config.duration,
      p_block_seconds: config.blockDuration,
    });
    if (error) {
      // PGRST202 / 42883 = function does not exist → migration 014 not
      // applied yet. Any other error is treated the same way for this
      // process: fall back rather than fail the request.
      distributedUnavailable = true;
      if (!fallbackWarned) {
        fallbackWarned = true;
        console.error(
          "[rate-limit] Supabase consume_rate_limit unavailable " +
            `(${error.code ?? "error"}: ${error.message}). ` +
            "Falling back to per-instance in-memory limiting. " +
            "Apply supabase/migrations/014_security_and_ghl_retry.sql " +
            "to enable distributed rate limiting."
        );
      }
      return null;
    }
    return data === true;
  } catch (err) {
    distributedUnavailable = true;
    if (!fallbackWarned) {
      fallbackWarned = true;
      console.error(
        "[rate-limit] Distributed rate limit check threw; falling back to in-memory limiting.",
        err
      );
    }
    return null;
  }
}

/**
 * Consumes one point for `key` under `config`.
 * Returns true when the request is allowed, false when limited.
 */
export async function consumeRateLimit(
  config: RateLimitConfig,
  key: string
): Promise<boolean> {
  const distributed = await consumeFromDistributed(config, key);
  if (distributed !== null) return distributed;
  try {
    await getMemoryLimiter(config).consume(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks rate limit and returns a 429 Response if exceeded, or null if allowed.
 */
export async function checkRateLimit(
  config: RateLimitConfig,
  key: string
): Promise<Response | null> {
  const allowed = await consumeRateLimit(config, key);
  if (allowed) return null;
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(config.blockDuration),
      },
    }
  );
}
