'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface PushNotificationBannerProps {
  userId?: string | null
  role?: string | null
}

const DISMISSED_KEY = 'push_banner_dismissed'

export default function PushNotificationBanner({ userId, role }: PushNotificationBannerProps) {
  const { isSupported, isSubscribed, isLoading, permission, subscribe } = usePushNotifications({ userId, role })
  const [dismissed, setDismissed] = useState(true) // começa oculto para evitar flash
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const wasDismissed = localStorage.getItem(DISMISSED_KEY) === 'true'
    setDismissed(wasDismissed)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  const handleSubscribe = async () => {
    await subscribe()
    // Se o usuário aceitou, esconde o banner
    if (Notification.permission === 'granted') {
      localStorage.setItem(DISMISSED_KEY, 'true')
      setDismissed(true)
    }
  }

  // Não renderiza até hidratar, ou se já inscrito, sem suporte, negado ou dispensado
  if (!mounted || !isSupported || isSubscribed || permission === 'denied' || dismissed) {
    return null
  }

  return (
    <div className="relative w-full mb-4 rounded-xl overflow-hidden">
      {/* Gradiente âmbar/laranja alinhado ao estilo BordadoHUB */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-600/20 border border-amber-500/30 rounded-xl backdrop-blur-sm">
        {/* Ícone */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Bell className="w-4 h-4 text-amber-400 animate-[bell-ring_2s_ease-in-out_infinite]" />
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
          onClick={handleSubscribe}
          disabled={isLoading}
          className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-black text-xs font-bold rounded-lg transition-colors duration-150 whitespace-nowrap"
        >
          {isLoading ? 'Ativando...' : '🔔 Ativar Alertas'}
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
