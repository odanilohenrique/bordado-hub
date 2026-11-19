'use client'

import { useState, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { User, Mail, Lock, Zap, UserPlus, CheckCircle2, RotateCw, ArrowRight, ShieldCheck } from 'lucide-react'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import BrandLogo from '@/components/BrandLogo'

function RegisterForm() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Estados para confirmação de e-mail
    const [confirmationSent, setConfirmationSent] = useState(false)
    const [resending, setResending] = useState(false)
    const [resendMessage, setResendMessage] = useState<string | null>(null)

    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectUrl = searchParams.get('redirect')
    const conviteParam = searchParams.get('convite') || searchParams.get('invite')
    const effectiveRedirect = redirectUrl || (conviteParam ? `/profile/me?convite=${conviteParam}` : null)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setResendMessage(null)

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.')
            setLoading(false)
            return
        }

        try {
            // 1. Criar usuário no Supabase Auth com link de retorno
            const callbackUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(effectiveRedirect || '/jobs')}`
                : undefined

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: callbackUrl,
                    data: {
                        full_name: name,
                        name: name
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Erro ao criar usuário.')

            // Caso o e-mail já esteja cadastrado no Supabase
            if (authData.user.identities && authData.user.identities.length === 0) {
                setError('Já existe uma conta cadastrada com este e-mail. Por favor, faça login ou recupere sua senha.')
                setLoading(false)
                return
            }

            // 2. Cria ou atualiza o perfil em public.users
            try {
                await fetch('/api/create-profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: authData.user.id,
                        name,
                        email,
                        role: 'cliente',
                        is_client: true,
                        is_programmer: false
                    }),
                })
            } catch (err) {
                console.error('Aviso ao criar perfil inicial:', err)
            }

            // 3. Se a confirmação de e-mail estiver ativa, não há sessão imediata
            if (!authData.session) {
                setConfirmationSent(true)
                setLoading(false)
                return
            }

            // Se o e-mail já estiver confirmado ou a confirmação estiver desativada no Supabase
            if (effectiveRedirect && effectiveRedirect.startsWith('/')) {
                router.push(effectiveRedirect)
            } else {
                router.push('/jobs')
            }
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    const handleResendEmail = async () => {
        if (!email) return
        setResending(true)
        setResendMessage(null)
        try {
            const callbackUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(effectiveRedirect || '/jobs')}`
                : undefined

            const { error: resendErr } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                    emailRedirectTo: callbackUrl
                }
            })

            if (resendErr) throw resendErr
            setResendMessage('Novo e-mail de confirmação enviado com sucesso!')
        } catch (err: any) {
            setResendMessage(`Erro ao reenviar: ${err.message}`)
        } finally {
            setResending(false)
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
                        Crie sua conta para comprar e vender matrizes de bordado
                    </p>
                </div>

                {/* Form Card ou Card de Confirmação */}
                <div className="bg-[var(--bg-surface)] py-8 px-6 rounded-2xl border border-[var(--border-hairline)] sm:px-10">
                    {confirmationSent ? (
                        /* Tela de Confirmação de E-mail */
                        <div className="text-center space-y-5 animate-in fade-in duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 border border-[#2563EB]/25 dark:border-[#3B82F6]/30 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center mx-auto">
                                <Mail className="w-8 h-8" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Confirme seu E-mail</h2>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Enviamos um link de confirmação para o endereço:
                                </p>
                                <div className="p-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] font-mono text-sm text-[#2563EB] dark:text-[#60A5FA] font-semibold break-all">
                                    {email}
                                </div>
                            </div>

                            <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl p-4 text-left space-y-2 text-xs text-[var(--text-secondary)]">
                                <div className="flex items-start gap-2">
                                    <ShieldCheck className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0 mt-0.5" />
                                    <span>Abra sua caixa de entrada e clique no botão para <strong className="text-[var(--text-primary)]">ativar sua conta</strong>.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[var(--text-secondary)] shrink-0 mt-0.5" />
                                    <span>Não encontrou? Verifique também a pasta de <strong className="text-[var(--text-primary)]">Spam</strong> ou <strong className="text-[var(--text-primary)]">Lixo Eletrônico</strong>.</span>
                                </div>
                            </div>

                            {resendMessage && (
                                <p className={`text-xs font-medium ${resendMessage.includes('Erro') ? 'text-[#DC2626] dark:text-[#F87171]' : 'text-[#0F766E] dark:text-[#14B8A6]'}`}>
                                    {resendMessage}
                                </p>
                            )}

                            <div className="pt-2 space-y-3">
                                <Link
                                    href={effectiveRedirect ? `/login?redirect=${encodeURIComponent(effectiveRedirect)}` : '/login'}
                                    className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm rounded-lg transition-colors"
                                >
                                    <span>Já confirmei, ir para o Login</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleResendEmail}
                                    disabled={resending}
                                    className="w-full min-h-[44px] py-2.5 px-4 border border-[var(--border-glass)] bg-[var(--btn-glass-bg)] hover:border-[#2563EB]/40 dark:hover:border-[#3B82F6]/40 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                                    {resending ? 'Reenviando e-mail...' : 'Reenviar e-mail de confirmação'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Formulário Padrão de Cadastro */
                        <form className="space-y-5" onSubmit={handleRegister}>
                            {/* Google Login */}
                            <div>
                                <GoogleSignInButton mode="signup" text="Cadastrar com Google" />
                            </div>

                            <div className="relative my-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[var(--border-hairline)]"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-3 bg-[var(--bg-surface)] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Ou crie com email</span>
                                </div>
                            </div>

                            {/* Name */}
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                                    <User className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                                    Nome Completo
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Seu nome"
                                    className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] focus:border-transparent transition-colors text-sm"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                                    <Mail className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
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
                                    className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] focus:border-transparent transition-colors text-sm"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label htmlFor="password" className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                                    <Lock className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                                    Senha
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] focus:border-transparent transition-colors text-sm"
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1.5">
                                <label htmlFor="confirmPassword" className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                                    <Lock className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                                    Confirmar Senha
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repita sua senha"
                                    className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] focus:border-transparent transition-colors text-sm"
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-[#DC2626]/10 dark:bg-[#EF4444]/10 border border-[#DC2626]/30 dark:border-[#EF4444]/30 text-[#DC2626] dark:text-[#F87171] px-4 py-3 rounded-lg flex items-start gap-3">
                                    <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Criando conta...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Criar Conta Gratuita
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Divider e Login (se não estiver na tela de confirmação) */}
                    {!confirmationSent && (
                        <div className="mt-8">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[var(--border-hairline)]" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-3 bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                                        Já tem uma conta?
                                    </span>
                                </div>
                            </div>

                            {/* Login Link */}
                            <div className="mt-5">
                                <Link
                                    href={effectiveRedirect ? `/login?redirect=${encodeURIComponent(effectiveRedirect)}` : '/login'}
                                    className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3 px-4 border border-[var(--border-glass)] bg-[var(--btn-glass-bg)] hover:border-[#2563EB]/40 dark:hover:border-[#3B82F6]/40 rounded-lg text-[var(--text-primary)] transition-colors text-sm font-semibold"
                                >
                                    Fazer Login
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-8 text-center">
                    <p className="text-[var(--text-secondary)] text-xs sm:text-sm">
                        Ao criar uma conta, você concorda com nossos{' '}
                        <Link href="/termos" className="text-[#2563EB] dark:text-[#60A5FA] hover:underline font-medium">
                            Termos de Uso
                        </Link>{' '}
                        e nossa{' '}
                        <Link href="/privacidade" className="text-[#2563EB] dark:text-[#60A5FA] hover:underline font-medium">
                            Política de Privacidade
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function Register() {
    return (
        <Suspense fallback={
            <div className="min-h-[calc(100dvh-9rem)] bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#2563EB]/20 border-t-[#2563EB] dark:border-[#3B82F6]/20 dark:border-t-[#3B82F6] rounded-full animate-spin" />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    )
}
