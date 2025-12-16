// Caching utilities for better performance
import React from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheItem<unknown>>();
  private maxSize = 100;

  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const memoryCache = new MemoryCache();

// Browser storage cache
class BrowserCache {
  private prefix = 'tada_vtu_';

  set<T>(key: string, data: T, ttlMinutes: number = 60): void {
    if (typeof window === 'undefined') return;
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;
      const item: CacheItem<T> = JSON.parse(stored);
      if (Date.now() - item.timestamp > item.ttl) {
        this.delete(key);
        return null;
      }
      return item.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      this.delete(key);
      return null;
    }
  }

  delete(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

export const browserCache = new BrowserCache();

// API response caching
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  ttlMinutes: number = 5
): Promise<T> {
  const cacheKey = `api_${url}_${JSON.stringify(options)}`;
  
  let cached = memoryCache.get<T>(cacheKey);
  if (cached) return cached;
  
  cached = browserCache.get<T>(cacheKey);
  if (cached) {
    memoryCache.set(cacheKey, cached, ttlMinutes);
    return cached;
  }
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  memoryCache.set(cacheKey, data, ttlMinutes);
  browserCache.set(cacheKey, data, ttlMinutes);
  
  return data;
}

// React hook for cached data
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMinutes: number = 5
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let cached = memoryCache.get<T>(key);
        if (!cached) {
          cached = browserCache.get<T>(key);
        }
        
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
        
        const freshData = await fetcher();
        memoryCache.set(key, freshData, ttlMinutes);
        browserCache.set(key, freshData, ttlMinutes);
        setData(freshData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, ttlMinutes]);

  const refresh = async () => {
    memoryCache.delete(key);
    browserCache.delete(key);
    
    try {
      setLoading(true);
      setError(null);
      const freshData = await fetcher();
      memoryCache.set(key, freshData, ttlMinutes);
      browserCache.set(key, freshData, ttlMinutes);
      setData(freshData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
}

// Cache invalidation patterns
export const cacheKeys = {
  user: (userId: string) => `user_${userId}`,
  transactions: (userId: string) => `transactions_${userId}`,
  balance: (userId: string) => `balance_${userId}`,
  dataPlans: (network: string) => `data_plans_${network}`,
  services: () => 'services',
} as const;

export function invalidateUserCache(userId: string) {
  const keys = [
    cacheKeys.user(userId),
    cacheKeys.transactions(userId),
    cacheKeys.balance(userId)
  ];
  
  keys.forEach(key => {
    memoryCache.delete(key);
    browserCache.delete(key);
  });
}
