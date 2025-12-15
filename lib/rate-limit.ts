import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limiter implementation using sliding window algorithm
 */
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

class RateLimiter {
    private limits: Map<string, RateLimitEntry> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Cleanup old entries every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Check if a request should be rate limited
     * @param key - Unique identifier (IP address, email, etc.)
     * @param limit - Maximum number of requests allowed
     * @param windowMs - Time window in milliseconds
     * @returns true if rate limit exceeded, false otherwise
     */
    isRateLimited(key: string, limit: number, windowMs: number): boolean {
        const now = Date.now();
        const entry = this.limits.get(key);

        if (!entry || now > entry.resetAt) {
            // No entry or entry expired, create new one
            this.limits.set(key, {
                count: 1,
                resetAt: now + windowMs,
            });
            return false;
        }

        // Entry exists and not expired
        if (entry.count >= limit) {
            return true; // Rate limit exceeded
        }

        // Increment count
        entry.count++;
        this.limits.set(key, entry);
        return false;
    }

    /**
     * Get remaining requests for a key
     */
    getRemaining(key: string, limit: number): number {
        const entry = this.limits.get(key);
        if (!entry || Date.now() > entry.resetAt) {
            return limit;
        }
        return Math.max(0, limit - entry.count);
    }

    /**
     * Get time until reset in seconds
     */
    getResetTime(key: string): number {
        const entry = this.limits.get(key);
        if (!entry || Date.now() > entry.resetAt) {
            return 0;
        }
        return Math.ceil((entry.resetAt - Date.now()) / 1000);
    }

    /**
     * Manually reset a key's rate limit
     */
    reset(key: string): void {
        this.limits.delete(key);
    }

    /**
     * Cleanup expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.limits.entries()) {
            if (now > entry.resetAt) {
                this.limits.delete(key);
            }
        }
    }

    /**
     * Destroy the rate limiter and cleanup interval
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.limits.clear();
    }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
    // Login attempts: 5 per 15 minutes per IP
    LOGIN_IP: { limit: 5, windowMs: 15 * 60 * 1000 },
    // Login attempts: 3 per 15 minutes per email
    LOGIN_EMAIL: { limit: 3, windowMs: 15 * 60 * 1000 },
    // API calls: 100 per minute per IP
    API_GENERAL: { limit: 100, windowMs: 60 * 1000 },
    // Password reset: 3 per hour per email
    PASSWORD_RESET: { limit: 3, windowMs: 60 * 60 * 1000 },
};

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
    // Check various headers for real IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIp) {
        return realIp;
    }
    if (cfIp) {
        return cfIp;
    }

    // Fallback to connection remote address (less reliable in production)
    return 'unknown';
}

/**
 * Check rate limit and return response if exceeded
 * @returns NextResponse with 429 status if rate limited, null otherwise
 */
export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
    identifier?: string
): NextResponse | null {
    if (rateLimiter.isRateLimited(key, limit, windowMs)) {
        const resetTime = rateLimiter.getResetTime(key);
        return NextResponse.json(
            {
                error: 'Too many requests',
                message: `Rate limit exceeded. Please try again in ${resetTime} seconds.`,
                retryAfter: resetTime,
            },
            {
                status: 429,
                headers: {
                    'Retry-After': resetTime.toString(),
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': Math.floor(Date.now() / 1000 + resetTime).toString(),
                },
            }
        );
    }

    return null;
}

/**
 * Apply rate limit to a request handler
 */
export async function withRateLimit(
    request: NextRequest,
    config: { limit: number; windowMs: number },
    keyPrefix: string,
    keyValue?: string
): Promise<NextResponse | null> {
    const key = keyValue
        ? `${keyPrefix}:${keyValue}`
        : `${keyPrefix}:${getClientIp(request)}`;

    return checkRateLimit(key, config.limit, config.windowMs);
}

/**
 * Get rate limit headers for a key
 */
export function getRateLimitHeaders(
    key: string,
    limit: number
): Record<string, string> {
    const remaining = rateLimiter.getRemaining(key, limit);
    const resetTime = rateLimiter.getResetTime(key);

    return {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.floor(Date.now() / 1000 + resetTime).toString(),
    };
}

/**
 * Reset rate limit for a specific key (useful after successful auth)
 */
export function resetRateLimit(key: string): void {
    rateLimiter.reset(key);
}

export default rateLimiter;
