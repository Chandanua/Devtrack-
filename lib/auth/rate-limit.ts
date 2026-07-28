import { NextResponse } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * In-memory sliding window rate limiter keyed by IP address.
 * 
 * NOTE: This in-memory rate limiter needs to move to Redis (or another shared key-value store)
 * before any multi-instance or serverless deployment.
 */
const ipStore = new Map<string, RateLimitRecord>();

export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }
  return '127.0.0.1';
}

export function checkRateLimit(
  ip: string,
  limit = 5,
  windowSeconds = 60
): { success: boolean; retryAfter: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let record = ipStore.get(ip);
  if (!record) {
    record = { timestamps: [] };
    ipStore.set(ip, record);
  }

  // Filter timestamps to only keep those within the sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return { success: false, retryAfter: Math.max(1, retryAfter) };
  }

  record.timestamps.push(now);
  return { success: true, retryAfter: 0 };
}
