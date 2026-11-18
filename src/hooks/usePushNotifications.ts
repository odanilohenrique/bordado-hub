'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'

export const PUSH_BANNER_DISMISSED_KEY = 'push_banner_dismissed'

export type PushBannerState =
  | 'loading'
  | 'unsupported'
  | 'dismissed'
  | 'subscribed'
  | 'denied'
  | 'show'

export interface PushStateSignals {
  supported: boolean
  permission: NotificationPermission | 'unknown'
  dismissedLocally: boolean
  hasBrowserSub: boolean | null
  hasServerSub: boolean | null
  hasUserId: boolean
  authPending?: boolean
  swCheckFailed?: boolean
}

export function resolvePushBannerState(signals: PushStateSignals): PushBannerState {
  if (!signals.supported) return 'unsupported'
  if (signals.permission === 'denied') return 'denied'
  if (signals.permission === 'granted') return 'subscribed'
  if (signals.dismissedLocally) return 'dismissed'
  if (signals.hasBrowserSub === true || signals.hasServerSub === true) return 'subscribed'
  if (signals.swCheckFailed) return 'unsupported'
  if (signals.authPending) return 'loading'
  if (signals.hasBrowserSub === null) return 'loading'
  if (signals.hasUserId && signals.hasServerSub === null) return 'loading'
  return 'show'
}

export function safeGetDismissedFlag(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(PUSH_BANNER_DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function safeSetDismissedFlag(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PUSH_BANNER_DISMISSED_KEY, 'true')
  } catch {
    // Ignore storage errors in Safari Private / sandboxed iframes
  }
}

export function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData =
    typeof window !== 'undefined' && typeof window.atob === 'function'
      ? window.atob(base64)
      : globalThis.atob(base64)
  const arr = new Uint8Array([...rawData].map((char) => char.charCodeAt(0)))
  return arr.buffer as ArrayBuffer
}

function getSyncStorageKey(userId: string | null): string {
  return `bh_push_synced_${userId || 'anon'}`
}

function safeGetSessionFlag(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function safeSetSessionFlag(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, '1')
  } catch {
    // Ignore sessionStorage errors
  }
}

function safeRemoveSessionFlag(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Ignore sessionStorage errors
  }
}

async function raceWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timerId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timerId = setTimeout(() => resolve(null), ms)
      }),
    ])
  } finally {
    if (timerId !== undefined) clearTimeout(timerId)
  }
}

async function getAccessTokenSafe(timeoutMs = 2000): Promise<string | null> {
  try {
    const result = await raceWithTimeout(supabase.auth.getSession(), timeoutMs)
    if (!result || typeof result !== 'object' || !('data' in result)) {
      return null
    }
    return result.data?.session?.access_token ?? null
  } catch {
    return null
  }
}

async function checkServerPushStatus(signal: AbortSignal, userId: string): Promise<boolean> {
  const token = await getAccessTokenSafe(2000)
  if (!token || signal.aborted) return false

  const timeoutController = new AbortController()
  const onParentAbort = () => timeoutController.abort()
  if (signal.aborted) {
    timeoutController.abort()
  } else {
    signal.addEventListener('abort', onParentAbort, { once: true })
  }
  const fetchTimer = setTimeout(() => timeoutController.abort(), 5000)

  try {
    const res = await fetch(`/api/push/status?userId=${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: timeoutController.signal,
    })
    if (!res.ok) return false
    const data = (await res.json()) as { hasSubscription?: boolean }
    return Boolean(data?.hasSubscription === true)
  } catch {
    return false
  } finally {
    clearTimeout(fetchTimer)
    signal.removeEventListener('abort', onParentAbort)
  }
}

async function postSubscriptionToBackend(
  sub: PushSubscription,
  userId: string | null,
  role: string | null,
  signal?: AbortSignal
): Promise<boolean> {
  const subJson = sub.toJSON()
  const keys = subJson.keys as { p256dh?: string; auth?: string } | undefined
  if (!subJson.endpoint || !keys?.p256dh || !keys?.auth) {
    return false
  }

  const token = await getAccessTokenSafe(2000)
  if (signal?.aborted) return false

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userId: userId || null,
      role: role || 'cliente',
    }),
    signal,
  })

  return res.ok
}

const inFlightSyncs = new Map<string, Promise<void>>()

async function syncExistingSubscription(
  signal: AbortSignal,
  sub: PushSubscription,
  userId: string | null,
  role: string | null
): Promise<void> {
  const syncKey = getSyncStorageKey(userId)
  if (safeGetSessionFlag(syncKey)) return

  const existing = inFlightSyncs.get(syncKey)
  if (existing) {
    await existing
    return
  }

  let syncPromise: Promise<void> | null = null
  syncPromise = (async () => {
    try {
      const ok = await postSubscriptionToBackend(sub, userId, role, signal)
      if (ok && !signal.aborted) {
        safeSetSessionFlag(syncKey)
      }
    } catch {
      // Silent best-effort sync
    } finally {
      if (syncPromise && inFlightSyncs.get(syncKey) === syncPromise) {
        inFlightSyncs.delete(syncKey)
      }
    }
  })()

  inFlightSyncs.set(syncKey, syncPromise)
  await syncPromise
}

async function silentSyncSubscription(
  signal: AbortSignal,
  userId: string | null,
  role: string | null,
  swRegistrationRef: { current: ServiceWorkerRegistration | null }
): Promise<void> {
  try {
    if (signal.aborted) return
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    if (signal.aborted) return
    swRegistrationRef.current = reg

    let sub = await reg.pushManager.getSubscription()
    if (signal.aborted) return

    let createdNewSub = false
    if (!sub) {
      const keyRes = await fetch('/api/push/vapid-public-key', { signal })
      if (!keyRes.ok || signal.aborted) return

      const keyData = (await keyRes.json()) as { publicKey?: string }
      const publicKey = keyData?.publicKey
      if (!publicKey || signal.aborted) return

      const readyReg = (await raceWithTimeout(navigator.serviceWorker.ready, 5000)) || reg
      if (signal.aborted) return

      sub = await readyReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      createdNewSub = true
    }

    if (!sub || signal.aborted) return

    const syncKey = getSyncStorageKey(userId)
    if (createdNewSub || !safeGetSessionFlag(syncKey)) {
      const ok = await postSubscriptionToBackend(sub, userId, role, signal)
      if (ok && !signal.aborted) {
        safeSetSessionFlag(syncKey)
      }
    }
  } catch {
    // Silent best-effort background sync — never revert bannerState or isSubscribed
  }
}

export interface UsePushOptions {
  userId?: string | null
  role?: string | null
}

export interface UsePushReturn {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  permission: NotificationPermission | 'unknown'
  bannerState: PushBannerState
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  dismiss: () => void
}

export function usePushNotifications({ userId, role }: UsePushOptions = {}): UsePushReturn {
  const router = useRouter()
  const { user: authUser, profileId: authProfileId, profile: authProfile, loading: authLoading } =
    useAuth()

  const effectiveUserId = userId ?? authProfileId ?? null
  const effectiveRole = role ?? authProfile?.role ?? null
  const authPending = !effectiveUserId && (authLoading || Boolean(authUser))

  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown')
  const [bannerState, setBannerState] = useState<PushBannerState>('loading')
  const [authWaitTimedOut, setAuthWaitTimedOut] = useState(false)
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null)
  const routerRef = useRef(router)

  useEffect(() => {
    routerRef.current = router
  }, [router])

  useEffect(() => {
    if (!authPending) {
      setAuthWaitTimedOut(false)
      return
    }
    const timer = setTimeout(() => {
      setAuthWaitTimedOut(true)
    }, 2500)
    return () => clearTimeout(timer)
  }, [authPending])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setIsSupported(supported)

    if (!supported) {
      setIsSubscribed(false)
      setBannerState('unsupported')
      return
    }

    const controller = new AbortController()

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.url) {
        routerRef.current.push(event.data.url)
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)

    const cleanup = () => {
      controller.abort()
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }

    const perm = Notification.permission
    setPermission(perm)

    if (perm === 'denied') {
      setIsSubscribed(false)
      setBannerState('denied')
      return cleanup
    }

    if (perm === 'granted') {
      safeSetDismissedFlag()
      setIsSubscribed(true)
      setBannerState('subscribed')
      void silentSyncSubscription(
        controller.signal,
        effectiveUserId,
        effectiveRole,
        swRegistration
      )
      return cleanup
    }

    if (safeGetDismissedFlag()) {
      setIsSubscribed(false)
      setBannerState('dismissed')
      return cleanup
    }

    setBannerState('loading')

    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        if (controller.signal.aborted) return
        swRegistration.current = reg

        const sub = await reg.pushManager.getSubscription()
        if (controller.signal.aborted) return

        if (sub) {
          setIsSubscribed(true)
          setBannerState('subscribed')
          if (effectiveUserId) {
            void syncExistingSubscription(controller.signal, sub, effectiveUserId, effectiveRole)
          }
          return
        }

        if (authPending && !authWaitTimedOut) {
          const livePerm = Notification.permission
          const liveDismissed = safeGetDismissedFlag()
          setPermission(livePerm)
          setIsSubscribed(livePerm === 'granted')
          setBannerState(
            resolvePushBannerState({
              supported: true,
              permission: livePerm,
              dismissedLocally: liveDismissed,
              hasBrowserSub: false,
              hasServerSub: null,
              hasUserId: Boolean(effectiveUserId),
              authPending: true,
              swCheckFailed: false,
            })
          )
          return
        }

        let hasServerSub = false
        if (effectiveUserId) {
          hasServerSub = await checkServerPushStatus(controller.signal, effectiveUserId)
          if (controller.signal.aborted) return
        }

        const livePerm = Notification.permission
        const liveDismissed = safeGetDismissedFlag()
        setPermission(livePerm)

        if (livePerm === 'granted') {
          safeSetDismissedFlag()
        }

        const nextState = resolvePushBannerState({
          supported: true,
          permission: livePerm,
          dismissedLocally: liveDismissed,
          hasBrowserSub: false,
          hasServerSub,
          hasUserId: Boolean(effectiveUserId),
          authPending: false,
          swCheckFailed: false,
        })

        setIsSubscribed(nextState === 'subscribed')
        setBannerState(nextState)
      } catch {
        if (controller.signal.aborted) return
        const livePerm = typeof Notification !== 'undefined' ? Notification.permission : 'unknown'
        const liveDismissed = safeGetDismissedFlag()
        setPermission(livePerm)

        if (livePerm === 'granted') {
          safeSetDismissedFlag()
        }

        const failClosedState = resolvePushBannerState({
          supported: true,
          permission: livePerm,
          dismissedLocally: liveDismissed,
          hasBrowserSub: null,
          hasServerSub: null,
          hasUserId: Boolean(effectiveUserId),
          authPending: false,
          swCheckFailed: true,
        })

        setIsSubscribed(failClosedState === 'subscribed')
        setBannerState(failClosedState)
      }
    })()

    return cleanup
  }, [effectiveUserId, effectiveRole, authPending, authWaitTimedOut])

  const subscribe = useCallback(async () => {
    if (!isSupported || isLoading) return
    setIsLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm === 'denied') {
        setIsSubscribed(false)
        setBannerState('denied')
        return
      }

      if (perm !== 'granted') {
        setIsSubscribed(false)
        setBannerState(safeGetDismissedFlag() ? 'dismissed' : 'show')
        return
      }

      // Immediately persist dismissal and hide banner once user grants permission
      safeSetDismissedFlag()
      setIsSubscribed(true)
      setBannerState('subscribed')

      try {
        let reg = swRegistration.current
        if (!reg) {
          reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          swRegistration.current = reg
        }
        const readyReg = (await raceWithTimeout(navigator.serviceWorker.ready, 5000)) || reg

        const keyRes = await fetch('/api/push/vapid-public-key')
        if (!keyRes.ok) {
          throw new Error(`VAPID key request failed (${keyRes.status})`)
        }
        const keyData = (await keyRes.json()) as { publicKey?: string }
        const publicKey = keyData?.publicKey
        if (!publicKey) {
          throw new Error('VAPID key não disponível.')
        }

        let sub = await readyReg.pushManager.getSubscription()
        if (!sub) {
          sub = await readyReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          })
        }

        const subOk = await postSubscriptionToBackend(sub, effectiveUserId, effectiveRole)
        if (!subOk) {
          throw new Error('Falha ao salvar subscrição no backend.')
        }

        safeSetSessionFlag(getSyncStorageKey(effectiveUserId))
      } catch (err) {
        console.warn('[push] subscribe error:', err)
      }
    } catch (err) {
      console.warn('[push] requestPermission error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, isLoading, effectiveUserId, effectiveRole])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || isLoading) return
    setIsLoading(true)
    try {
      const reg =
        swRegistration.current || (await navigator.serviceWorker.getRegistration('/sw.js'))

      if (!reg) {
        safeRemoveSessionFlag(getSyncStorageKey(effectiveUserId))
        setIsSubscribed(false)
        const livePerm = typeof Notification !== 'undefined' ? Notification.permission : 'unknown'
        setPermission(livePerm)
        setBannerState(
          resolvePushBannerState({
            supported: true,
            permission: livePerm,
            dismissedLocally: safeGetDismissedFlag(),
            hasBrowserSub: false,
            hasServerSub: false,
            hasUserId: Boolean(effectiveUserId),
          })
        )
        return
      }

      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const res = await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        if (!res.ok) {
          throw new Error(`Unsubscribe request failed (${res.status})`)
        }
        await sub.unsubscribe()
      }

      safeRemoveSessionFlag(getSyncStorageKey(effectiveUserId))
      safeRemoveSessionFlag(getSyncStorageKey(null))
      setIsSubscribed(false)

      const livePerm = typeof Notification !== 'undefined' ? Notification.permission : 'unknown'
      setPermission(livePerm)
      setBannerState(
        resolvePushBannerState({
          supported: true,
          permission: livePerm,
          dismissedLocally: safeGetDismissedFlag(),
          hasBrowserSub: false,
          hasServerSub: false,
          hasUserId: Boolean(effectiveUserId),
        })
      )
    } catch (err) {
      console.warn('[push] unsubscribe error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, isLoading, effectiveUserId])

  const dismiss = useCallback(() => {
    safeSetDismissedFlag()
    setBannerState('dismissed')
  }, [])

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    bannerState,
    subscribe,
    unsubscribe,
    dismiss,
  }
}
