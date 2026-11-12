'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'

interface PushNotificationBannerProps {
  userId?: string | null
  role?: string | null
}

const DISMISSED_KEY = 'push_banner_dismissed'

export default function PushNotificationBanner({ userId, role }: PushNotificationBannerProps) {
  const [state, setState] = useState<
    'loading' | 'unsupported' | 'dismissed' | 'subscribed' | 'denied' | 'show'
  >('loading')
  const [isActivating, setIsActivating] = useState(false)

  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return

    // 1. Suporte do navegador
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    if (!supported) {
      setState('unsupported')
      return
    }

    // 2. Permissão já negada
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }

    // 3. Usuário dispensou o banner antes
    if (localStorage.getItem(DISMISSED_KEY) === 'true') {
      setState('dismissed')
      return
    }

    // 4. Checa se já tem subscrição ativa
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setState(sub ? 'subscribed' : 'show')
      })
      .catch(() => {
        // SW não conseguiu registrar (HTTP, old browser) — mostra mesmo assim
        setState('show')
      })
  }, [])

  const handleActivate = async () => {
    if (isActivating) return
    setIsActivating(true)
    try {
      // Pede permissão
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setState('denied')
        return
      }

      // Busca VAPID key
      const keyRes = await fetch('/api/push/vapid-public-key')
      const { publicKey } = await keyRes.json()
      if (!publicKey) throw new Error('VAPID key indisponível')

      // Registra SW e cria subscrição
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: (() => {
          const padding = '='.repeat((4 - (publicKey.length % 4)) % 4)
          const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/')
          const raw = window.atob(base64)
          const arr = new Uint8Array(raw.length)
          for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
          return arr.buffer as ArrayBuffer
        })(),
      })

      // Salva no backend
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

      localStorage.setItem(DISMISSED_KEY, 'true')
      setState('subscribed')
    } catch (err) {
      console.warn('[PushBanner] erro ao ativar:', err)
    } finally {
      setIsActivating(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setState('dismissed')
  }

  // Só mostra o banner no estado 'show'
  if (state !== 'show') return null

  return (
    <div className="relative w-full mb-4 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-600/20 border border-amber-500/30 rounded-xl backdrop-blur-sm">
        {/* Ícone */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Bell className="w-4 h-4 text-amber-400" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-200 leading-tight">
            Ative os alertas e nunca perca um pedido
          </p>
          <p className="text-xs text-amber-300/70 mt-0.5 leading-tight">
            Receba notificações mesmo com o site fechado
          </p>
        </div>

        {/* Botão ativar */}
        <button
          onClick={handleActivate}
          disabled={isActivating}
          className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-black text-xs font-bold rounded-lg transition-colors duration-150 whitespace-nowrap"
        >
          {isActivating ? 'Ativando...' : '🔔 Ativar Alertas'}
        </button>

        {/* Fechar */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-amber-400/60 hover:text-amber-400 transition-colors"
          aria-label="Dispensar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
