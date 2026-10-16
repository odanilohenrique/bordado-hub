'use client'

import { useState, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { User, Mail, Lock, Zap, UserPlus, CheckCircle2, RotateCw, ArrowRight, ShieldCheck } from 'lucide-react'
import GoogleSignInButton from '@/components/GoogleSignInButton'

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
                ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl || '/jobs')}`
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
            if (redirectUrl && redirectUrl.startsWith('/')) {
                router.push(redirectUrl)
            } else {
                router.push('/jobs')
            }
            router.refresh()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl || '/jobs')}`
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
        <div className="min-h-screen bg-[#0B0D11] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-5">
                        <Link href="/" className="inline-block group">
                            <Image
                                src="/brand/logo-dark-grossa.png"
                                alt="BordadoHub"
                                width={180}
                                height={78}
                                className="h-14 w-auto object-contain transition-transform group-hover:scale-105"
                                priority
                            />
                        </Link>
                    </div>
                    <p className="text-gray-400 text-sm">
                        Crie sua conta para comprar e vender matrizes de bordado
                    </p>
                </div>

                {/* Form Card ou Card de Confirmação */}
                <div className="bg-[#12151C] py-8 px-6 shadow-2xl rounded-2xl border border-white/[0.07] sm:px-10">
                    {confirmationSent ? (
                        /* Tela de Confirmação de E-mail */
                        <div className="text-center space-y-5 animate-in fade-in duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] flex items-center justify-center mx-auto shadow-lg shadow-[#F5A623]/5">
                                <Mail className="w-8 h-8 animate-bounce" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-white">Confirme seu E-mail</h2>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Enviamos um link de confirmação para o endereço:
                                </p>
                                <div className="p-2.5 rounded-xl bg-[#0B0D11] border border-white/10 font-mono text-sm text-[#F5A623] font-semibold break-all">
                                    {email}
                                </div>
                            </div>

                            <div className="bg-[#0B0D11]/60 border border-white/5 rounded-xl p-4 text-left space-y-2 text-xs text-gray-300">
                                <div className="flex items-start gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>Abra sua caixa de entrada e clique no botão para <strong>ativar sua conta</strong>.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                    <span>Não encontrou? Verifique também a pasta de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.</span>
                                </div>
                            </div>

                            {resendMessage && (
                                <p className={`text-xs font-medium ${resendMessage.includes('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {resendMessage}
                                </p>
                            )}

                            <div className="pt-2 space-y-3">
                                <Link
                                    href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-black text-sm rounded-xl transition-all shadow-lg shadow-[#FFB703]/10"
                                >
                                    <span>Já confirmei, ir para o Login</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleResendEmail}
                                    disabled={resending}
                                    className="w-full py-2.5 px-4 border border-white/10 hover:border-white/20 rounded-xl text-gray-400 hover:text-white transition-all text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
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
                                    <div className="w-full border-t border-white/[0.07]"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-3 bg-[#12151C] text-gray-400 uppercase tracking-wider font-semibold">Ou crie com email</span>
                                </div>
                            </div>

                            {/* Name */}
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                    <User className="w-3.5 h-3.5 text-[#F5A623]" />
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
                                    className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5A623] transition-all text-sm"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                    <Mail className="w-3.5 h-3.5 text-[#F5A623]" />
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
                                    className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5A623] transition-all text-sm"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label htmlFor="password" className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                    <Lock className="w-3.5 h-3.5 text-[#F5A623]" />
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
                                    className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5A623] transition-all text-sm"
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1.5">
                                <label htmlFor="confirmPassword" className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                    <Lock className="w-3.5 h-3.5 text-[#F5A623]" />
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
                                    className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5A623] transition-all text-sm"
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-start gap-3">
                                    <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-[0.99] text-black rounded-xl transition-all font-black text-sm shadow-lg shadow-[#FFB703]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
                                    <div className="w-full border-t border-white/[0.07]" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-3 bg-[#12151C] text-gray-400">
                                        Já tem uma conta?
                                    </span>
                                </div>
                            </div>

                            {/* Login Link */}
                            <div className="mt-5">
                                <Link
                                    href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-white/10 hover:border-white/20 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.03] transition-all text-sm font-semibold"
                                >
                                    Fazer Login
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-xs sm:text-sm">
                        Ao criar uma conta, você concorda com nossos{' '}
                        <Link href="/termos" className="text-[#FFAE00] hover:underline font-medium">
                            Termos de Uso
                        </Link>{' '}
                        e nossa{' '}
                        <Link href="/privacidade" className="text-[#FFAE00] hover:underline font-medium">
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
            <div className="min-h-screen bg-[#0B0D11] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#FFAE00]/20 border-t-[#FFAE00] rounded-full animate-spin" />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    )
}
