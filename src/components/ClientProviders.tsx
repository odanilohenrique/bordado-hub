'use client'

import GlobalNotificationAlert from '@/components/GlobalNotificationAlert'
import { AuthProvider } from '@/contexts/AuthContext'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <GlobalNotificationAlert />
        </AuthProvider>
    )
}
