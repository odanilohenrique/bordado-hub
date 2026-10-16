'use client'

import { useEffect, Suspense, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function AuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/pedidos'

    // Status para feedback na interface
    const [status, setStatus] = useState('Verificando confirmação de e-mail...')

    // Refs para evitar execuções duplicadas
    const processedCode = useRef(false)
    const isRedirecting = useRef(false)

    useEffect(() => {
        // Função para tratar autenticação e redirecionamento de sucesso
        const handleAuthSuccess = async (userId: string) => {
            if (isRedirecting.current) return
            isRedirecting.current = true
            setStatus('E-mail verificado! Entrando no BordadoHUB...')

            try {
                // Checa perfil e avatar
                const { data: profile } = await supabase
                    .from('users')
                    .select('role, avatar_url')
                    .eq('supabase_user_id', userId)
                    .single()

                const { data: { user } } = await supabase.auth.getUser()
                const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture

                if (profile) {
                    if (!profile.avatar_url && googleAvatar) {
                        await supabase
                            .from('users')
                            .update({ avatar_url: googleAvatar })
                            .eq('supabase_user_id', userId)
                    }

                    if (next && next !== '/pedidos' && next.startsWith('/')) {
                        router.push(next)
                    } else if (profile.role === 'criador' || (profile as any).is_programmer) {
                        router.push('/jobs')
                    } else {
                        router.push('/pedidos')
                    }
                } else {
                    try {
                        await fetch('/api/create-profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId,
                                name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0],
                                email: user?.email,
                                role: 'cliente',
                                is_programmer: false,
                                avatar_url: googleAvatar
                            })
                        })
                    } catch (e) {
                        console.error('Auto create profile error:', e)
                    }
                    router.push(next && next.startsWith('/') ? next : '/pedidos')
                }
                router.refresh()
            } catch (err) {
                console.error('Profile fetch error:', err)
                router.push('/pedidos')
            }
        }

        // 1. Detecção de Hash Fragment (fluxo implícito do Supabase, ex: #access_token=...&type=signup)
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
            try {
                const hashParams = new URLSearchParams(window.location.hash.substring(1))
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')

                if (accessToken && refreshToken) {
                    setStatus('Confirmando autenticação...')
                    supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    }).then(({ data, error }) => {
                        if (!error && data?.session?.user) {
                            handleAuthSuccess(data.session.user.id)
                        }
                    })
                }
            } catch (hashErr) {
                console.error('Erro ao processar hash de autenticação:', hashErr)
            }
        }

        // 2. Troca manual de código PKCE (?code=...)
        if (code && !processedCode.current) {
            processedCode.current = true
            setStatus('Confirmando código de verificação...')

            supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
                if (error) {
                    console.error('Erro na troca do código:', error)
                } else if (data.session?.user) {
                    handleAuthSuccess(data.session.user.id)
                }
            })
        }

        // 3. Listener do Supabase Auth para capturar SIGNED_IN
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
                handleAuthSuccess(session.user.id)
            }
        })

        // 4. Timeout Failsafe: se já estiver logado, redireciona
        const timeoutId = setTimeout(async () => {
            if (isRedirecting.current) return

            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                handleAuthSuccess(session.user.id)
            } else {
                console.warn('Timeout na verificação de autenticação -> Redirecionando para login')
                router.push('/login?message=email_confirmado')
            }
        }, 6000)

        return () => {
            clearTimeout(timeoutId)
            subscription.unsubscribe()
        }
    }, [code, router, next])

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1115] text-[#F3F4F6] px-4">
            <div className="text-center max-w-sm">
                <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white text-base font-semibold animate-pulse">{status}</p>
                <p className="text-xs text-gray-500 mt-2">Você será redirecionado para a plataforma em instantes...</p>
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
