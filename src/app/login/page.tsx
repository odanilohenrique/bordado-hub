'use client'

import { useState, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import BrandLogo from '@/components/BrandLogo'

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectUrl = searchParams.get('redirect')
    const conviteParam = searchParams.get('convite') || searchParams.get('invite')
    const effectiveRedirect = redirectUrl || (conviteParam ? `/profile/me?convite=${conviteParam}` : null)

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

            if (effectiveRedirect && effectiveRedirect.startsWith('/')) {
                router.push(effectiveRedirect)
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
        <div className="min-h-[calc(100dvh-9rem)] bg-[var(--bg-primary)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-5">
                        <Link href="/" className="inline-flex items-center justify-center group">
                            <BrandLogo
                                variant="stacked"
                                className="h-14 sm:h-16 w-auto transition-transform group-hover:scale-105"
                                priority
                            />
                        </Link>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm">
                        Marketplace de Matrizes de Bordado
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-[var(--bg-surface)] py-8 px-6 rounded-2xl border border-[var(--border-hairline)] sm:px-10">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {/* Google Login */}
                        <div>
                            <GoogleSignInButton mode="signin" text="Entrar com Google" />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[var(--border-hairline)]"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[var(--bg-surface)] text-[var(--text-secondary)]">Ou continue com email</span>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                                <Mail className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
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
                                className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] focus:border-transparent transition-colors"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                                <Lock className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
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
                                className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] focus:border-transparent transition-colors"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-[#DC2626]/10 dark:bg-[#EF4444]/10 border border-[#DC2626]/30 dark:border-[#EF4444]/30 rounded-lg p-3 flex items-center gap-2 text-[#DC2626] dark:text-[#F87171] text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full min-h-[48px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-3 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[var(--bg-surface)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                        <p className="text-sm text-[var(--text-secondary)]">
                            Não tem uma conta?{' '}
                            <Link
                                href={effectiveRedirect ? `/register?redirect=${encodeURIComponent(effectiveRedirect)}` : '/register'}
                                className="text-[#2563EB] dark:text-[#60A5FA] hover:underline font-semibold"
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
                        className="inline-flex items-center min-h-[44px] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
            <div className="min-h-[calc(100dvh-9rem)] bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#2563EB]/20 border-t-[#2563EB] dark:border-[#3B82F6]/20 dark:border-t-[#3B82F6] rounded-full animate-spin" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
