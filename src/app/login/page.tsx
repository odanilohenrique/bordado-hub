'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error('Login error:', error)
            setError(error.message) // Show actual error
            setLoading(false)
        } else {
            console.log('Login successful')
            router.push('/dashboard')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen bg-[#0F1115] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="bg-[#FFAE00]/10 p-4 rounded-full border border-[#FFAE00]/20">
                            <LogIn className="w-12 h-12 text-[#FFAE00]" />
                        </div>
                    </div>
                    <h2 className="text-4xl font-extrabold text-[#F3F4F6] mb-2">
                        Bem-vindo de volta
                    </h2>
                    <p className="text-gray-400 text-lg">
                        Acesse sua conta para continuar
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-[#1A1D23] py-8 px-6 shadow-2xl rounded-xl border border-[#FFAE00]/20 sm:px-10">
                    <form className="space-y-6" onSubmit={handleLogin}>
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
                                placeholder="Sua senha"
                                className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
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
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        Entrar
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Divider and Register Link */}
                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#FFAE00]/10" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-[#1A1D23] text-gray-400">
                                    Não tem uma conta?
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Link
                                href="/register"
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-[#FFAE00]/20 rounded-lg text-[#F3F4F6] hover:bg-[#FFAE00]/10 hover:border-[#FFAE00]/50 transition-all font-medium"
                            >
                                Criar Conta Grátis
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
