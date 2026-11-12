'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = new Uint8Array([...rawData].map((char) => char.charCodeAt(0)))
  return arr.buffer as ArrayBuffer
}

interface UsePushOptions {
  userId?: string | null
  role?: string | null
}

interface UsePushReturn {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  permission: NotificationPermission | 'unknown'
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function usePushNotifications({ userId, role }: UsePushOptions = {}): UsePushReturn {
  const router = useRouter()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown')
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null)

  // Detecta suporte e estado atual
  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setIsSupported(supported)
    if (!supported) return

    setPermission(Notification.permission)

    // Registra o service worker e checa subscrição ativa
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async (reg) => {
        swRegistration.current = reg
        const sub = await reg.pushManager.getSubscription()
        setIsSubscribed(!!sub)
      })
      .catch((err) => console.warn('[push] SW register error:', err))

    // Escuta mensagens do SW (deep-link após clique na notificação)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.url) {
        router.push(event.data.url)
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [router])

  const subscribe = useCallback(async () => {
    if (!isSupported || isLoading) return
    setIsLoading(true)
    try {
      // 1. Pede permissão ao usuário
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      // 2. Garante o SW registrado
      let reg = swRegistration.current
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        swRegistration.current = reg
      }

      // 3. Busca a VAPID public key
      const keyRes = await fetch('/api/push/vapid-public-key')
      const { publicKey } = await keyRes.json()
      if (!publicKey) throw new Error('VAPID key não disponível.')

      // 4. Cria a subscrição no navegador
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // 5. Serializa e envia ao backend
      const subJson = sub.toJSON()
      const keys = subJson.keys as { p256dh: string; auth: string }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userId: userId || null,
          role: role || 'cliente',
        }),
      })

      setIsSubscribed(true)
    } catch (err) {
      console.warn('[push] subscribe error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, isLoading, userId, role])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || isLoading) return
    setIsLoading(true)
    try {
      const reg = swRegistration.current || (await navigator.serviceWorker.getRegistration('/sw.js'))
      if (!reg) return

      const sub = await reg.pushManager.getSubscription()
      if (!sub) {
        setIsSubscribed(false)
        return
      }

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })

      await sub.unsubscribe()
      setIsSubscribed(false)
    } catch (err) {
      console.warn('[push] unsubscribe error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, isLoading])

  return { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe }
}
