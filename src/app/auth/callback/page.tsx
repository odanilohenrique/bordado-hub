'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function AuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    useEffect(() => {
        if (code) {
            const exchangeCodeForSession = async () => {
                try {
                    const { error } = await supabase.auth.exchangeCodeForSession(code)
                    if (error) throw error

                    // Redirect to dashboard or next url
                    router.push(next)
                    router.refresh()
                } catch (error) {
                    console.error('Error exchanging code for session:', error)
                    router.push('/login?error=auth_callback_error')
                }
            }
            exchangeCodeForSession()
        } else {
            router.push('/login')
        }
    }, [code, next, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1115]">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Autenticando...</p>
            </div>
        </div>
    )
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0F1115]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Carregando...</p>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    )
}
