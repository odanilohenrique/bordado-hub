'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import GlobalNotificationAlert from '@/components/GlobalNotificationAlert'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <GlobalNotificationAlert />
        </>
    )
}
