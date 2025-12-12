'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Mail, Lock, Zap, UserPlus } from 'lucide-react'

export default function Register() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

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
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Erro ao criar usuário')

            // 2. Create Profile in public.users via API (Bypass RLS)
            const response = await fetch('/api/create-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: authData.user.id,
                    name,
                    email,
                    role: 'criador' // Explicitly set role for this page
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao criar perfil')
            }

            router.push('/dashboard')
            router.refresh()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0F1115] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="bg-[#FFAE00]/10 p-4 rounded-full border border-[#FFAE00]/20">
                            <UserPlus className="w-12 h-12 text-[#FFAE00]" />
                        </div>
                    </div>
                    <h2 className="text-4xl font-extrabold text-[#F3F4F6] mb-2">
                        Cadastre-se como Programador
                    </h2>
                    <p className="text-gray-400 text-lg">
                        Encontre clientes, venda suas matrizes e receba com segurança
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-[#1A1D23] py-8 px-6 shadow-2xl rounded-xl border border-[#FFAE00]/20 sm:px-10">
                    <form className="space-y-6" onSubmit={handleRegister}>
                        {/* Google Login */}
                        <div>
                            <button
                                type="button"
                                onClick={async () => {
                                    const origin = typeof window !== 'undefined' && window.location.origin
                                        ? window.location.origin
                                        : ''

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
                                }}
                                className="w-full flex justify-center items-center gap-3 px-4 py-3 border border-gray-700 rounded-lg shadow-sm bg-[#0F1115] text-sm font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFAE00] transition-all"
                            >
                                <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                                    <path d="M12.0003 20.45c4.65 0 8.45-3.8 8.45-8.45 0-0.65-0.1-1.3-0.2-1.9H12.0003v3.75h4.75c-0.2 1.1-0.8 2-1.6 2.65v2.2h2.6c1.5-1.4 2.4-3.5 2.4-5.95 0-0.6-0.1-1.2-0.2-1.8H12.0003V8.85h8.9c0.1 0.6 0.1 1.2 0.1 1.8 0 5.3-3.6 9.8-8.9 9.8-5.4 0-9.8-4.4-9.8-9.8s4.4-9.8 9.8-9.8c2.65 0 5.05 0.95 6.9 2.5l-2.65 2.65c-1.15-1.1-2.7-1.75-4.25-1.75-3.55 0-6.4 2.85-6.4 6.4s2.85 6.4 6.4 6.4z" fill="currentColor" />
                                    <path d="M23.49 12.275c0-0.9-.1-1.75-.25-2.55H12v4.75h6.5c-.3 1.5-1.15 2.75-2.45 3.6v3h3.95c2.3-2.15 3.65-5.3 3.65-8.8z" fill="#4285F4" />
                                    <path d="M12 24c3.25 0 6-1.1 8-2.95l-3.95-3c-1.1.75-2.55 1.2-4.05 1.2-3.1 0-5.75-2.1-6.7-4.95H1.3v3.1C3.35 21.5 7.35 24 12 24z" fill="#34A853" />
                                    <path d="M5.3 14.3c-.25-.75-.4-1.55-.4-2.3s.15-1.55.4-2.3V6.6H1.3C.45 8.3 0 10.1 0 12s.45 3.7 1.3 5.4l4-3.1z" fill="#FBBC05" />
                                    <path d="M12 4.8c1.75 0 3.35.6 4.65 1.85l3.5-3.5C17.95 1.05 15.2 0 12 0 7.35 0 3.35 2.5 1.3 6.6l4 3.1c.95-2.85 3.6-4.9 6.7-4.9z" fill="#EA4335" />
                                </svg>
                                Cadastrar com Google
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[#1A1D23] text-gray-400">Ou crie com email</span>
                            </div>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <User className="w-4 h-4 text-[#FFAE00]" />
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
                                className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                            />
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
                                autoComplete="new-password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <Lock className="w-4 h-4 text-[#FFAE00]" />
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
                                className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
                                <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-[#FFAE00] text-[#0F1115] rounded-lg hover:bg-[#D97706] transition-all font-bold shadow-lg shadow-[#FFAE00]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-[#0F1115]/30 border-t-[#0F1115] rounded-full animate-spin" />
                                        Criando conta...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5" />
                                        Criar Conta
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#FFAE00]/10" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-[#1A1D23] text-gray-400">
                                    Já tem uma conta?
                                </span>
                            </div>
                        </div>

                        {/* Login Link */}
                        <div className="mt-6">
                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-[#FFAE00]/20 rounded-lg text-[#F3F4F6] hover:bg-[#FFAE00]/10 hover:border-[#FFAE00]/50 transition-all font-medium"
                            >
                                Fazer Login
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm">
                        Ao criar uma conta, você concorda com nossos{' '}
                        <Link href="/terms" className="text-[#FFAE00] hover:underline">
                            Termos de Uso
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
