'use client'

import { useState, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react'
import GoogleSignInButton from '@/components/GoogleSignInButton'

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectUrl = searchParams.get('redirect')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { data: authData, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error('Login error:', error)
            setError(error.message)
            setLoading(false)
        } else {
            console.log('Login successful')

            if (redirectUrl && redirectUrl.startsWith('/')) {
                router.push(redirectUrl)
                router.refresh()
                return
            }

            // Fallback baseado no papel do usuário
            const userId = authData.user?.id
            if (userId) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('role, is_programmer')
                    .eq('supabase_user_id', userId)
                    .maybeSingle()

                if (profile?.is_programmer || profile?.role === 'criador') {
                    router.push('/jobs')
                } else {
                    router.push('/pedidos')
                }
            } else {
                router.push('/jobs')
            }
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen bg-[#0F1115] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-5">
                        <Link href="/" className="inline-block group">
                            <Image
                                src="/brand/logo-dark.png"
                                alt="BordadoHub"
                                width={180}
                                height={78}
                                className="h-16 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_0_25px_rgba(255,174,0,0.25)]"
                                priority
                            />
                        </Link>
                    </div>
                    <p className="text-gray-400 text-sm">
                        Marketplace de Matrizes de Bordado
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-[#1A1D23] py-8 px-6 shadow-2xl rounded-xl border border-[#FFAE00]/20 sm:px-10">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {/* Google Login */}
                        <div>
                            <GoogleSignInButton mode="signin" text="Entrar com Google" />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[#1A1D23] text-gray-400">Ou continue com email</span>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <Mail className="w-4 h-4 text-[#FFAE00]" />
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <Lock className="w-4 h-4 text-[#FFAE00]" />
                                Senha
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#FFAE00] to-[#FF8C00] text-[#0F1115] py-3 px-4 rounded-lg font-bold hover:from-[#FF8C00] hover:to-[#FFAE00] focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:ring-offset-2 focus:ring-offset-[#0F1115] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-[#FFAE00]/20 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-[#0F1115] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    <span>Entrar</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-6 text-center space-y-2">
                        <p className="text-sm text-gray-400">
                            Não tem uma conta?{' '}
                            <Link
                                href={redirectUrl ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : '/register'}
                                className="text-[#FFAE00] hover:text-[#FF8C00] font-semibold transition-colors"
                            >
                                Criar conta grátis
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Back to Home */}
                <div className="mt-8 text-center">
                    <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
                    >
                        ← Voltar para o início
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function Login() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#FFAE00]/20 border-t-[#FFAE00] rounded-full animate-spin" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
