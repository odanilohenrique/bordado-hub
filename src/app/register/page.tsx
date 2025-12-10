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
