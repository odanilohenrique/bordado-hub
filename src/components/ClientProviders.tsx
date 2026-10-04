'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import GlobalNotificationAlert from '@/components/GlobalNotificationAlert'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Run auto-finalize lazily after page has fully loaded without blocking initial render
        const timer = setTimeout(async () => {
            try {
                await supabase.rpc('auto_finalize_expired_jobs')
            } catch {
                // silent
            }
        }, 3000)

        return () => clearTimeout(timer)
    }, [])

    return (
        <>
            {children}
            <GlobalNotificationAlert />
        </>
    )
}
