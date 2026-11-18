/**
 * MILESTONE M3 REGRESSION & BEHAVIORAL TEST SUITE (R5 / F15)
 * Executes real production modules in-memory via TypeScript transpileModule
 * (compatible with Node 20 CI & Node 24 local — zero temp files, zero new packages):
 *   - src/app/api/push/status/route.ts
 *   - src/hooks/usePushNotifications.ts
 *   - src/components/PushNotificationBanner.tsx
 *
 * Run: node scripts/test-m3-notifications.mjs
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { createTestRunner, createMockSupabase, verifyFileContent } from './test-helpers.mjs'

const require = createRequire(import.meta.url)
const ROOT = process.cwd()

// ---------------------------------------------------------------------------
// In-memory TypeScript / TSX loader
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

function loadTsModule(relPath, mocks = {}, cache = new Map()) {
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
      return loadTsModule(target, mocks, cache)
    }
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const target = path.resolve(path.dirname(fullPath), specifier)
      return loadTsModule(target, mocks, cache)
    }
    return require(specifier)
  }

  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', outputText)
  fn(mod.exports, localRequire, mod, fullPath, path.dirname(fullPath))
  return mod.exports
}

// ---------------------------------------------------------------------------
// Lightweight React Hook + JSX Harness
// ---------------------------------------------------------------------------
function createReactHarness() {
  const states = []
  const refs = []
  const callbacks = []
  const effects = []
  let hookCursor = 0
  let currentComponent = null
  let currentProps = null
  let lastRender = null
  let mounted = false
  let pendingRender = false

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
    rerender(nextProps) {
      currentProps = nextProps
      return runRender()
    },
    getOutput() {
      return lastRender
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

function findElements(node, predicate, out = []) {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const item of node) findElements(item, predicate, out)
    return out
  }
  if (predicate(node)) out.push(node)
  if (node.props && node.props.children) {
    findElements(node.props.children, predicate, out)
  }
  return out
}

async function flushAsync(turns = 6) {
  for (let i = 0; i < turns; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

// ---------------------------------------------------------------------------
// Browser & Global Environment Simulator
// ---------------------------------------------------------------------------
function createMemoryStorage(shouldThrow = false) {
  const store = new Map()
  return {
    getItem(key) {
      if (shouldThrow) throw new Error('SecurityError: storage disabled')
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, val) {
      if (shouldThrow) throw new Error('SecurityError: storage disabled')
      store.set(key, String(val))
    },
    removeItem(key) {
      if (shouldThrow) throw new Error('SecurityError: storage disabled')
      store.delete(key)
    },
    _dump: () => Object.fromEntries(store.entries()),
  }
}

async function withMockBrowser(config, fn) {
  const saved = {
    window: globalThis.window,
    navigator: globalThis.navigator,
    Notification: globalThis.Notification,
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage,
    fetch: globalThis.fetch,
    PushManager: globalThis.PushManager,
  }

  const localStorageMock = createMemoryStorage(Boolean(config.throwStorage))
  if (config.initialLocalStorage && !config.throwStorage) {
    for (const [k, v] of Object.entries(config.initialLocalStorage)) {
      localStorageMock.setItem(k, v)
    }
  }
  const sessionStorageMock = createMemoryStorage(Boolean(config.throwStorage))

  const messageListeners = new Set()
  const subscriptionObj = config.browserSub || null

  const regMock = {
    pushManager: {
      getSubscription: async () => {
        if (config.getSubscriptionError) throw config.getSubscriptionError
        return subscriptionObj
      },
      subscribe: async (opts) => {
        if (config.subscribeError) throw config.subscribeError
        if (config.onPushManagerSubscribe) config.onPushManagerSubscribe(opts)
        return (
          config.createdSub || {
            endpoint: 'https://push.example.com/sub-1',
            toJSON: () => ({
              endpoint: 'https://push.example.com/sub-1',
              keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
            }),
            unsubscribe: async () => true,
          }
        )
      },
    },
  }

  let currentPermission = config.permission ?? 'default'

  const NotificationMock = {
    get permission() {
      return currentPermission
    },
    requestPermission: async () => {
      if (config.requestPermissionResult) {
        currentPermission = config.requestPermissionResult
      }
      return currentPermission
    },
  }

  const navigatorMock = {
    serviceWorker: {
      register: async (...args) => {
        if (config.registerError) throw config.registerError
        if (config.onRegister) config.onRegister(...args)
        return regMock
      },
      getRegistration: async () => (config.registerError ? null : regMock),
      ready: config.readyPromise || Promise.resolve(regMock),
      addEventListener: (type, listener) => {
        if (type === 'message') messageListeners.add(listener)
      },
      removeEventListener: (type, listener) => {
        if (type === 'message') messageListeners.delete(listener)
      },
    },
  }

  const windowMock = {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
    PushManager: config.unsupported ? undefined : function PushManager() {},
    Notification: config.unsupported ? undefined : NotificationMock,
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
  }

  if (config.unsupported) {
    delete windowMock.PushManager
    delete windowMock.Notification
  }

  const fetchMock = config.fetch || (async () => new Response('{}', { status: 200 }))

  try {
    Object.defineProperty(globalThis, 'window', { value: windowMock, configurable: true, writable: true })
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true, writable: true })
    Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, configurable: true, writable: true })
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true, writable: true })

    if (config.unsupported) {
      Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true })
      Object.defineProperty(globalThis, 'Notification', { value: undefined, configurable: true, writable: true })
    } else {
      Object.defineProperty(globalThis, 'navigator', { value: navigatorMock, configurable: true, writable: true })
      Object.defineProperty(globalThis, 'Notification', { value: NotificationMock, configurable: true, writable: true })
    }

    return await fn({
      localStorageMock,
      sessionStorageMock,
      dispatchSwMessage(data) {
        for (const listener of messageListeners) {
          listener({ data })
        }
      },
      setPermission(p) {
        currentPermission = p
      },
    })
  } finally {
    const restoreProp = (key, val) => {
      if (val === undefined) {
        try {
          delete globalThis[key]
        } catch {
          Object.defineProperty(globalThis, key, { value: undefined, configurable: true, writable: true })
        }
      } else {
        Object.defineProperty(globalThis, key, { value: val, configurable: true, writable: true })
      }
    }
    restoreProp('window', saved.window)
    restoreProp('navigator', saved.navigator)
    restoreProp('Notification', saved.Notification)
    restoreProp('localStorage', saved.localStorage)
    restoreProp('sessionStorage', saved.sessionStorage)
    restoreProp('fetch', saved.fetch)
    restoreProp('PushManager', saved.PushManager)
  }
}

function createPushModuleSet(harness, { authState = { user: null, profileId: null, profile: null, loading: false }, sessionToken = 'token_auth_1', routerPushCalls = [] } = {}) {
  const routerObj = {
    push: (url) => routerPushCalls.push(url),
  }
  const mocks = {
    react: harness.reactMock,
    'react/jsx-runtime': harness.jsxRuntimeMock,
    'next/navigation': {
      useRouter: () => routerObj,
    },
    '@/contexts/AuthContext': {
      useAuth: () => authState,
    },
    '@/lib/supabaseClient': {
      supabase: {
        auth: {
          getSession: async () => ({
            data: { session: sessionToken ? { access_token: sessionToken } : null },
            error: null,
          }),
        },
      },
    },
    'lucide-react': {
      Bell: () => null,
      X: () => null,
    },
  }

  const cache = new Map()
  const hookMod = loadTsModule('src/hooks/usePushNotifications.ts', mocks, cache)
  let latestHookResult = null
  const instrumentedHookMod = {
    ...hookMod,
    usePushNotifications: (opts) => {
      latestHookResult = hookMod.usePushNotifications(opts)
      return latestHookResult
    },
  }
  const bannerMod = loadTsModule(
    'src/components/PushNotificationBanner.tsx',
    { ...mocks, '@/hooks/usePushNotifications': instrumentedHookMod },
    cache
  )
  return { hookMod, bannerMod, getLatestHookResult: () => latestHookResult }
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
const runner = createTestRunner()

runner.suite('M3-A: State Machine & Pure Helpers (usePushNotifications.ts)')

runner.test('1. resolvePushBannerState precedence handles granted, denied, dismissed, browser/server sub, and fail-closed', async () => {
  const harness = createReactHarness()
  const { hookMod } = createPushModuleSet(harness)
  const { resolvePushBannerState, PUSH_BANNER_DISMISSED_KEY } = hookMod

  assert.equal(PUSH_BANNER_DISMISSED_KEY, 'push_banner_dismissed')

  assert.equal(
    resolvePushBannerState({
      supported: false,
      permission: 'default',
      dismissedLocally: false,
      hasBrowserSub: false,
      hasServerSub: false,
      hasUserId: false,
    }),
    'unsupported'
  )

  assert.equal(
    resolvePushBannerState({
      supported: true,
      permission: 'denied',
      dismissedLocally: false,
      hasBrowserSub: false,
      hasServerSub: false,
      hasUserId: false,
      swCheckFailed: true,
    }),
    'denied'
  )

  assert.equal(
    resolvePushBannerState({
      supported: true,
      permission: 'granted',
      dismissedLocally: false,
      hasBrowserSub: false,
      hasServerSub: false,
      hasUserId: true,
      swCheckFailed: true,
    }),
    'subscribed'
  )

  assert.equal(
    resolvePushBannerState({
      supported: true,
      permission: 'default',
      dismissedLocally: true,
      hasBrowserSub: false,
      hasServerSub: false,
      hasUserId: false,
      swCheckFailed: true,
    }),
    'dismissed'
  )

  assert.equal(
    resolvePushBannerState({
      supported: true,
      permission: 'default',
      dismissedLocally: false,
      hasBrowserSub: true,
      hasServerSub: false,
      hasUserId: false,
    }),
    'subscribed'
  )

  assert.equal(
    resolvePushBannerState({
      supported: true,
      permission: 'default',
      dismissedLocally: false,
      hasBrowserSub: false,
      hasServerSub: true,
      hasUserId: true,
    }),
    'subscribed'
  )

  assert.equal(
    resolvePushBannerState({
      supported: true,
      permission: 'default',
      dismissedLocally: false,
      hasBrowserSub: null,
      hasServerSub: null,
      hasUserId: false,
      swCheckFailed: true,
    }),
    'unsupported'
  )

  assert.equal(
    resolvePushBannerState({
      supported: true,
      permission: 'default',
      dismissedLocally: false,
      hasBrowserSub: false,
      hasServerSub: null,
      hasUserId: false,
      authPending: true,
    }),
    'loading'
  )

  assert.equal(
    resolvePushBannerState({
      supported: true,
      permission: 'default',
      dismissedLocally: false,
      hasBrowserSub: false,
      hasServerSub: false,
      hasUserId: true,
      authPending: false,
      swCheckFailed: false,
    }),
    'show'
  )
})

runner.suite('M3-B: PushNotificationBanner & Hook Suppression Scenarios')

runner.test('2. Notification.permission === "granted" suppresses banner immediately, persists DISMISSED_KEY, and survives silent sync failure', async () => {
  await withMockBrowser(
    {
      permission: 'granted',
      registerError: new Error('SW sync failed'),
    },
    async ({ localStorageMock }) => {
      const harness = createReactHarness()
      const { hookMod, bannerMod } = createPushModuleSet(harness)
      const PushNotificationBanner = bannerMod.default

      let hookResult
      function Probe(props) {
        hookResult = hookMod.usePushNotifications(props)
        return PushNotificationBanner(props)
      }

      const out = harness.mount(Probe, { userId: '11111111-1111-1111-1111-111111111111', role: 'criador' })
      await flushAsync()

      assert.equal(out, null)
      assert.equal(harness.getOutput(), null)
      assert.equal(hookResult.bannerState, 'subscribed')
      assert.equal(hookResult.isSubscribed, true)
      assert.equal(localStorageMock.getItem('push_banner_dismissed'), 'true')
      harness.unmount()
    }
  )
})

runner.test('3. Notification.permission === "denied" suppresses banner with state "denied"', async () => {
  await withMockBrowser({ permission: 'denied' }, async () => {
    const harness = createReactHarness()
    const { hookMod, bannerMod } = createPushModuleSet(harness)
    let hookResult
    function Probe(props) {
      hookResult = hookMod.usePushNotifications(props)
      return bannerMod.default(props)
    }

    const out = harness.mount(Probe, { userId: null, role: null })
    await flushAsync()

    assert.equal(out, null)
    assert.equal(hookResult.bannerState, 'denied')
    assert.equal(hookResult.isSubscribed, false)
    harness.unmount()
  })
})

runner.test('4. localStorage dismissed suppresses banner and Safari private-mode SecurityError is handled safely', async () => {
  await withMockBrowser(
    {
      permission: 'default',
      initialLocalStorage: { push_banner_dismissed: 'true' },
    },
    async () => {
      const harness = createReactHarness()
      const { hookMod, bannerMod } = createPushModuleSet(harness)
      let hookResult
      function Probe(props) {
        hookResult = hookMod.usePushNotifications(props)
        return bannerMod.default(props)
      }

      const out = harness.mount(Probe, { userId: null, role: null })
      await flushAsync()
      assert.equal(out, null)
      assert.equal(hookResult.bannerState, 'dismissed')
      harness.unmount()
    }
  )

  await withMockBrowser(
    {
      permission: 'default',
      throwStorage: true,
    },
    async () => {
      const harness = createReactHarness()
      const { hookMod, bannerMod } = createPushModuleSet(harness)
      let hookResult
      function Probe(props) {
        hookResult = hookMod.usePushNotifications(props)
        return bannerMod.default(props)
      }

      harness.mount(Probe, { userId: null, role: null })
      await flushAsync()
      assert.equal(hookResult.bannerState, 'show')
      assert.notEqual(harness.getOutput(), null)
      harness.unmount()
    }
  )
})

runner.test('5. Active browser reg.pushManager.getSubscription() suppresses banner as "subscribed"', async () => {
  let subscribePostCalls = 0
  await withMockBrowser(
    {
      permission: 'default',
      browserSub: {
        endpoint: 'https://push.example.com/active',
        toJSON: () => ({
          endpoint: 'https://push.example.com/active',
          keys: { p256dh: 'k1', auth: 'k2' },
        }),
      },
      fetch: async (url) => {
        if (String(url).includes('/api/push/subscribe')) subscribePostCalls++
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      },
    },
    async () => {
      const harness = createReactHarness()
      const { bannerMod, getLatestHookResult } = createPushModuleSet(harness)
      function Probe(props) {
        return bannerMod.default(props)
      }

      harness.mount(Probe, { userId: '22222222-2222-2222-2222-222222222222', role: 'criador' })
      await flushAsync()

      const hookResult = getLatestHookResult()
      assert.equal(harness.getOutput(), null)
      assert.equal(hookResult.bannerState, 'subscribed')
      assert.equal(hookResult.isSubscribed, true)
      assert.equal(subscribePostCalls, 1)
      harness.unmount()
    }
  )
})

runner.test('6. Server DB hasSubscription: true suppresses banner without writing DISMISSED_KEY to localStorage', async () => {
  const requestedUrls = []
  const requestedHeaders = []
  await withMockBrowser(
    {
      permission: 'default',
      browserSub: null,
      fetch: async (url, init) => {
        requestedUrls.push(String(url))
        requestedHeaders.push(init?.headers || {})
        return new Response(JSON.stringify({ hasSubscription: true }), { status: 200 })
      },
    },
    async ({ localStorageMock }) => {
      const harness = createReactHarness()
      const { hookMod, bannerMod } = createPushModuleSet(harness, { sessionToken: 'jwt_user_1' })
      let hookResult
      function Probe(props) {
        hookResult = hookMod.usePushNotifications(props)
        return bannerMod.default(props)
      }

      const uid = '33333333-3333-3333-3333-333333333333'
      harness.mount(Probe, { userId: uid, role: 'criador' })
      await flushAsync()

      assert.equal(harness.getOutput(), null)
      assert.equal(hookResult.bannerState, 'subscribed')
      assert.equal(hookResult.isSubscribed, true)
      assert.equal(localStorageMock.getItem('push_banner_dismissed'), null)
      assert.ok(requestedUrls.some((u) => u.includes(`/api/push/status?userId=${uid}`)))
      assert.equal(requestedHeaders[0].Authorization, 'Bearer jwt_user_1')
      harness.unmount()
    }
  )
})

runner.test('7. Async userId transition (null -> UUID), authPending anti-flash, and AbortController stale-response guard', async () => {
  const userA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const userB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

  let resolveUserA
  let userAAborted = false

  await withMockBrowser(
    {
      permission: 'default',
      browserSub: null,
      fetch: async (url, init) => {
        const strUrl = String(url)
        if (strUrl.includes(userA)) {
          return await new Promise((resolve) => {
            resolveUserA = () => resolve(new Response(JSON.stringify({ hasSubscription: false }), { status: 200 }))
            init?.signal?.addEventListener('abort', () => {
              userAAborted = true
              resolve(new Response(JSON.stringify({ hasSubscription: false }), { status: 200 }))
            })
          })
        }
        if (strUrl.includes(userB)) {
          return new Response(JSON.stringify({ hasSubscription: true }), { status: 200 })
        }
        return new Response(JSON.stringify({ hasSubscription: false }), { status: 200 })
      },
    },
    async () => {
      const harness = createReactHarness()
      const authState = { user: { id: 'auth-1' }, profileId: null, profile: null, loading: true }
      const { hookMod, bannerMod } = createPushModuleSet(harness, {
        authState,
        sessionToken: 'jwt_switch',
      })

      let hookResult
      function Probe(props) {
        hookResult = hookMod.usePushNotifications(props)
        return bannerMod.default(props)
      }

      // Cold load while AuthContext is still resolving -> anti-flash ('loading', renders null)
      harness.mount(Probe, { userId: null, role: null })
      await flushAsync()
      assert.equal(hookResult.bannerState, 'loading')
      assert.equal(harness.getOutput(), null)

      // Auth resolves to userA (in-flight slow request)
      authState.loading = false
      harness.rerender({ userId: userA, role: 'criador' })
      await flushAsync()

      // Rapidly switch to userB before userA finishes
      harness.rerender({ userId: userB, role: 'criador' })
      await flushAsync()

      assert.equal(userAAborted, true)
      if (resolveUserA) resolveUserA()
      await flushAsync()

      // userB has subscription -> must remain subscribed, never overwritten by stale userA
      assert.equal(hookResult.bannerState, 'subscribed')
      assert.equal(harness.getOutput(), null)
      harness.unmount()
    }
  )
})

runner.test('8. Fail-closed .catch() on SW/PushManager failure never falls back to "show"', async () => {
  for (const scenario of [
    { permission: 'granted', expected: 'subscribed' },
    { permission: 'denied', expected: 'denied' },
    { permission: 'default', initialLocalStorage: { push_banner_dismissed: 'true' }, expected: 'dismissed' },
    { permission: 'default', expected: 'unsupported' },
  ]) {
    await withMockBrowser(
      {
        permission: scenario.permission,
        initialLocalStorage: scenario.initialLocalStorage,
        registerError: new Error('SW unavailable'),
      },
      async () => {
        const harness = createReactHarness()
        const { hookMod, bannerMod } = createPushModuleSet(harness)
        let hookResult
        function Probe(props) {
          hookResult = hookMod.usePushNotifications(props)
          return bannerMod.default(props)
        }

        harness.mount(Probe, { userId: null, role: null })
        await flushAsync()
        assert.equal(hookResult.bannerState, scenario.expected)
        assert.equal(harness.getOutput(), null)
        harness.unmount()
      }
    )
  }
})

runner.test('9. subscribe() / handleActivate() persists DISMISSED_KEY immediately on "granted" even when VAPID/PushManager/API fail, handles "default"/"denied", and supports unsubscribe() + NAVIGATE', async () => {
  // 9a: VAPID returns 500 -> still persists DISMISSED_KEY and hides banner
  await withMockBrowser(
    {
      permission: 'default',
      requestPermissionResult: 'granted',
      fetch: async (url) => {
        if (String(url).includes('/api/push/vapid-public-key')) {
          return new Response('server error', { status: 500 })
        }
        return new Response('{}', { status: 200 })
      },
    },
    async ({ localStorageMock }) => {
      const harness = createReactHarness()
      const { bannerMod, getLatestHookResult } = createPushModuleSet(harness)
      function Probe(props) {
        return bannerMod.default(props)
      }

      harness.mount(Probe, { userId: '44444444-4444-4444-4444-444444444444', role: 'criador' })
      await flushAsync()
      assert.equal(getLatestHookResult().bannerState, 'show')

      const activateBtn = findElements(
        harness.getOutput(),
        (el) => el.type === 'button' && typeof el.props?.onClick === 'function' && !el.props['aria-label']
      )[0]
      assert.ok(activateBtn, 'Ativar Alertas button must be rendered in show state')

      await activateBtn.props.onClick()
      await flushAsync()

      const hookResult = getLatestHookResult()
      assert.equal(localStorageMock.getItem('push_banner_dismissed'), 'true')
      assert.equal(hookResult.isSubscribed, true)
      assert.equal(hookResult.bannerState, 'subscribed')
      assert.equal(harness.getOutput(), null)
      harness.unmount()
    }
  )

  // 9b: POST /api/push/subscribe returns 500 -> still keeps subscribed + dismissed
  await withMockBrowser(
    {
      permission: 'default',
      requestPermissionResult: 'granted',
      fetch: async (url) => {
        if (String(url).includes('/api/push/vapid-public-key')) {
          return new Response(JSON.stringify({ publicKey: 'BA==' }), { status: 200 })
        }
        if (String(url).includes('/api/push/subscribe')) {
          return new Response('db fail', { status: 500 })
        }
        return new Response('{}', { status: 200 })
      },
    },
    async ({ localStorageMock }) => {
      const harness = createReactHarness()
      const { hookMod } = createPushModuleSet(harness)
      let hookResult
      function Probe(props) {
        hookResult = hookMod.usePushNotifications(props)
        return null
      }
      harness.mount(Probe, { userId: '55555555-5555-5555-5555-555555555555', role: 'cliente' })
      await flushAsync()
      await hookResult.subscribe()
      await flushAsync()
      assert.equal(localStorageMock.getItem('push_banner_dismissed'), 'true')
      assert.equal(hookResult.isSubscribed, true)
      assert.equal(hookResult.bannerState, 'subscribed')
      harness.unmount()
    }
  )

  // 9c: requestPermission returns 'default' -> does NOT mark denied or DISMISSED_KEY
  await withMockBrowser(
    {
      permission: 'default',
      requestPermissionResult: 'default',
    },
    async ({ localStorageMock }) => {
      const harness = createReactHarness()
      const { hookMod } = createPushModuleSet(harness)
      let hookResult
      function Probe(props) {
        hookResult = hookMod.usePushNotifications(props)
        return null
      }
      harness.mount(Probe, { userId: null, role: null })
      await flushAsync()
      await hookResult.subscribe()
      await flushAsync()
      assert.equal(localStorageMock.getItem('push_banner_dismissed'), null)
      assert.equal(hookResult.bannerState, 'show')
      harness.unmount()
    }
  )

  // 9d: requestPermission returns 'denied' -> sets denied, does NOT set DISMISSED_KEY
  await withMockBrowser(
    {
      permission: 'default',
      requestPermissionResult: 'denied',
    },
    async ({ localStorageMock }) => {
      const harness = createReactHarness()
      const { hookMod } = createPushModuleSet(harness)
      let hookResult
      function Probe(props) {
        hookResult = hookMod.usePushNotifications(props)
        return null
      }
      harness.mount(Probe, { userId: null, role: null })
      await flushAsync()
      await hookResult.subscribe()
      await flushAsync()
      assert.equal(localStorageMock.getItem('push_banner_dismissed'), null)
      assert.equal(hookResult.bannerState, 'denied')
      harness.unmount()
    }
  )

  // 9e: NAVIGATE message listener + unsubscribe() checks res.ok and clears sync flag
  const pushedRoutes = []
  await withMockBrowser(
    {
      permission: 'default',
      browserSub: {
        endpoint: 'https://push.example.com/sub-unsub',
        toJSON: () => ({
          endpoint: 'https://push.example.com/sub-unsub',
          keys: { p256dh: 'p', auth: 'a' },
        }),
        unsubscribe: async () => true,
      },
      fetch: async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
    },
    async ({ dispatchSwMessage, sessionStorageMock }) => {
      const harness = createReactHarness()
      const { hookMod } = createPushModuleSet(harness, { routerPushCalls: pushedRoutes })
      let hookResult
      function Probe(props) {
        hookResult = hookMod.usePushNotifications(props)
        return null
      }
      const uid = '66666666-6666-6666-6666-666666666666'
      harness.mount(Probe, { userId: uid, role: 'criador' })
      await flushAsync()

      dispatchSwMessage({ type: 'NAVIGATE', url: '/jobs/abc' })
      assert.deepEqual(pushedRoutes, ['/jobs/abc'])

      assert.equal(sessionStorageMock.getItem(`bh_push_synced_${uid}`), '1')
      await hookResult.unsubscribe()
      await flushAsync()
      assert.equal(hookResult.isSubscribed, false)
      assert.equal(sessionStorageMock.getItem(`bh_push_synced_${uid}`), null)
      harness.unmount()
    }
  )
})

runner.suite('M3-C: Reconciliation & Contract Checks')

runner.test('10. PushNotificationBanner delegates cleanly to usePushNotifications with zero duplicated push logic', async () => {
  verifyFileContent('src/components/PushNotificationBanner.tsx', {
    includes: [
      "from '@/hooks/usePushNotifications'",
      'usePushNotifications({',
      "if (bannerState !== 'show') return null",
      'Ative os alertas e nunca perca um pedido',
    ],
    excludes: [
      'navigator.serviceWorker',
      'Notification.requestPermission',
      'push_banner_dismissed',
      '/api/push/',
      'urlBase64ToUint8Array',
    ],
  })

  verifyFileContent('src/app/jobs/page.tsx', {
    includes: ['<PushNotificationBanner userId={profileId} role={profile?.role} />'],
  })
})

runner.suite('M3-D: Backend GET /api/push/status Security & Identity Resolution')

runner.test('11. GET /api/push/status enforces Bearer auth, UUID validation, anti-ID-spoofing 403, users.id resolution, and minimal non-leaky response', async () => {
  const authUser1 = '11111111-1111-4111-8111-111111111111'
  const profileUser1 = '22222222-2222-4222-8222-222222222222'
  const authUser2 = '33333333-3333-4333-8333-333333333333'
  const profileUser2 = '44444444-4444-4444-8444-444444444444'
  const victimProfileId = '55555555-5555-4555-8555-555555555555'

  const mockDb = createMockSupabase({
    users: [
      { id: profileUser1, supabase_user_id: authUser1, name: 'User 1' },
      { id: profileUser2, supabase_user_id: authUser2, name: 'User 2' },
    ],
    push_subscriptions: [
      {
        id: '99999999-9999-4999-8999-999999999999',
        user_id: profileUser1,
        endpoint: 'https://fcm.googleapis.com/secret-endpoint',
        p256dh: 'secret-p256dh',
        auth: 'secret-auth',
        user_agent: 'Mozilla/5.0 Secret',
      },
    ],
  })

  const statusMod = loadTsModule('src/app/api/push/status/route.ts', {
    'next/server': {
      NextResponse: {
        json: (body, init = {}) =>
          new Response(JSON.stringify(body), {
            status: init.status || 200,
            headers: { 'content-type': 'application/json', ...(init.headers || {}) },
          }),
      },
    },
    '@/lib/supabaseClient': {
      createServiceClient: () => mockDb,
    },
  })

  assert.deepEqual(Object.keys(statusMod).sort(), ['GET', 'dynamic'])
  assert.equal(statusMod.dynamic, 'force-dynamic')

  // Missing Authorization header -> 401
  const resNoAuth = await statusMod.GET(new Request('https://bordadohub.com.br/api/push/status'))
  assert.equal(resNoAuth.status, 401)

  // Malformed Authorization header -> 401
  const resBadPrefix = await statusMod.GET(
    new Request('https://bordadohub.com.br/api/push/status', {
      headers: { Authorization: 'Basic abc' },
    })
  )
  assert.equal(resBadPrefix.status, 401)

  // Invalid / expired Bearer token -> 401
  const resInvalidToken = await statusMod.GET(
    new Request('https://bordadohub.com.br/api/push/status', {
      headers: { Authorization: 'Bearer invalid_token' },
    })
  )
  assert.equal(resInvalidToken.status, 401)

  // Malformed ?userId= -> 400
  const resBadUuid = await statusMod.GET(
    new Request('https://bordadohub.com.br/api/push/status?userId=not-a-uuid', {
      headers: { Authorization: `Bearer token_${authUser1}` },
    })
  )
  assert.equal(resBadUuid.status, 400)

  // Spoofed ?userId=<victim> -> 403
  const resSpoof = await statusMod.GET(
    new Request(`https://bordadohub.com.br/api/push/status?userId=${victimProfileId}`, {
      headers: { Authorization: `Bearer token_${authUser1}` },
    })
  )
  assert.equal(resSpoof.status, 403)

  // Valid token where authUser.id !== public.users.id, with subscription -> 200 { hasSubscription: true }
  const resSubscribed = await statusMod.GET(
    new Request(`https://bordadohub.com.br/api/push/status?userId=${profileUser1}`, {
      headers: { Authorization: `Bearer token_${authUser1}` },
    })
  )
  assert.equal(resSubscribed.status, 200)
  assert.equal(resSubscribed.headers.get('cache-control'), 'private, no-store')
  const bodySubscribed = await resSubscribed.json()
  assert.deepEqual(Object.keys(bodySubscribed), ['hasSubscription'])
  assert.equal(bodySubscribed.hasSubscription, true)

  const serialized = JSON.stringify(bodySubscribed)
  assert.ok(!serialized.includes('secret-endpoint'))
  assert.ok(!serialized.includes('secret-p256dh'))
  assert.ok(!serialized.includes('secret-auth'))
  assert.ok(!serialized.includes('Mozilla/5.0'))
  assert.ok(!serialized.includes('99999999'))

  // Valid token without subscription -> 200 { hasSubscription: false }
  const resUnsubscribed = await statusMod.GET(
    new Request(`https://bordadohub.com.br/api/push/status?userId=${profileUser2}`, {
      headers: { Authorization: `Bearer token_${authUser2}` },
    })
  )
  assert.equal(resUnsubscribed.status, 200)
  const bodyUnsubscribed = await resUnsubscribed.json()
  assert.deepEqual(bodyUnsubscribed, { hasSubscription: false })

  // Valid token without public.users row -> 200 { hasSubscription: false }
  const orphanAuthId = '77777777-7777-4777-8777-777777777777'
  const resNoProfile = await statusMod.GET(
    new Request('https://bordadohub.com.br/api/push/status', {
      headers: { Authorization: `Bearer token_${orphanAuthId}` },
    })
  )
  assert.equal(resNoProfile.status, 200)
  assert.deepEqual(await resNoProfile.json(), { hasSubscription: false })

  // Static AppSec check: selects only 'id', no select('*') or .or()
  verifyFileContent('src/app/api/push/status/route.ts', {
    includes: ["export const dynamic = 'force-dynamic'", 'auth.getUser', ".select('id')", 'hasSubscription'],
    excludes: ["select('*')", '.or(', 'p256dh', 'endpoint', 'user_agent'],
  })
})

runner.run(true)
