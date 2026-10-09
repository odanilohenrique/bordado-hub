// Lightweight in-memory + sessionStorage cache for instant client-side transitions (0ms latency on page navigation)

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
}

const memoryCache = new Map<string, CacheEntry<any>>()
const SS_PREFIX = 'bh_cache_'

export function getCached<T>(key: string): T | null {
    // 1. In-memory check (0ms)
    const entry = memoryCache.get(key)
    if (entry) {
        return entry.data as T
    }

    // 2. Fallback to sessionStorage (survives hard refreshes & redirects within same tab)
    if (typeof window !== 'undefined') {
        try {
            const raw = window.sessionStorage.getItem(SS_PREFIX + key)
            if (raw) {
                const parsed: CacheEntry<T> = JSON.parse(raw)
                // Cache back into memory for next time
                memoryCache.set(key, parsed)
                return parsed.data
            }
        } catch {
            // Ignore sessionStorage access errors
        }
    }

    return null
}

export function isCacheValid(key: string): boolean {
    const entry = memoryCache.get(key)
    if (entry) {
        return Date.now() - entry.timestamp < entry.ttl
    }
    if (typeof window !== 'undefined') {
        try {
            const raw = window.sessionStorage.getItem(SS_PREFIX + key)
            if (raw) {
                const parsed: CacheEntry<any> = JSON.parse(raw)
                return Date.now() - parsed.timestamp < parsed.ttl
            }
        } catch {}
    }
    return false
}

export function setCached<T>(key: string, data: T, ttlMs: number = 60000): void {
    const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
    }
    memoryCache.set(key, entry)
    if (typeof window !== 'undefined') {
        try {
            window.sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry))
        } catch {
            // Ignore quota exceeded errors
        }
    }
}

export function clearCache(key?: string): void {
    if (key) {
        memoryCache.delete(key)
        if (typeof window !== 'undefined') {
            try {
                window.sessionStorage.removeItem(SS_PREFIX + key)
            } catch {}
        }
    } else {
        memoryCache.clear()
        if (typeof window !== 'undefined') {
            try {
                const keysToRemove: string[] = []
                for (let i = 0; i < window.sessionStorage.length; i++) {
                    const k = window.sessionStorage.key(i)
                    if (k && k.startsWith(SS_PREFIX)) {
                        keysToRemove.push(k)
                    }
                }
                keysToRemove.forEach(k => window.sessionStorage.removeItem(k))
            } catch {}
        }
    }
}

