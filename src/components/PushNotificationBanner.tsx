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
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 bg-[#2563EB]/[0.07] dark:bg-[#3B82F6]/10 border border-[#2563EB]/25 dark:border-[#3B82F6]/25 rounded-xl">
        {/* Ícone */}
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#2563EB]/15 dark:bg-[#3B82F6]/20 flex items-center justify-center">
          <Bell className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
            Ative os alertas e nunca perca um pedido
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-tight">
            Receba notificações mesmo com o site fechado
          </p>
        </div>

        {/* Botão ativar */}
        <button
          type="button"
          onClick={() => void subscribe()}
          disabled={isActivating}
          className="inline-flex items-center gap-1.5 flex-shrink-0 px-3.5 min-h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5 shrink-0" />
          {isActivating ? 'Ativando...' : 'Ativar Alertas'}
        </button>

        {/* Fechar */}
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--btn-glass-bg)] transition-colors cursor-pointer"
          aria-label="Dispensar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
