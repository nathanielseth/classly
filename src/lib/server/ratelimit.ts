import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

if (!hasUpstashConfig) {
  console.warn(
    "[ratelimit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set - " +
      "AI rate limiting is disabled (fail-open). Set both env vars to enable it.",
  );
}

const realRatelimit = hasUpstashConfig
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, "10 m"),
      prefix: "classly:ai",
      analytics: true,
    })
  : null;

interface RatelimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export const aiRatelimit = {
  limit: async (identifier: string): Promise<RatelimitResult> => {
    if (!realRatelimit) {
      return { success: true, remaining: Infinity, reset: Date.now() };
    }
    return realRatelimit.limit(identifier);
  },
};