import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!ratelimit) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
      analytics: true,
    });
  }
  return ratelimit;
}

export async function checkRateLimit(identifier: string): Promise<{ success: boolean; limit: number; remaining: number }> {
  const rl = getRatelimit();
  if (!rl) {
    // Rate limiting not configured — allow all requests (dev mode)
    return { success: true, limit: 10, remaining: 10 };
  }

  const result = await rl.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
  };
}
// Dedicated checkout limiter: 10 attempts per hour per user/IP.
// If Redis is not configured, requests are allowed, matching checkRateLimit's
// existing fail-open behavior in development.
let checkoutRatelimit: Ratelimit | null = null;

export const checkoutLimiter = {
  async limit(identifier: string): Promise<{ success: boolean; reset: number }> {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return { success: true, reset: Date.now() + 60 * 60 * 1000 };
    }

    if (!checkoutRatelimit) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      checkoutRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: true,
        prefix: "checkout-ratelimit",
      });
    }

    const result = await checkoutRatelimit.limit(identifier);
    return { success: result.success, reset: result.reset };
  },
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitResponse(reset: number): Response {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

  return Response.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many checkout attempts. Please try again later.",
      },
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    }
  );
}