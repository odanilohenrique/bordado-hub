'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface GoogleSignInButtonProps {
    mode?: 'signin' | 'signup'
    text?: string
}

export default function GoogleSignInButton({ mode = 'signin', text = 'Entrar com Google' }: GoogleSignInButtonProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [gisLoaded, setGisLoaded] = useState(false)
    const buttonRef = useRef<HTMLDivElement>(null)
    const rawNonceRef = useRef<string>('')

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '153551002018-br71bolmr709r9qhv0m2eo9os4ccuild.apps.googleusercontent.com'

    // Generate secure nonce pair
    const generateNonce = async (): Promise<[string, string]> => {
        try {
            const raw = crypto.randomUUID()
            const encoder = new TextEncoder()
            const encoded = encoder.encode(raw)
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const hashed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
            return [raw, hashed]
        } catch {
            const randomStr = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
            return [randomStr, randomStr]
        }
    }

    const handleAuthSuccess = async (user: any) => {
        try {
            const userId = user.id
            const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture

            const { data: profile } = await supabase
                .from('users')
                .select('role, avatar_url')
                .eq('supabase_user_id', userId)
                .maybeSingle()

            if (profile) {
                if (!profile.avatar_url && googleAvatar) {
                    await supabase
                        .from('users')
                        .update({ avatar_url: googleAvatar })
                        .eq('supabase_user_id', userId)
                }

                if (profile.role === 'cliente') router.push('/pedidos')
                else if (profile.role === 'criador') router.push('/producao')
                else router.push('/pedidos')
            } else {
                try {
                    await fetch('/api/create-profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
                            email: user.email,
                            role: 'criador',
                            avatar_url: googleAvatar
                        })
                    })
                } catch (e) {
                    console.error('Auto create profile error:', e)
                }
                router.push('/pedidos')
            }
            router.refresh()
        } catch (err) {
            console.error('Profile redirect error:', err)
            router.push('/pedidos')
            router.refresh()
        }
    }

    const handleCredentialResponse = async (response: any) => {
        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: response.credential,
                nonce: rawNonceRef.current || undefined,
            })

            if (error) throw error

            if (data?.user) {
                toast.success('Login realizado com sucesso!')
                await handleAuthSuccess(data.user)
            }
        } catch (err: any) {
            console.error('Google Sign In Error:', err)
            toast.error('Erro na autenticação do Google: ' + (err.message || 'Tente novamente'))
            setLoading(false)
        }
    }

    // Fallback traditional OAuth redirect if needed
    const handleFallbackOAuth = async () => {
        const origin = typeof window !== 'undefined' && window.location.origin
            ? window.location.origin
            : 'https://bordadohub.com'

        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })
    }

    useEffect(() => {
        let isMounted = true

        const setupGoogle = async () => {
            const [rawNonce, hashedNonce] = await generateNonce()
            rawNonceRef.current = rawNonce

            const initGIS = () => {
                if (!isMounted) return
                const google = (window as any).google
                if (!google?.accounts?.id) return

                google.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleCredentialResponse,
                    nonce: hashedNonce,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                })

                if (buttonRef.current) {
                    buttonRef.current.innerHTML = ''
                    google.accounts.id.renderButton(buttonRef.current, {
                        theme: 'filled_black',
                        size: 'large',
                        type: 'standard',
                        shape: 'rectangular',
                        text: mode === 'signup' ? 'signup_with' : 'signin_with',
                        logo_alignment: 'left',
                        width: buttonRef.current.clientWidth || 320,
                        locale: 'pt-BR',
                    })
                    setGisLoaded(true)
                }
            }

            if ((window as any).google?.accounts?.id) {
                initGIS()
            } else {
                const existingScript = document.getElementById('google-jssdk')
                if (!existingScript) {
                    const script = document.createElement('script')
                    script.id = 'google-jssdk'
                    script.src = 'https://accounts.google.com/gsi/client'
                    script.async = true
                    script.defer = true
                    script.onload = () => {
                        if (isMounted) initGIS()
                    }
                    document.body.appendChild(script)
                } else {
                    existingScript.addEventListener('load', initGIS)
                }
            }
        }

        setupGoogle()

        return () => {
            isMounted = false
        }
    }, [clientId, mode])

    return (
        <div className="w-full flex flex-col items-center">
            {/* Google Identity Services official iframe button */}
            <div 
                ref={buttonRef} 
                className={`w-full flex justify-center min-h-[44px] ${gisLoaded ? 'block' : 'hidden'}`}
            />

            {/* Fallback button while GIS script loads or if blocked by adblockers */}
            {!gisLoaded && (
                <button
                    type="button"
                    onClick={handleFallbackOAuth}
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-3 px-4 py-3 border border-gray-700 rounded-lg shadow-sm bg-[#0F1115] text-sm font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFAE00] transition-all disabled:opacity-50"
                >
                    <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M12.0003 20.45c4.65 0 8.45-3.8 8.45-8.45 0-0.65-0.1-1.3-0.2-1.9H12.0003v3.75h4.75c-0.2 1.1-0.8 2-1.6 2.65v2.2h2.6c1.5-1.4 2.4-3.5 2.4-5.95 0-0.6-0.1-1.2-0.2-1.8H12.0003V8.85h8.9c0.1 0.6 0.1 1.2 0.1 1.8 0 5.3-3.6 9.8-8.9 9.8-5.4 0-9.8-4.4-9.8-9.8s4.4-9.8 9.8-9.8c2.65 0 5.05 0.95 6.9 2.5l-2.65 2.65c-1.15-1.1-2.7-1.75-4.25-1.75-3.55 0-6.4 2.85-6.4 6.4s2.85 6.4 6.4 6.4z" fill="currentColor" />
                        <path d="M23.49 12.275c0-0.9-.1-1.75-.25-2.55H12v4.75h6.5c-.3 1.5-1.15 2.75-2.45 3.6v3h3.95c2.3-2.15 3.65-5.3 3.65-8.8z" fill="#4285F4" />
                        <path d="M12 24c3.25 0 6-1.1 8-2.95l-3.95-3c-1.1.75-2.55 1.2-4.05 1.2-3.1 0-5.75-2.1-6.7-4.95H1.3v3.1C3.35 21.5 7.35 24 12 24z" fill="#34A853" />
                        <path d="M5.3 14.3c-.25-.75-.4-1.55-.4-2.3s.15-1.55.4-2.3V6.6H1.3C.45 8.3 0 10.1 0 12s.45 3.7 1.3 5.4l4-3.1z" fill="#FBBC05" />
                        <path d="M12 4.8c1.75 0 3.35.6 4.65 1.85l3.5-3.5C17.95 1.05 15.2 0 12 0 7.35 0 3.35 2.5 1.3 6.6l4 3.1c.95-2.85 3.6-4.9 6.7-4.9z" fill="#EA4335" />
                    </svg>
                    {loading ? 'Conectando...' : text}
                </button>
            )}

            {loading && (
                <p className="text-xs text-center text-gray-400 mt-2 animate-pulse">
                    Autenticando com Google...
                </p>
            )}
        </div>
    )
}
