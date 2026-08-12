'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import GlobalNotificationAlert from '@/components/GlobalNotificationAlert'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Dispara de forma assíncrona a finalização automática de jobs atrasados (Lazy Evaluation)
        // Isso roda em background para fechar e liberar pagamento de jobs entregues há mais de 12h
        const autoFinalize = async () => {
            try {
                await supabase.rpc('auto_finalize_expired_jobs')
            } catch (err) {
                console.error('Failed to auto-finalize jobs:', err)
            }
        }
        autoFinalize()
    }, [])

    return (
        <>
            {children}
            <GlobalNotificationAlert />
        </>
    )
}
