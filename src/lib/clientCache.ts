// Lightweight in-memory + sessionStorage cache for instant client-side transitions (0ms latency on page navigation)

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
}

const memoryCache = new Map<string, CacheEntry<any>>()
const SS_PREFIX = 'bh_cache_'

function normalizeKey(key: string): string {
    return typeof key === 'string' ? key.trim() : ''
}

function normalizeUserId(userId?: string | null): string {
    return typeof userId === 'string' ? userId.trim() : ''
}

/**
 * Checks whether a cached value contains meaningful data.
 * Note: finite numeric `0` is treated as non-empty (so scalar counters such as
 * `unread_notification_count = 0` are preserved). Use `requireNonEmpty: true` for
 * arrays or array-only dashboard shells rather than `{ items: [], total: 0 }` wrappers.
 */
export function hasNonEmptyCacheData(data: unknown, depth: number = 0): boolean {
    if (data === null || data === undefined) return false
    if (typeof data === 'string') return data.trim().length > 0
    if (typeof data === 'number') return Number.isFinite(data)
    if (typeof data === 'boolean') return true
    if (Array.isArray(data)) return data.length > 0
    if (data instanceof Date) return Number.isFinite(data.getTime())
    if (typeof data === 'object') {
        if (depth > 4) return true
        const values = Object.values(data as Record<string, unknown>)
        if (values.length === 0) return false
        return values.some((value) => hasNonEmptyCacheData(value, depth + 1))
    }
    return false
}

export function scopedCacheKey(baseKey: string, userId?: string | null): string {
    const cleanBase = normalizeKey(baseKey)
    const cleanUserId = normalizeUserId(userId)
    if (!cleanBase) return ''
    return cleanUserId ? `${cleanBase}::u:${cleanUserId}` : `${cleanBase}::anon`
}

export function getCached<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    const cleanKey = normalizeKey(key)
    if (!cleanKey) return null

    // 1. In-memory check (0ms) with strict TTL expiration
    const entry = memoryCache.get(cleanKey)
    if (entry) {
        if (typeof entry.timestamp === 'number' && typeof entry.ttl === 'number' && Date.now() - entry.timestamp < entry.ttl) {
            if (entry.data !== undefined && entry.data !== null) {
                return entry.data as T
            }
        }
        memoryCache.delete(cleanKey)
        try {
            window.sessionStorage.removeItem(SS_PREFIX + cleanKey)
        } catch {}
    }

    // 2. Fallback to sessionStorage (survives hard refreshes & redirects within same tab)
    try {
        const raw = window.sessionStorage.getItem(SS_PREFIX + cleanKey)
        if (raw) {
            const parsed: CacheEntry<T> = JSON.parse(raw)
            if (parsed && typeof parsed.timestamp === 'number' && typeof parsed.ttl === 'number' && Date.now() - parsed.timestamp < parsed.ttl) {
                if (parsed.data !== undefined && parsed.data !== null) {
                    memoryCache.set(cleanKey, parsed)
                    return parsed.data
                }
            }
            window.sessionStorage.removeItem(SS_PREFIX + cleanKey)
        }
    } catch {
        // Evict corrupted JSON entries and ignore sessionStorage access errors
        try {
            window.sessionStorage.removeItem(SS_PREFIX + cleanKey)
        } catch {}
    }

    return null
}

export function isCacheValid(key: string): boolean {
    if (typeof window === 'undefined') return false
    const cleanKey = normalizeKey(key)
    if (!cleanKey) return false

    const entry = memoryCache.get(cleanKey)
    if (entry) {
        const valid = typeof entry.timestamp === 'number' && typeof entry.ttl === 'number' && Date.now() - entry.timestamp < entry.ttl && entry.data !== undefined && entry.data !== null
        if (valid) return true
        memoryCache.delete(cleanKey)
        try {
            window.sessionStorage.removeItem(SS_PREFIX + cleanKey)
        } catch {}
        return false
    }

    try {
        const raw = window.sessionStorage.getItem(SS_PREFIX + cleanKey)
        if (raw) {
            const parsed: CacheEntry<any> = JSON.parse(raw)
            const valid = Boolean(parsed && typeof parsed.timestamp === 'number' && typeof parsed.ttl === 'number' && Date.now() - parsed.timestamp < parsed.ttl && parsed.data !== undefined && parsed.data !== null)
            if (valid) return true
            window.sessionStorage.removeItem(SS_PREFIX + cleanKey)
        }
    } catch {
        try {
            window.sessionStorage.removeItem(SS_PREFIX + cleanKey)
        } catch {}
    }
    return false
}

export function setCached<T>(key: string, data: T, ttlMs: number = 60000): void {
    if (typeof window === 'undefined') return
    const cleanKey = normalizeKey(key)
    if (!cleanKey) return

    if (data === null || data === undefined || typeof ttlMs !== 'number' || !Number.isFinite(ttlMs) || ttlMs <= 0) {
        clearCache(cleanKey)
        return
    }

    const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
    }
    memoryCache.set(cleanKey, entry)
    try {
        window.sessionStorage.setItem(SS_PREFIX + cleanKey, JSON.stringify(entry))
    } catch {
        // Ignore quota exceeded errors
    }
}

export function clearCache(key?: string): void {
    if (key) {
        const cleanKey = normalizeKey(key)
        if (!cleanKey) return
        memoryCache.delete(cleanKey)
        if (typeof window !== 'undefined') {
            try {
                window.sessionStorage.removeItem(SS_PREFIX + cleanKey)
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

export function clearAllCache(): void {
    clearCache()
}

export function clearCacheByPrefix(prefix: string): void {
    const cleanPrefix = normalizeKey(prefix)
    if (!cleanPrefix) return
    for (const k of Array.from(memoryCache.keys())) {
        if (k.startsWith(cleanPrefix)) {
            memoryCache.delete(k)
        }
    }
    if (typeof window !== 'undefined') {
        try {
            const fullPrefix = SS_PREFIX + cleanPrefix
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

/**
 * Reads a user-scoped cache entry. When `requireNonEmpty: true`, numeric `0` is
 * considered non-empty (for scalar counters); prefer arrays or array-only shells
 * rather than `{ items: [], total: 0 }` wrapper objects.
 */
export function getScopedCached<T>(
    baseKey: string,
    userId?: string | null,
    options?: { requireNonEmpty?: boolean }
): T | null {
    const cleanUserId = normalizeUserId(userId)
    if (!cleanUserId) return null
    const key = scopedCacheKey(baseKey, cleanUserId)
    if (!key) return null
    const data = getCached<T>(key)
    if (data === null) return null
    if (options?.requireNonEmpty && !hasNonEmptyCacheData(data)) {
        return null
    }
    return data
}

export function setScopedCached<T>(
    baseKey: string,
    userId: string | null | undefined,
    data: T,
    ttlMs: number = 60000
): void {
    const cleanUserId = normalizeUserId(userId)
    if (!cleanUserId) return
    const key = scopedCacheKey(baseKey, cleanUserId)
    if (!key) return
    setCached<T>(key, data, ttlMs)
}

export function clearScopedCache(baseKey: string, userId?: string | null): void {
    const cleanBase = normalizeKey(baseKey)
    if (!cleanBase) return
    const cleanUserId = normalizeUserId(userId)
    if (cleanUserId) {
        clearCache(scopedCacheKey(cleanBase, cleanUserId))
        clearCache(cleanBase)
    } else {
        clearCacheByPrefix(cleanBase)
    }
}
