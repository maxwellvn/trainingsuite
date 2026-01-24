import Redis from 'ioredis';

// Redis connection singleton
let redisClient: Redis | null = null;

/**
 * Get Redis client instance (singleton pattern)
 * Returns null if Redis is not configured
 */
export function getRedisClient(): Redis | null {
  // If Redis URL is not set, return null (graceful degradation)
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          // Exponential backoff with max 30 seconds
          const delay = Math.min(times * 100, 30000);
          return delay;
        },
        lazyConnect: true,
      });

      redisClient.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
      });

      redisClient.on('connect', () => {
        console.log('[Redis] Connected successfully');
      });

      redisClient.on('reconnecting', () => {
        console.log('[Redis] Reconnecting...');
      });
    } catch (error) {
      console.error('[Redis] Failed to initialize:', error);
      redisClient = null;
    }
  }

  return redisClient;
}

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`[Redis] Error getting key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set cached value with optional TTL (in seconds)
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`[Redis] Error setting key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete cached value(s) by key or pattern
   */
  async del(keyOrPattern: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      if (keyOrPattern.includes('*')) {
        // Pattern-based deletion
        const keys = await client.keys(keyOrPattern);
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } else {
        await client.del(keyOrPattern);
      }
      return true;
    } catch (error) {
      console.error(`[Redis] Error deleting key ${keyOrPattern}:`, error);
      return false;
    }
  },

  /**
   * Increment a counter (useful for rate limiting, view counts)
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const client = getRedisClient();
    if (!client) return 0;

    try {
      const value = await client.incr(key);
      if (ttlSeconds && value === 1) {
        // Set TTL only on first increment
        await client.expire(key, ttlSeconds);
      }
      return value;
    } catch (error) {
      console.error(`[Redis] Error incrementing key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Check if Redis is available
   */
  async isAvailable(): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.ping();
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute - for frequently changing data
  MEDIUM: 300,         // 5 minutes - for course lists, etc.
  LONG: 3600,          // 1 hour - for stable data
  VERY_LONG: 86400,    // 24 hours - for rarely changing data
};

/**
 * Cache key generators - centralized key naming
 */
export const CACHE_KEYS = {
  // Courses
  coursesList: (page: number, limit: number, filters?: string) => 
    `courses:list:${page}:${limit}${filters ? `:${filters}` : ''}`,
  courseBySlug: (slug: string) => `courses:slug:${slug}`,
  courseById: (id: string) => `courses:id:${id}`,
  courseCurriculum: (slug: string) => `courses:curriculum:${slug}`,
  
  // Live Sessions
  liveSessionsList: (page: number, limit: number) => `live-sessions:list:${page}:${limit}`,
  liveSessionById: (id: string) => `live-sessions:id:${id}`,
  liveSessionAttendees: (id: string) => `live-sessions:attendees:${id}`,
  
  // Users
  userById: (id: string) => `users:id:${id}`,
  userEnrollments: (userId: string) => `users:enrollments:${userId}`,
  
  // Stats
  siteStats: () => 'stats:site',
  
  // Invalidation patterns
  patterns: {
    allCourses: 'courses:*',
    allLiveSessions: 'live-sessions:*',
    userEnrollments: (userId: string) => `users:enrollments:${userId}`,
  },
};

/**
 * Higher-order function for caching API responses
 * Use this to wrap data fetching functions
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<T> {
  // Try to get from cache first
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result (don't await, fire and forget)
  cache.set(key, data, ttlSeconds);

  return data;
}
