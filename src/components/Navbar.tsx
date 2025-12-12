'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { Menu, X, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Navbar() {
    const [user, setUser] = useState<User | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    return (
        <nav className="bg-[#0F1115] shadow-sm border-b border-[#FFAE00]/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex-shrink-0 flex items-center">
                            <span className="text-2xl font-bold text-[#FFAE00]">BordadoHub</span>
                        </Link>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link href="/how-it-works" className="border-transparent text-gray-300 hover:border-[#FFAE00] hover:text-[#FFAE00] inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors">
                                Como Funciona
                            </Link>
                            <Link href="/creators" className="border-transparent text-gray-300 hover:border-[#FFAE00] hover:text-[#FFAE00] inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors">
                                Encontrar Programadores
                            </Link>
                            <Link href="/jobs" className="border-transparent text-gray-300 hover:border-[#FFAE00] hover:text-[#FFAE00] inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors">
                                Mural de Pedidos
                            </Link>
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        {user ? (
                            <div className="flex items-center space-x-4">
                                <Link href="/dashboard" className="text-gray-300 hover:text-[#FFAE00] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Dashboard
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center text-gray-300 hover:text-[#FFAE00] px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sair
                                </button>
                            </div>
                        ) : (
                            <div className="space-x-4 flex items-center">
                                <Link href="/login" className="text-gray-300 hover:text-[#FFAE00] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Entrar
                                </Link>
                                <Link href="/register" className="text-gray-300 hover:text-[#FFAE00] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Cadastre-se
                                </Link>
                                <Link href="/jobs/new" className="bg-[#FFAE00] text-[#0F1115] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#D97706] shadow-sm transition-colors">
                                    Publicar Projeto
                                </Link>
                            </div>
                        )}
                    </div>
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="sm:hidden">
                    <div className="pt-2 pb-3 space-y-1">
                        <Link href="/jobs" className="bg-indigo-50 border-indigo-500 text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                            Mural de Pedidos
                        </Link>
                        <Link href="/creators" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                            Programadores
                        </Link>
                    </div>
                    <div className="pt-4 pb-4 border-t border-gray-200">
                        {user ? (
                            <div className="space-y-1">
                                <Link href="/dashboard" className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                                    Dashboard
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                >
                                    Sair
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <Link href="/login" className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                                    Entrar
                                </Link>
                                <Link href="/register" className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                                    Cadastrar
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    )
}
