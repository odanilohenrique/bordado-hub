import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables')
}

const AUTH_LOCKS_SYMBOL = Symbol.for('bordadohub.supabase.inProcessAuthLocks')

function getLockStore() {
    if (!globalThis[AUTH_LOCKS_SYMBOL]) {
        globalThis[AUTH_LOCKS_SYMBOL] = new Map()
    }
    return globalThis[AUTH_LOCKS_SYMBOL]
}

function createLockAcquireTimeoutError(name) {
    const error = new Error(`Acquiring in-process auth lock "${name}" timed out`)
    error.name = 'ProcessLockAcquireTimeoutError'
    error.isAcquireTimeout = true
    return error
}

/**
 * Mutex in-process single-flight por nome de lock.
 * Evita tanto o deadlock do navigator.locks em navegadores móveis (Safari iOS / Android)
 * quanto corridas de refresh de sessão/JWT causadas por lock no-op.
 *
 * Semântica compatível com @supabase/auth-js LockFunc:
 * - acquireTimeout === 0: tentativa não-bloqueante (rejeita com isAcquireTimeout=true se ocupado)
 * - acquireTimeout < 0 (ou não finito): aguarda em fila FIFO sem timeout
 * - acquireTimeout > 0: aguarda em fila FIFO até acquireTimeout ms, cancelando sem bloquear próximos
 */
export async function inProcessAuthLock(name, acquireTimeout, fn) {
    const locks = getLockStore()
    let state = locks.get(name)
    if (!state) {
        state = { locked: false, queue: [] }
        locks.set(name, state)
    }

    const release = () => {
        while (state.queue.length > 0) {
            const next = state.queue.shift()
            if (next.grant()) {
                return
            }
        }
        state.locked = false
        if (state.queue.length === 0) {
            locks.delete(name)
        }
    }

    if (state.locked) {
        if (acquireTimeout === 0) {
            throw createLockAcquireTimeoutError(name)
        }

        await new Promise((resolve, reject) => {
            let settled = false
            let timer = null

            const waiter = {
                grant: () => {
                    if (settled) return false
                    settled = true
                    if (timer !== null) {
                        clearTimeout(timer)
                        timer = null
                    }
                    resolve()
                    return true
                },
            }

            if (typeof acquireTimeout === 'number' && Number.isFinite(acquireTimeout) && acquireTimeout > 0) {
                timer = setTimeout(() => {
                    if (settled) return
                    settled = true
                    timer = null
                    const idx = state.queue.indexOf(waiter)
                    if (idx !== -1) {
                        state.queue.splice(idx, 1)
                    }
                    reject(createLockAcquireTimeoutError(name))
                }, acquireTimeout)
            }

            state.queue.push(waiter)
        })
    } else {
        state.locked = true
    }

    try {
        return await fn()
    } finally {
        release()
    }
}

// Client for frontend usage (respects RLS)
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: inProcessAuthLock,
    }
})

// Client for server-side usage (bypasses RLS) - NEVER use in frontend components
export function createServiceClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(supabaseUrl || '', serviceRoleKey)
}
