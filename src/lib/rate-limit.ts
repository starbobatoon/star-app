import { RateLimiterMemory } from "rate-limiter-flexible";

// Login rate limiter: 5 attempts per minute per IP
export const loginRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
  blockDuration: 60,
});

// Speech submission rate limiter: 10 per minute per IP
export const speechRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
  blockDuration: 60,
});

// Brainstorm rate limiter: 15 per minute per IP
export const brainstormRateLimiter = new RateLimiterMemory({
  points: 15,
  duration: 60,
  blockDuration: 60,
});

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

/**
 * Checks rate limit and returns a 429 Response if exceeded, or null if allowed.
 */
export async function checkRateLimit(
  limiter: RateLimiterMemory,
  key: string
): Promise<Response | null> {
  try {
    await limiter.consume(key);
    return null;
  } catch {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}