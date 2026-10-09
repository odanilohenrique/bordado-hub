'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Menu, X, LogOut, LayoutDashboard, Users, HelpCircle, LogIn, UserPlus, PlusCircle, ShoppingBag } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'

export default function Navbar() {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    // Close mobile menu on page change
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    const handleLogout = async () => {
        setIsOpen(false)
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    return (
        <nav className="sticky top-0 z-50 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/5 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center group py-1">
                            <Image
                                src="/brand/logo-dark-grossa.png"
                                alt="BordadoHub"
                                width={92}
                                height={40}
                                className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
                                priority
                            />
                        </Link>

                        {/* Desktop Links */}
                        <div className="hidden md:flex items-center space-x-1">
                            <Link 
                                href="/jobs" 
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname === '/jobs' 
                                        ? 'bg-white/10 text-white font-bold' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                Mural de Pedidos
                            </Link>
                            <Link 
                                href="/programadores" 
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith('/programadores') 
                                        ? 'bg-white/10 text-white font-bold' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                Programadores
                            </Link>
                            <Link 
                                href="/how-it-works" 
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname === '/how-it-works' 
                                        ? 'bg-white/10 text-white font-bold' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                Como Funciona
                            </Link>
                        </div>
                    </div>

                    {/* Desktop Right Auth Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <div className="flex items-center gap-3">
                                <NotificationBell />
                                <Link 
                                    href="/pedidos" 
                                    className="text-sm font-medium text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    Meus Pedidos
                                </Link>
                                <Link 
                                    href={`/profile/${user.id}`} 
                                    className="text-sm font-medium text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    Meu Perfil
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sair
                                </button>
                                <Link 
                                    href="/jobs/new" 
                                    className="bg-gradient-to-r from-[#FFAE00] to-yellow-400 text-black px-4 py-2 rounded-xl text-sm font-black hover:opacity-95 shadow-md shadow-[#FFAE00]/20 transition-all active:scale-95"
                                >
                                    Pedir Matriz
                                </Link>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link 
                                    href="/login" 
                                    className="text-sm font-medium text-gray-300 hover:text-white px-3.5 py-2 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    Entrar
                                </Link>
                                <Link 
                                    href="/register" 
                                    className="text-sm font-medium text-gray-300 hover:text-white px-3.5 py-2 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors"
                                >
                                    Cadastre-se
                                </Link>
                                <Link 
                                    href="/jobs/new" 
                                    className="bg-gradient-to-r from-[#FFAE00] to-yellow-400 text-black px-4 py-2 rounded-xl text-sm font-black hover:opacity-95 shadow-md shadow-[#FFAE00]/20 transition-all active:scale-95 ml-1"
                                >
                                    Pedir Matriz
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Hamburger Button */}
                    <div className="flex items-center gap-2 md:hidden">
                        {user && <NotificationBell />}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                            aria-label="Menu principal"
                        >
                            {isOpen ? <X className="h-6 w-6 text-[#FFAE00]" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu (Dark Glass Standard) */}
            {isOpen && (
                <div className="md:hidden bg-[#16191F] border-b border-white/10 shadow-2xl px-4 py-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5 mb-5">
                        <Link 
                            href="/jobs" 
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <LayoutDashboard className="w-4 h-4 text-[#FFAE00]" />
                            Mural de Pedidos
                        </Link>
                        <Link 
                            href="/programadores" 
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <Users className="w-4 h-4 text-[#FFAE00]" />
                            Encontrar Programadores
                        </Link>
                        <Link 
                            href="/how-it-works" 
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <HelpCircle className="w-4 h-4 text-[#FFAE00]" />
                            Como Funciona
                        </Link>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-2">
                        {user ? (
                            <>
                                <Link 
                                    href="/pedidos" 
                                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20"
                                >
                                    <ShoppingBag className="w-4 h-4 text-indigo-400" />
                                    Meus Pedidos
                                </Link>
                                <Link 
                                    href={`/profile/${user.id}`} 
                                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5"
                                >
                                    Meu Perfil
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sair da conta
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <Link 
                                        href="/login" 
                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold text-gray-200 bg-[#0F1115] border border-white/10 hover:bg-white/5 text-center transition-colors"
                                    >
                                        <LogIn className="w-4 h-4 text-gray-400" />
                                        Entrar
                                    </Link>
                                    <Link 
                                        href="/register" 
                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold text-gray-200 bg-[#0F1115] border border-white/10 hover:bg-white/5 text-center transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4 text-[#FFAE00]" />
                                        Cadastrar
                                    </Link>
                                </div>
                                <Link 
                                    href="/jobs/new" 
                                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#FFAE00] to-yellow-400 text-black font-black text-sm py-3 rounded-xl shadow-lg shadow-[#FFAE00]/20 active:scale-95 transition-all text-center"
                                >
                                    <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                                    Pedir Matriz Agora
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    )
}
