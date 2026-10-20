'use client'

import { useEffect, Suspense, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function AuthCallbackContent() {
    const searchParams = useSearchParams()
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/pedidos'

    // Status para feedback na interface
    const [status, setStatus] = useState('Verificando confirmação de acesso...')

    // Refs para evitar execuções duplicadas
    const processedCode = useRef(false)
    const isRedirecting = useRef(false)

    useEffect(() => {
        // Redireciona com window.location.replace para garantir troca limpa de contexto
        // e evitar travamento do Next.js App Router SPA em transições de autenticação
        const safeRedirect = (target: string) => {
            if (typeof window !== 'undefined') {
                window.location.replace(target)
            }
        }

        // Função para tratar autenticação e redirecionamento rápido
        const handleAuthSuccess = async (userId: string) => {
            if (isRedirecting.current) return
            isRedirecting.current = true
            setStatus('Autenticado com sucesso! Entrando...')

            const defaultDestination = next && next.startsWith('/') ? next : '/pedidos'

            try {
                // Tenta consultar papel do usuário com limite rígido de 1.2s para nunca travar a tela
                const userPromise = supabase
                    .from('users')
                    .select('role, is_programmer, avatar_url')
                    .eq('supabase_user_id', userId)
                    .maybeSingle()

                const timeoutPromise = new Promise<{ data: any }>((resolve) =>
                    setTimeout(() => resolve({ data: null }), 1200)
                )

                const result = await Promise.race([userPromise, timeoutPromise])
                const profile = result?.data

                // Sincroniza foto do Google silenciosamente no background se não tiver
                supabase.auth.getUser().then(({ data: { user } }) => {
                    const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
                    if (googleAvatar && profile && !profile.avatar_url) {
                        supabase.from('users').update({ avatar_url: googleAvatar }).eq('supabase_user_id', userId).then(() => {})
                    }
                }).catch(() => {})

                if (profile) {
                    if (next && next !== '/pedidos' && next.startsWith('/')) {
                        safeRedirect(next)
                        return
                    }
                    if (profile.role === 'criador' || profile.is_programmer) {
                        safeRedirect('/jobs')
                        return
                    }
                }

                safeRedirect(defaultDestination)
            } catch (err) {
                console.warn('Erro ou timeout leve na consulta de perfil:', err)
                safeRedirect(defaultDestination)
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
                        } else {
                            safeRedirect('/pedidos')
                        }
                    }).catch(() => safeRedirect('/pedidos'))
                }
            } catch (hashErr) {
                console.error('Erro ao processar hash de autenticação:', hashErr)
                safeRedirect('/pedidos')
            }
        }

        // 2. Troca manual de código PKCE (?code=...)
        if (code && !processedCode.current) {
            processedCode.current = true
            setStatus('Confirmando código de verificação...')

            supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
                if (error) {
                    console.error('Erro na troca do código:', error)
                    // Se falhar a troca do código mas já houver sessão ativa, redireciona
                    supabase.auth.getSession().then(({ data: sData }) => {
                        if (sData?.session?.user) {
                            handleAuthSuccess(sData.session.user.id)
                        } else {
                            safeRedirect('/login?message=erro_verificacao')
                        }
                    })
                } else if (data.session?.user) {
                    handleAuthSuccess(data.session.user.id)
                } else {
                    safeRedirect('/pedidos')
                }
            }).catch(() => safeRedirect('/pedidos'))
        }

        // 3. Listener do Supabase Auth para capturar SIGNED_IN
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
                handleAuthSuccess(session.user.id)
            }
        })

        // 4. Timeout Failsafe Absoluto (3 segundos): nunca deixa o usuário preso
        const failsafeTimeout = setTimeout(async () => {
            if (isRedirecting.current) return

            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    handleAuthSuccess(session.user.id)
                } else {
                    console.warn('Timeout na verificação -> Redirecionando para login')
                    safeRedirect('/login?message=email_confirmado')
                }
            } catch {
                safeRedirect('/pedidos')
            }
        }, 3000)

        return () => {
            clearTimeout(failsafeTimeout)
            subscription.unsubscribe()
        }
    }, [code, next])

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
