import Redis from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;
let isRedisConnected = false;

// Fallback in-memory cache when Redis is unavailable or during testing
interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryCacheEntry>();

export const initRedis = (): Redis | null => {
  if (!env.REDIS_ENABLED) {
    console.log('[Redis] Redis caching is disabled via configuration. Using fallback cache.');
    return null;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[Redis] Max reconnect attempts reached. Operating in fallback cache mode.');
          return null;
        }
        return Math.min(times * 1000, 3000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log(`[Redis] Connected to Redis at ${env.REDIS_URL}`);
    });

    redisClient.on('ready', () => {
      isRedisConnected = true;
      console.log('[Redis] Redis client is ready.');
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      console.warn(`[Redis] Connection warning: ${err.message}`);
    });

    redisClient.on('close', () => {
      isRedisConnected = false;
    });

    redisClient.connect().catch((err) => {
      console.warn(`[Redis] Initial connection failed (${err.message}). Using fallback memory cache.`);
    });

    return redisClient;
  } catch (err: any) {
    console.warn(`[Redis] Failed to initialize Redis: ${err.message}`);
    return null;
  }
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};

export const isRedisReady = (): boolean => {
  return isRedisConnected && redisClient !== null && redisClient.status === 'ready';
};

export const getCache = async (key: string): Promise<string | null> => {
  if (isRedisReady() && redisClient) {
    try {
      return await redisClient.get(key);
    } catch (err: any) {
      console.warn(`[Redis] getCache error for key ${key}: ${err.message}. Checking fallback cache.`);
    }
  }

  // Fallback cache lookup
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
};

export const setCache = async (key: string, value: string, ttlSeconds: number = 600): Promise<boolean> => {
  if (isRedisReady() && redisClient) {
    try {
      await redisClient.set(key, value, 'EX', ttlSeconds);
    } catch (err: any) {
      console.warn(`[Redis] setCache error for key ${key}: ${err.message}. Storing in fallback cache.`);
    }
  }

  // Update fallback cache as well to ensure resilience
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  return true;
};

export const deleteCache = async (key: string): Promise<boolean> => {
  if (isRedisReady() && redisClient) {
    try {
      await redisClient.del(key);
    } catch (err: any) {
      console.warn(`[Redis] deleteCache error for key ${key}: ${err.message}`);
    }
  }

  memoryCache.delete(key);
  return true;
};

export const clearMemoryCache = (): void => {
  memoryCache.clear();
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
    isRedisConnected = false;
  }
  memoryCache.clear();
};
