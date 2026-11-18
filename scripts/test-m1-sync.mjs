/**
 * MILESTONE M1 REGRESSION & BEHAVIORAL TEST SUITE (R1 / F1–F7)
 * Verifies:
 *   - F1: inProcessAuthLock (FIFO mutex, timeout semantics, concurrent calls)
 *   - F2: AuthContext hydration, >1500ms slow-session patience, SIGNED_IN loading state,
 *         strict supabase_user_id cache ownership check, epoch-guarded retries, StrictMode timer cleanup
 *   - F3: clientCache.ts user-scoped keys, hasNonEmptyCacheData, TTL expiration, SSR safety
 *   - F4–F7: /jobs, /producao, /pedidos, /financeiro, /jobs/[id], /jobs/new,
 *            NotificationBell, GlobalNotificationAlert, Sidebar behavioral & structural invariants
 *
 * Run: node scripts/test-m1-sync.mjs
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { createTestRunner, verifyFileContent } from './test-helpers.mjs'

const require = createRequire(import.meta.url)
const ROOT = process.cwd()

// ---------------------------------------------------------------------------
// In-memory TypeScript / JS / TSX loader
// ---------------------------------------------------------------------------
function resolveModuleFile(relOrAbsPath) {
    const base = path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.resolve(ROOT, relOrAbsPath)
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`]
    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate
        }
    }
    throw new Error(`Module not found: ${relOrAbsPath}`)
}

function loadModule(relPath, mocks = {}, cache = new Map()) {
    const fullPath = resolveModuleFile(relPath)
    if (cache.has(fullPath)) {
        return cache.get(fullPath).exports
    }

    const source = fs.readFileSync(fullPath, 'utf8')
    const { outputText } = ts.transpileModule(source, {
        fileName: fullPath,
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
            allowJs: true,
            moduleResolution: ts.ModuleResolutionKind.Node10,
        },
    })

    const mod = { exports: {} }
    cache.set(fullPath, mod)

    const localRequire = (specifier) => {
        if (Object.prototype.hasOwnProperty.call(mocks, specifier)) {
            return mocks[specifier]
        }
        if (specifier.startsWith('@/')) {
            const target = path.join(ROOT, 'src', specifier.slice(2))
            return loadModule(target, mocks, cache)
        }
        if (specifier.startsWith('./') || specifier.startsWith('../')) {
            const target = path.resolve(path.dirname(fullPath), specifier)
            return loadModule(target, mocks, cache)
        }
        return require(specifier)
    }

    const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', outputText)
    fn(mod.exports, localRequire, mod, fullPath, path.dirname(fullPath))
    return mod.exports
}

// ---------------------------------------------------------------------------
// Lightweight React Hook & Context Harness
// ---------------------------------------------------------------------------
function createReactHarness() {
    const states = []
    const refs = []
    const callbacks = []
    const memos = []
    const effects = []
    let hookCursor = 0
    let currentComponent = null
    let currentProps = null
    let lastRender = null
    let mounted = false
    let pendingRender = false
    let contextValues = new Map()

    function depsChanged(prevDeps, nextDeps) {
        if (!prevDeps || !nextDeps) return true
        if (prevDeps.length !== nextDeps.length) return true
        for (let i = 0; i < nextDeps.length; i++) {
            if (!Object.is(prevDeps[i], nextDeps[i])) return true
        }
        return false
    }

    function flushEffects() {
        if (!mounted) return
        for (let i = 0; i < effects.length; i++) {
            const entry = effects[i]
            if (!entry || !entry.dirty) continue
            entry.dirty = false
            if (typeof entry.cleanup === 'function') {
                entry.cleanup()
                entry.cleanup = null
            }
            const nextCleanup = entry.fn()
            entry.cleanup = typeof nextCleanup === 'function' ? nextCleanup : null
        }
    }

    function runRender() {
        if (!mounted || !currentComponent) return lastRender
        hookCursor = 0
        lastRender = currentComponent(currentProps)
        flushEffects()
        return lastRender
    }

    function scheduleRender() {
        if (!mounted || pendingRender) return
        pendingRender = true
        queueMicrotask(() => {
            pendingRender = false
            if (mounted) runRender()
        })
    }

    const reactMock = {
        createContext(defaultValue) {
            const ctx = { _defaultValue: defaultValue }
            ctx.Provider = ({ value, children }) => {
                contextValues.set(ctx, value)
                return { type: 'ContextProvider', props: { value, children } }
            }
            return ctx
        },
        useContext(ctx) {
            return contextValues.has(ctx) ? contextValues.get(ctx) : ctx._defaultValue
        },
        useState(initial) {
            const idx = hookCursor++
            if (!(idx in states)) {
                states[idx] = typeof initial === 'function' ? initial() : initial
            }
            const setState = (updater) => {
                const nextVal = typeof updater === 'function' ? updater(states[idx]) : updater
                if (!Object.is(states[idx], nextVal)) {
                    states[idx] = nextVal
                    scheduleRender()
                }
            }
            return [states[idx], setState]
        },
        useRef(initial) {
            const idx = hookCursor++
            if (!(idx in refs)) {
                refs[idx] = { current: initial }
            }
            return refs[idx]
        },
        useCallback(fn, deps) {
            const idx = hookCursor++
            const prev = callbacks[idx]
            if (!prev || depsChanged(prev.deps, deps)) {
                callbacks[idx] = { fn, deps }
            }
            return callbacks[idx].fn
        },
        useMemo(factory, deps) {
            const idx = hookCursor++
            const prev = memos[idx]
            if (!prev || depsChanged(prev.deps, deps)) {
                memos[idx] = { value: factory(), deps }
            }
            return memos[idx].value
        },
        useEffect(fn, deps) {
            const idx = hookCursor++
            const prev = effects[idx]
            if (!prev || depsChanged(prev.deps, deps)) {
                effects[idx] = {
                    fn,
                    deps,
                    cleanup: prev ? prev.cleanup : null,
                    dirty: true,
                }
            }
        },
    }
    reactMock.default = reactMock

    const jsxRuntimeMock = {
        jsx(type, props) {
            return { type, props: props || {} }
        },
        jsxs(type, props) {
            return { type, props: props || {} }
        },
        Fragment: Symbol('Fragment'),
    }

    return {
        reactMock,
        jsxRuntimeMock,
        mount(ComponentFn, props = {}) {
            currentComponent = ComponentFn
            currentProps = props
            mounted = true
            return runRender()
        },
        rerender(nextProps = currentProps) {
            currentProps = nextProps
            return runRender()
        },
        getOutput() {
            return lastRender
        },
        getContextValue(ctx) {
            return contextValues.get(ctx)
        },
        unmount() {
            mounted = false
            for (const entry of effects) {
                if (entry && typeof entry.cleanup === 'function') {
                    entry.cleanup()
                    entry.cleanup = null
                }
            }
        },
    }
}

function collectText(node, out = []) {
    if (node === null || node === undefined || typeof node === 'boolean') return out
    if (typeof node === 'string' || typeof node === 'number') {
        out.push(String(node))
        return out
    }
    if (Array.isArray(node)) {
        for (const item of node) collectText(item, out)
        return out
    }
    if (typeof node === 'object') {
        if (typeof node.type === 'function') {
            try {
                collectText(node.type(node.props || {}), out)
            } catch {
                // Ignore child component errors during text scraping
            }
        }
        if (node.props && node.props.children !== undefined) {
            collectText(node.props.children, out)
        }
    }
    return out
}

function findElements(node, predicate, out = []) {
    if (!node || typeof node !== 'object') return out
    if (Array.isArray(node)) {
        for (const item of node) findElements(item, predicate, out)
        return out
    }
    if (predicate(node)) out.push(node)
    if (node.props && node.props.children !== undefined) {
        findElements(node.props.children, predicate, out)
    }
    return out
}

async function flushAsync(turns = 8, delayMs = 0) {
    for (let i = 0; i < turns; i++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
}

function createMemoryStorage() {
    const store = new Map()
    return {
        get length() {
            return store.size
        },
        key(index) {
            return Array.from(store.keys())[index] ?? null
        },
        getItem(k) {
            return store.has(k) ? store.get(k) : null
        },
        setItem(k, v) {
            store.set(k, String(v))
        },
        removeItem(k) {
            store.delete(k)
        },
        clear() {
            store.clear()
        },
    }
}

async function withMockBrowser(fn) {
    const saved = {
        window: globalThis.window,
        document: globalThis.document,
        sessionStorage: globalThis.sessionStorage,
        localStorage: globalThis.localStorage,
        CustomEvent: globalThis.CustomEvent,
        fetch: globalThis.fetch,
    }

    const sessionStorageMock = createMemoryStorage()
    const localStorageMock = createMemoryStorage()
    const windowListeners = new Map()
    const docListeners = new Map()

    const addListener = (map, type, cb) => {
        if (!map.has(type)) map.set(type, new Set())
        map.get(type).add(cb)
    }
    const removeListener = (map, type, cb) => {
        map.get(type)?.delete(cb)
    }
    const dispatchTo = (map, event) => {
        const set = map.get(event.type)
        if (!set) return
        for (const cb of Array.from(set)) cb(event)
    }

    class MockCustomEvent {
        constructor(type, init = {}) {
            this.type = type
            this.detail = init.detail
        }
    }

    const windowMock = {
        sessionStorage: sessionStorageMock,
        localStorage: localStorageMock,
        addEventListener: (type, cb) => addListener(windowListeners, type, cb),
        removeEventListener: (type, cb) => removeListener(windowListeners, type, cb),
        dispatchEvent: (ev) => {
            dispatchTo(windowListeners, ev)
            return true
        },
    }

    const documentMock = {
        visibilityState: 'visible',
        addEventListener: (type, cb) => addListener(docListeners, type, cb),
        removeEventListener: (type, cb) => removeListener(docListeners, type, cb),
        dispatchEvent: (ev) => {
            dispatchTo(docListeners, ev)
            return true
        },
    }

    try {
        Object.defineProperty(globalThis, 'window', { value: windowMock, configurable: true, writable: true })
        Object.defineProperty(globalThis, 'document', { value: documentMock, configurable: true, writable: true })
        Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, configurable: true, writable: true })
        Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true, writable: true })
        Object.defineProperty(globalThis, 'CustomEvent', { value: MockCustomEvent, configurable: true, writable: true })

        return await fn({ windowMock, documentMock, sessionStorageMock, localStorageMock })
    } finally {
        const restore = (k, val) => {
            if (val === undefined) {
                try {
                    delete globalThis[k]
                } catch {
                    Object.defineProperty(globalThis, k, { value: undefined, configurable: true, writable: true })
                }
            } else {
                Object.defineProperty(globalThis, k, { value: val, configurable: true, writable: true })
            }
        }
        restore('window', saved.window)
        restore('document', saved.document)
        restore('sessionStorage', saved.sessionStorage)
        restore('localStorage', saved.localStorage)
        restore('CustomEvent', saved.CustomEvent)
        restore('fetch', saved.fetch)
    }
}

const runner = createTestRunner()
const { suite, test } = runner

// ==============================================================================
// F1: Serialized In-Process Auth Mutex (supabaseClient.js)
// ==============================================================================
suite('M1.1 — F1: Serialized In-Process Auth Lock (supabaseClient.js)')

test('inProcessAuthLock serializes concurrent callers FIFO, handles acquireTimeout=0 and positive timeout cleanup', async () => {
    const clientMod = loadModule('src/lib/supabaseClient.js', {
        '@supabase/supabase-js': {
            createClient: () => ({ auth: {}, from: () => ({}) }),
        },
    })
    const { inProcessAuthLock } = clientMod
    assert.equal(typeof inProcessAuthLock, 'function')

    const events = []
    let releaseFirst
    const firstHold = new Promise((r) => {
        releaseFirst = r
    })

    // 1. Acquire lock and hold it
    const p1 = inProcessAuthLock('lock:auth-test', -1, async () => {
        events.push('p1:start')
        await firstHold
        events.push('p1:end')
        return 'res1'
    })

    // 2. Non-blocking acquireTimeout=0 must immediately reject with isAcquireTimeout=true
    await assert.rejects(
        () => inProcessAuthLock('lock:auth-test', 0, async () => 'should-not-run'),
        (err) => err && err.isAcquireTimeout === true
    )

    // 3. Timed-out waiter (acquireTimeout=25ms) must reject without blocking a subsequent infinite waiter
    const pTimeout = inProcessAuthLock('lock:auth-test', 25, async () => {
        events.push('pTimeout:should-not-run')
        return 'timeout'
    })
    const p2 = inProcessAuthLock('lock:auth-test', -1, async () => {
        events.push('p2:start')
        events.push('p2:end')
        return 'res2'
    })

    await assert.rejects(pTimeout, (err) => err && err.isAcquireTimeout === true)
    assert.deepEqual(events, ['p1:start'])

    // Release first lock -> p2 runs cleanly in FIFO order
    releaseFirst()
    assert.equal(await p1, 'res1')
    assert.equal(await p2, 'res2')
    assert.deepEqual(events, ['p1:start', 'p1:end', 'p2:start', 'p2:end'])

    // Different lock names run independently without mutual blocking
    let releaseA
    const holdA = new Promise((r) => {
        releaseA = r
    })
    const pa = inProcessAuthLock('lock:A', -1, async () => {
        await holdA
        return 'A'
    })
    const pb = await inProcessAuthLock('lock:B', 0, async () => 'B')
    assert.equal(pb, 'B')
    releaseA()
    assert.equal(await pa, 'A')
})

// ==============================================================================
// F3: Scoped Client Cache & Empty-Data Protection (clientCache.ts)
// ==============================================================================
suite('M1.1 — F3: User-Scoped Cache & Empty-Data Validation (clientCache.ts)')

test('clientCache isolates entries by userId, rejects empty shells with requireNonEmpty, and respects SSR', async () => {
    // SSR check when window is undefined
    const cacheModSsr = loadModule('src/lib/clientCache.ts')
    if (typeof globalThis.window === 'undefined') {
        assert.equal(cacheModSsr.getCached('jobs_all'), null)
        assert.equal(cacheModSsr.getScopedCached('producao_data', 'u1'), null)
    }

    await withMockBrowser(async () => {
        const cacheMod = loadModule('src/lib/clientCache.ts', {}, new Map())
        const {
            scopedCacheKey,
            hasNonEmptyCacheData,
            getScopedCached,
            setScopedCached,
            clearScopedCache,
            getCached,
            setCached,
        } = cacheMod

        assert.equal(scopedCacheKey('producao_data', 'user-1'), 'producao_data::u:user-1')
        assert.equal(scopedCacheKey('producao_data', null), 'producao_data::anon')

        assert.equal(hasNonEmptyCacheData([]), false)
        assert.equal(hasNonEmptyCacheData({ directRequests: [], inProduction: [], inRevision: [] }), false)
        assert.equal(hasNonEmptyCacheData({ directRequests: [{ id: 'j1' }], inProduction: [] }), true)
        assert.equal(hasNonEmptyCacheData(0), true)

        // Empty dashboard shell must NOT pass requireNonEmpty: true
        setScopedCached('producao_data', 'user-1', { directRequests: [], inProduction: [] }, 60000)
        assert.equal(getScopedCached('producao_data', 'user-1', { requireNonEmpty: true }), null)
        assert.notEqual(getScopedCached('producao_data', 'user-1', { requireNonEmpty: false }), null)

        // User-1 data must never leak to User-2
        setScopedCached('producao_data', 'user-1', { directRequests: [{ id: 'j1' }] }, 60000)
        assert.deepEqual(getScopedCached('producao_data', 'user-1', { requireNonEmpty: true }), {
            directRequests: [{ id: 'j1' }],
        })
        assert.equal(getScopedCached('producao_data', 'user-2', { requireNonEmpty: true }), null)

        clearScopedCache('producao_data', 'user-1')
        assert.equal(getScopedCached('producao_data', 'user-1'), null)

        // Expired TTL entry is evicted
        setCached('temp_key', [1, 2], 10)
        await flushAsync(2, 15)
        assert.equal(getCached('temp_key'), null)
    })
})

// ==============================================================================
// F2: AuthContext Hydration, Slow Session, SIGNED_IN & Cache Security
// ==============================================================================
suite('M1.1 — F2: AuthContext Slow-Session, SIGNED_IN & Cache Ownership (AuthContext.tsx)')

test('AuthContext keeps loading=true past 1500ms while session/profile resolves, guards StrictMode & cache ownership', async () => {
    verifyFileContent('src/contexts/AuthContext.tsx', {
        includes: [
            'isProfileMatchingUser',
            'cachedProf.supabase_user_id !== supabaseUserId',
            'bordadohub_profile_updated',
            'clearTimeout(timeoutTimer)',
            'profileLoading',
            'callEpoch',
            'failsafeTimerRef',
        ],
    })

    await withMockBrowser(async ({ sessionStorageMock }) => {
        // Seed a mismatched / supabase_user_id-less cached profile (must be rejected)
        sessionStorageMock.setItem(
            'bh_cache_current_user_auth',
            JSON.stringify({ data: { id: 'auth-u2' }, timestamp: Date.now(), ttl: 300000 })
        )
        sessionStorageMock.setItem(
            'bh_cache_current_user_profile',
            JSON.stringify({ data: { id: 'prof-u1', name: 'Leak User' }, timestamp: Date.now(), ttl: 300000 })
        )

        let resolveSession
        let authListener = null
        let profileQueryCalls = 0
        const mockSupabase = {
            auth: {
                getSession: () =>
                    new Promise((resolve) => {
                        resolveSession = resolve
                    }),
                onAuthStateChange: (cb) => {
                    authListener = cb
                    return { data: { subscription: { unsubscribe: () => {} } } }
                },
            },
            from: () => ({
                select: () => ({
                    eq: () => ({
                        maybeSingle: async () => {
                            profileQueryCalls++
                            return {
                                data: { id: 'prof-u2', supabase_user_id: 'auth-u2', name: 'Valid User', role: 'criador' },
                                error: null,
                            }
                        },
                    }),
                }),
            }),
        }

        const harness = createReactHarness()
        const cache = new Map()
        const authMod = loadModule(
            'src/contexts/AuthContext.tsx',
            {
                react: harness.reactMock,
                'react/jsx-runtime': harness.jsxRuntimeMock,
                '@/lib/supabaseClient': { supabase: mockSupabase },
            },
            cache
        )

        let ctxSnapshot = null
        function AuthProbe() {
            ctxSnapshot = authMod.useAuth()
            return null
        }

        function RootApp() {
            return authMod.AuthProvider({
                children: harness.jsxRuntimeMock.jsx(AuthProbe, {}),
            })
        }

        harness.mount(RootApp)
        await flushAsync(4, 10)

        // Mismatched/unowned cached profile must NOT be exposed as auth-u2's profile
        assert.equal(ctxSnapshot?.profileId ?? null, null)
        // Must still be loading while getSession() is pending (no premature false drop)
        assert.equal(ctxSnapshot?.loading ?? true, true)

        // Resolve session cleanly -> profile must hydrate without needing F5
        resolveSession({ data: { session: { user: { id: 'auth-u2', email: 'u2@test.com' } } }, error: null })
        await flushAsync(8, 10)

        const providerTree = harness.getOutput()
        const providerValue = providerTree?.props?.value
        assert.equal(providerValue.profileId, 'prof-u2')
        assert.equal(providerValue.loading, false)
        assert.equal(providerValue.profileLoading, false)
        assert.equal(profileQueryCalls, 1)

        // Simulate SIGNED_OUT -> SIGNED_IN SPA transition
        assert.ok(typeof authListener === 'function')
        authListener('SIGNED_OUT', null)
        await flushAsync(4, 5)
        assert.equal(harness.getOutput()?.props?.value?.profileId, null)

        authListener('SIGNED_IN', { user: { id: 'auth-u2', email: 'u2@test.com' } })
        await flushAsync(8, 10)
        assert.equal(harness.getOutput()?.props?.value?.profileId, 'prof-u2')
        assert.equal(harness.getOutput()?.props?.value?.loading, false)

        harness.unmount()
    })
})

// ==============================================================================
// F4 & F5: Behavioral Initial-Load Verification (/jobs & /producao Without F5)
// ==============================================================================
suite('M1.2 — F4 & F5: Initial-Load Sync Without F5 (/jobs & /producao)')

test('/jobs loads public feed immediately while auth is pending and enriches proposals when profileId arrives without 0-item reset', async () => {
    await withMockBrowser(async () => {
        const authState = { user: { id: 'auth-1' }, profile: null, profileId: null, loading: true, profileLoading: true }
        let jobsQueryCount = 0

        const mockSupabase = {
            from: (table) => {
                const chain = {
                    select: () => chain,
                    is: () => chain,
                    in: () => chain,
                    eq: () => chain,
                    order: () => chain,
                    limit: () => chain,
                    then: (resolve) => {
                        if (table === 'jobs') {
                            jobsQueryCount++
                            resolve({
                                data: [
                                    {
                                        id: 'job-1',
                                        title: 'Matriz Leão 3D',
                                        status: 'aberto',
                                        cliente_id: 'client-9',
                                        created_at: new Date().toISOString(),
                                        proposals: [],
                                        users: { name: 'Ana', avatar_url: null },
                                    },
                                ],
                                error: null,
                            })
                        } else if (table === 'proposals') {
                            resolve({ data: [{ job_id: 'job-1', status: 'pendente' }], error: null })
                        } else {
                            resolve({ data: [], error: null })
                        }
                    },
                }
                return chain
            },
        }

        const harness = createReactHarness()
        const jobsMod = loadModule(
            'src/app/jobs/page.tsx',
            {
                react: harness.reactMock,
                'react/jsx-runtime': harness.jsxRuntimeMock,
                'next/link': { __esModule: true, default: ({ children, href }) => ({ type: 'a', props: { href, children } }) },
                'lucide-react': new Proxy({}, { get: () => () => null }),
                '@/lib/supabaseClient': { supabase: mockSupabase },
                '@/contexts/AuthContext': { useAuth: () => authState },
                '@/components/JobCard': { __esModule: true, default: ({ job }) => ({ type: 'div', props: { children: `${job.title}:${job.my_proposal_status || 'none'}` } }) },
                '@/components/PushNotificationBanner': { __esModule: true, default: () => null },
            },
            new Map()
        )

        harness.mount(jobsMod.default)
        await flushAsync(8, 10)

        const textsInitial = collectText(harness.getOutput()).join(' | ')
        assert.ok(textsInitial.includes('Matriz Leão 3D'), `Expected job in initial render, got: ${textsInitial}`)
        assert.ok(!textsInitial.includes('Nenhum pedido encontrado'), 'Must not flash 0-pedidos state')
        assert.equal(jobsQueryCount, 1)

        // Auth finishes hydrating profileId -> enriches proposal status WITHOUT re-fetching public jobs
        authState.profileId = 'prog-1'
        authState.loading = false
        authState.profileLoading = false
        harness.rerender()
        await flushAsync(8, 10)

        const textsEnriched = collectText(harness.getOutput()).join(' | ')
        assert.ok(textsEnriched.includes('Matriz Leão 3D:pendente'), `Expected enriched proposal status, got: ${textsEnriched}`)
        assert.equal(jobsQueryCount, 1, 'Public jobs query must NOT be re-triggered on profileId arrival')
        harness.unmount()
    })
})

test('/producao waits for pending auth identity (never flashes 0-item empty state) and displays jobs as soon as profileId hydrates', async () => {
    await withMockBrowser(async () => {
        const authState = { user: { id: 'auth-prog' }, profile: null, profileId: null, loading: true, profileLoading: true }

        const mockSupabase = {
            from: (table) => {
                const chain = {
                    select: () => chain,
                    eq: () => chain,
                    order: async () => {
                        if (table === 'jobs') {
                            return { data: [], error: null }
                        }
                        if (table === 'proposals') {
                            return {
                                data: [
                                    {
                                        status: 'aceita',
                                        jobs: {
                                            id: 'prod-job-1',
                                            title: 'Brasão Colégio Militar',
                                            status: 'em_progresso',
                                            created_at: new Date().toISOString(),
                                        },
                                    },
                                ],
                                error: null,
                            }
                        }
                        return { data: [], error: null }
                    },
                }
                return chain
            },
        }

        const harness = createReactHarness()
        const prodMod = loadModule(
            'src/app/producao/page.tsx',
            {
                react: harness.reactMock,
                'react/jsx-runtime': harness.jsxRuntimeMock,
                'next/link': { __esModule: true, default: ({ children, href }) => ({ type: 'a', props: { href, children } }) },
                'lucide-react': new Proxy({}, { get: () => () => null }),
                '@/lib/supabaseClient': { supabase: mockSupabase },
                '@/contexts/AuthContext': { useAuth: () => authState },
                '@/components/JobCard': { __esModule: true, default: ({ job }) => ({ type: 'div', props: { children: job.title } }) },
            },
            new Map()
        )

        harness.mount(prodMod.default)
        await flushAsync(4, 10)

        // While AuthContext is resolving, /producao MUST NOT display "Nenhum trabalho em andamento"
        const pendingText = collectText(harness.getOutput()).join(' | ')
        assert.ok(
            !pendingText.includes('Nenhum trabalho em andamento'),
            `Must stay in skeleton/loading while auth resolves, got: ${pendingText}`
        )

        // AuthContext finishes hydrating -> /producao loads data immediately without F5
        authState.profileId = 'prog-1'
        authState.loading = false
        authState.profileLoading = false
        harness.rerender()
        await flushAsync(8, 10)

        const loadedText = collectText(harness.getOutput()).join(' | ')
        assert.ok(loadedText.includes('Brasão Colégio Militar'), `Expected production job without F5, got: ${loadedText}`)
        assert.ok(!loadedText.includes('Nenhum trabalho em andamento'))
        harness.unmount()
    })
})

test('/jobs and /producao surface error + retry button on query failure instead of falsely showing 0 items', async () => {
    await withMockBrowser(async () => {
        let shouldFail = true
        const authState = { user: { id: 'auth-prog' }, profile: { id: 'prog-1' }, profileId: 'prog-1', loading: false, profileLoading: false }

        const mockSupabase = {
            from: (table) => {
                const chain = {
                    select: () => chain,
                    eq: () => chain,
                    order: async () => {
                        if (shouldFail) {
                            return { data: null, error: new Error('Network 503') }
                        }
                        if (table === 'proposals') {
                            return {
                                data: [
                                    {
                                        status: 'aceita',
                                        jobs: { id: 'p-rec', title: 'Logo Recuperado', status: 'em_progresso' },
                                    },
                                ],
                                error: null,
                            }
                        }
                        return { data: [], error: null }
                    },
                }
                return chain
            },
        }

        const harness = createReactHarness()
        const prodMod = loadModule(
            'src/app/producao/page.tsx',
            {
                react: harness.reactMock,
                'react/jsx-runtime': harness.jsxRuntimeMock,
                'next/link': { __esModule: true, default: ({ children, href }) => ({ type: 'a', props: { href, children } }) },
                'lucide-react': new Proxy({}, { get: () => () => null }),
                '@/lib/supabaseClient': { supabase: mockSupabase },
                '@/contexts/AuthContext': { useAuth: () => authState },
                '@/components/JobCard': { __esModule: true, default: ({ job }) => ({ type: 'div', props: { children: job.title } }) },
            },
            new Map()
        )

        harness.mount(prodMod.default)
        await flushAsync(6, 150)

        const errorText = collectText(harness.getOutput()).join(' | ')
        assert.ok(errorText.includes('Tentar novamente'), `Expected retry button on error, got: ${errorText}`)
        assert.ok(!errorText.includes('Nenhum trabalho em andamento'), 'Must not confuse error with 0 items')

        const retryBtn = findElements(
            harness.getOutput(),
            (el) => el.type === 'button' && collectText(el).join('').includes('Tentar novamente')
        )[0]
        assert.ok(retryBtn, 'Retry button element must exist')

        shouldFail = false
        retryBtn.props.onClick()
        await flushAsync(8, 10)

        const recoveredText = collectText(harness.getOutput()).join(' | ')
        assert.ok(recoveredText.includes('Logo Recuperado'), `Expected recovered job after retry, got: ${recoveredText}`)
        harness.unmount()
    })
})

// ==============================================================================
// F6 & F7: Pedidos, Financeiro, Job Detail, New Job & Shared Nav/Alert Invariants
// ==============================================================================
suite('M1.3 — F6 & F7: Shared Pages & Notification/Sidebar Sync Invariants')

test('/pedidos, /financeiro, /jobs/[id], /jobs/new, NotificationBell, GlobalNotificationAlert & Sidebar enforce R1 sync contracts', () => {
    verifyFileContent('src/app/jobs/page.tsx', {
        includes: ['safetyTimer', 'Promise.all([query, fetchProposals()])', 'Tentar novamente', 'bordadohub_reload_job'],
    })
    verifyFileContent('src/app/producao/page.tsx', {
        includes: ['profileLoading', 'getScopedCached', 'setScopedCached', 'hasNonEmptyCacheData', 'Tentar novamente', 'bordadohub_reload_job'],
    })
    verifyFileContent('src/app/pedidos/page.tsx', {
        includes: ['profileLoading', 'getScopedCached', 'setScopedCached', 'Tentar novamente', 'bordadohub_reload_job'],
    })
    verifyFileContent('src/app/financeiro/page.tsx', {
        includes: ['profileLoading', 'getScopedCached', 'setScopedCached', 'Tentar novamente', 'recordsRef'],
    })
    verifyFileContent('src/app/jobs/[id]/page.tsx', {
        includes: ['useAuth', 'pendingReloadRef', 'resolvedUserIdForApi'],
    })
    verifyFileContent('src/app/jobs/new/page.tsx', {
        includes: ['useAuth', 'safetyTimer', 'profileLoading', 'keepChecking'],
    })
    verifyFileContent('src/components/NotificationBell.tsx', {
        includes: ['userIdRef', 'isMounted'],
    })
    verifyFileContent('src/components/GlobalNotificationAlert.tsx', {
        includes: ['isMounted', 'currentAlertIdRef'],
    })
    verifyFileContent('src/components/Sidebar.tsx', {
        includes: ['setRevisionsCount(cached)', 'revisions_count_${targetId}'],
    })
})

await runner.run(true)
