// Lightweight in-memory cache for instant client-side transitions (0ms latency on page navigation)

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
}

const memoryCache = new Map<string, CacheEntry<any>>()

export function getCached<T>(key: string): T | null {
    const entry = memoryCache.get(key)
    if (!entry) return null
    // If expired, return data anyway (stale-while-revalidate pattern), but caller knows to refresh
    return entry.data as T
}

export function isCacheValid(key: string): boolean {
    const entry = memoryCache.get(key)
    if (!entry) return false
    return Date.now() - entry.timestamp < entry.ttl
}

export function setCached<T>(key: string, data: T, ttlMs: number = 60000): void {
    memoryCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
    })
}

export function clearCache(key?: string): void {
    if (key) {
        memoryCache.delete(key)
    } else {
        memoryCache.clear()
    }
}
