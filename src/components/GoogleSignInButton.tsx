'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

interface GoogleSignInButtonProps {
    mode?: 'signin' | 'signup'
    text?: string
}

export default function GoogleSignInButton({ mode = 'signin', text }: GoogleSignInButtonProps) {
    const searchParams = useSearchParams()
    const redirectParam = searchParams?.get('redirect')
    const [loading, setLoading] = useState(false)

    const defaultText = mode === 'signup' ? 'Cadastrar com Google' : 'Entrar com Google'
    const buttonText = text || defaultText

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true)
            const origin = typeof window !== 'undefined' && window.location.origin
                ? window.location.origin
                : 'https://bordadohub.com'

            const nextQuery = redirectParam && redirectParam.startsWith('/')
                ? `?next=${encodeURIComponent(redirectParam)}`
                : ''

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${origin}/auth/callback${nextQuery}`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'select_account',
                    },
                },
            })

            if (error) {
                console.error('Google OAuth error:', error)
                toast.error('Erro ao conectar com Google: ' + error.message)
                setLoading(false)
            }
        } catch (err: any) {
            console.error('Unexpected Google OAuth error:', err)
            toast.error('Erro ao iniciar login com Google.')
            setLoading(false)
        }
    }

    return (
        <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex justify-center items-center gap-3 px-4 py-3 border border-gray-700 rounded-xl shadow-sm bg-[#0F1115] hover:bg-[#181C26] active:scale-[0.99] text-sm font-semibold text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFAE00]/50 transition-all disabled:opacity-50 cursor-pointer"
        >
            {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
                <svg className="h-5 w-5 shrink-0" aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
            )}
            <span>{loading ? 'Conectando ao Google...' : buttonText}</span>
        </button>
    )
}
