'use client'

import { useEffect, Suspense, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function AuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    // Status for UI feedback
    const [status, setStatus] = useState('Verificando credenciais...')

    // Refs to prevent double-execution
    const processedCode = useRef(false)
    const isRedirecting = useRef(false)

    useEffect(() => {
        // Function to handle successful authentication
        const handleAuthSuccess = async (userId: string) => {
            if (isRedirecting.current) return
            isRedirecting.current = true
            setStatus('Autenticado! Redirecionando...')

            try {
                // Check Profile Role
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('supabase_user_id', userId)
                    .single()

                if (profile) {
                    if (profile.role === 'cliente') router.push('/dashboard/client')
                    else if (profile.role === 'criador') router.push('/jobs')
                    else router.push(next === '/dashboard' ? '/dashboard' : next)
                } else {
                    router.push(`/profile/${userId}`)
                }
                router.refresh()
            } catch (err) {
                console.error('Profile fetch error:', err)
                router.push('/dashboard')
            }
        }

        // 1. TIMEOUT FAILSAFE (5 seconds)
        // If nothing happens, force check session or go to login
        const timeoutId = setTimeout(async () => {
            if (isRedirecting.current) return
            console.warn('Auth callback timeout - forcing session check')

            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                handleAuthSuccess(session.user.id)
            } else {
                console.warn('No session found after timeout -> Login')
                router.push('/login?error=timeout')
            }
        }, 5000)

        // 2. LISTENER (Catch implicit flow, persistence, or code exchange success)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                handleAuthSuccess(session.user.id)
            }
        })

        // 3. MANUAL CODE EXCHANGE (PKCE)
        // Only run if code exists and haven't processed yet
        if (code && !processedCode.current) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            processedCode.current = true
            setStatus('Trocando código de acesso...')

            supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
                if (error) {
                    console.error('Exchange error:', error)
                    // We don't redirect to login immediately; we let the timeout or listener handle it
                    // because maybe the listener picks it up via hash
                } else if (data.session) {
                    handleAuthSuccess(data.session.user.id)
                }
            })
        }

        return () => {
            clearTimeout(timeoutId)
            subscription.unsubscribe()
        }
    }, [code, router, next])

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1115] text-[#F3F4F6]">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400 text-lg animate-pulse">{status}</p>
                <p className="text-xs text-gray-600 mt-4">Aguarde um momento...</p>
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
