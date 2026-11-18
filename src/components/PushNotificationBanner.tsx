'use client'

import { Bell, X } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface PushNotificationBannerProps {
  userId?: string | null
  role?: string | null
}

export default function PushNotificationBanner({ userId, role }: PushNotificationBannerProps) {
  const { bannerState, isLoading: isActivating, subscribe, dismiss } = usePushNotifications({
    userId,
    role,
  })

  // Só mostra o banner no estado 'show'
  if (bannerState !== 'show') return null

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
          onClick={() => void subscribe()}
          disabled={isActivating}
          className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-black text-xs font-bold rounded-lg transition-colors duration-150 whitespace-nowrap"
        >
          {isActivating ? 'Ativando...' : '🔔 Ativar Alertas'}
        </button>

        {/* Fechar */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 text-amber-400/60 hover:text-amber-400 transition-colors"
          aria-label="Dispensar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
