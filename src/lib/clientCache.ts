// Lightweight in-memory + sessionStorage cache for instant client-side transitions (0ms latency on page navigation)

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
}

const memoryCache = new Map<string, CacheEntry<any>>()
const SS_PREFIX = 'bh_cache_'

export function getCached<T>(key: string): T | null {
    // 1. In-memory check (0ms) with strict TTL expiration
    const entry = memoryCache.get(key)
    if (entry) {
        if (typeof entry.timestamp === 'number' && typeof entry.ttl === 'number' && Date.now() - entry.timestamp < entry.ttl) {
            return entry.data as T
        }
        memoryCache.delete(key)
        if (typeof window !== 'undefined') {
            try {
                window.sessionStorage.removeItem(SS_PREFIX + key)
            } catch {}
        }
    }

    // 2. Fallback to sessionStorage (survives hard refreshes & redirects within same tab)
    if (typeof window !== 'undefined') {
        try {
            const raw = window.sessionStorage.getItem(SS_PREFIX + key)
            if (raw) {
                const parsed: CacheEntry<T> = JSON.parse(raw)
                if (parsed && typeof parsed.timestamp === 'number' && typeof parsed.ttl === 'number' && Date.now() - parsed.timestamp < parsed.ttl) {
                    memoryCache.set(key, parsed)
                    return parsed.data
                }
                window.sessionStorage.removeItem(SS_PREFIX + key)
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
        return typeof entry.timestamp === 'number' && typeof entry.ttl === 'number' && Date.now() - entry.timestamp < entry.ttl
    }
    if (typeof window !== 'undefined') {
        try {
            const raw = window.sessionStorage.getItem(SS_PREFIX + key)
            if (raw) {
                const parsed: CacheEntry<any> = JSON.parse(raw)
                return Boolean(parsed && typeof parsed.timestamp === 'number' && typeof parsed.ttl === 'number' && Date.now() - parsed.timestamp < parsed.ttl)
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
                // Purge legacy localStorage profile key that caused stale profile ghosts
                window.localStorage.removeItem('current_user_profile')
            } catch {}
        }
    }
}

export function clearCacheByPrefix(prefix: string): void {
    for (const k of Array.from(memoryCache.keys())) {
        if (k.startsWith(prefix)) {
            memoryCache.delete(k)
        }
    }
    if (typeof window !== 'undefined') {
        try {
            const fullPrefix = SS_PREFIX + prefix
            const keysToRemove: string[] = []
            for (let i = 0; i < window.sessionStorage.length; i++) {
                const k = window.sessionStorage.key(i)
                if (k && k.startsWith(fullPrefix)) {
                    keysToRemove.push(k)
                }
            }
            keysToRemove.forEach(k => window.sessionStorage.removeItem(k))
        } catch {}
    }
}
