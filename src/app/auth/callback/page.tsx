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
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
                    if (error) throw error

                    // Get User ID from session
                    const userId = data.session?.user?.id

                    if (!userId) {
                        router.push('/login?error=no_user_id')
                        return
                    }

                    // Check if profile exists and get Role
                    const { data: profile } = await supabase
                        .from('users')
                        .select('role')
                        .eq('supabase_user_id', userId)
                        .single()

                    if (profile) {
                        // Profile Exists - Redirect based on Role
                        if (profile.role === 'cliente') {
                            router.push('/dashboard/client')
                        } else if (profile.role === 'criador') {
                            router.push('/jobs') // Mural de Pedidos
                        } else {
                            // Fallback for other roles or generic dashboard
                            router.push(next === '/dashboard' ? '/dashboard' : next)
                        }
                    } else {
                        // No Profile - Redirect to Profile Creation Page (Profile Page Fallback)
                        router.push(`/profile/${userId}`)
                    }

                    router.refresh()
                } catch (error) {
                    console.error('Error exchanging code for session:', error)
                    router.push('/login?error=auth_callback_error')
                }
            }
            exchangeCodeForSession()
        } else {
            // No code, redirect to login
            //router.push('/login') 
            // Better: Redirect to home? No, this page is specifically for callback.
            router.push('/login')
        }
    }, [code, router, next])

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
