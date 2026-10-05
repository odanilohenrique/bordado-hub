'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { X, LayoutDashboard, Users, Store, ShoppingBag, Palette, Wallet, LogOut, UserCircle, PlusCircle, HelpCircle, Shield, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface UserProfile {
    id: string
    name: string
    role: string
    avatar_url?: string | null
    email?: string | null
}

interface MobileDrawerProps {
    isOpen: boolean
    onClose: () => void
    profile: UserProfile | null
    userId?: string
}

export default function MobileDrawer({ isOpen, onClose, profile, userId }: MobileDrawerProps) {
    const pathname = usePathname()
    const router = useRouter()

    if (!isOpen) return null

    const handleLogout = async () => {
        onClose()
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    const isCreator = profile?.role === 'criador'
    const profileHref = profile ? `/profile/${profile.id}` : userId ? `/profile/${userId}` : '/login'

    return (
        <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="relative w-80 max-w-[85vw] bg-[#16191F] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300 border-r border-white/10">
                {/* Header with Close */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <Link href="/" onClick={onClose} className="flex items-center py-1">
                        <Image
                            src="/brand/logo-dark.png"
                            alt="BordadoHub"
                            width={100}
                            height={40}
                            className="h-8 w-auto object-contain"
                        />
                    </Link>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                        aria-label="Fechar menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Profile Summary Card */}
                <div className="p-4 border-b border-white/5">
                    <Link
                        href={profileHref}
                        onClick={onClose}
                        className="flex items-center gap-3 bg-[#0F1115] p-3 rounded-xl border border-white/5 hover:border-[#FFAE00]/30 transition-all group"
                    >
                        {profile?.avatar_url ? (
                            <img 
                                src={profile.avatar_url} 
                                alt={profile.name} 
                                className="w-11 h-11 rounded-full object-cover border border-[#FFAE00]/30 shrink-0" 
                            />
                        ) : (
                            <div className="w-11 h-11 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 shrink-0">
                                <UserCircle className="w-6 h-6 text-gray-400" />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate group-hover:text-[#FFAE00] transition-colors">
                                {profile?.name || 'Meu Perfil'}
                            </p>
                            <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                                {profile?.role === 'criador' ? 'Programador' : 'Comprador'}
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Navigation Links Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                    {/* Ações Rápidas */}
                    <div>
                        <p className="px-3 text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                            Minha Conta
                        </p>
                        <div className="space-y-1">
                            <Link
                                href="/pedidos"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                    pathname.startsWith('/pedidos')
                                        ? 'bg-indigo-500/15 text-indigo-300 font-bold border border-indigo-500/20'
                                        : 'text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                                Meus Pedidos
                            </Link>

                            <Link
                                href="/jobs/new"
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#FFAE00] bg-[#FFAE00]/10 border border-[#FFAE00]/20 hover:bg-[#FFAE00]/15 transition-colors"
                            >
                                <PlusCircle className="w-4 h-4 text-[#FFAE00]" />
                                Encomendar Matriz
                            </Link>

                            <Link
                                href="/producao"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                    pathname.startsWith('/producao')
                                        ? 'bg-[#FFAE00]/15 text-[#FFAE00] font-bold border border-[#FFAE00]/20'
                                        : 'text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                <Palette className="w-4 h-4 text-[#FFAE00]" />
                                Minha Produção
                            </Link>

                            <Link
                                href="/financeiro"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                    pathname.startsWith('/financeiro')
                                        ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/20'
                                        : 'text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                <Wallet className="w-4 h-4 text-emerald-400" />
                                Painel Financeiro
                            </Link>
                        </div>
                    </div>

                    {/* Exploração */}
                    <div>
                        <p className="px-3 text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                            Explorar
                        </p>
                        <div className="space-y-1">
                            <Link
                                href="/jobs"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                    pathname === '/jobs'
                                        ? 'bg-white/10 text-white font-bold'
                                        : 'text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                <LayoutDashboard className="w-4 h-4 text-gray-400" />
                                Mural de Pedidos
                            </Link>

                            <Link
                                href="/programadores"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                    pathname.startsWith('/programadores')
                                        ? 'bg-white/10 text-white font-bold'
                                        : 'text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                <Users className="w-4 h-4 text-gray-400" />
                                Programadores
                            </Link>

                            <Link
                                href="/marketplace"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                    pathname.startsWith('/marketplace')
                                        ? 'bg-white/10 text-white font-bold'
                                        : 'text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                <Store className="w-4 h-4 text-gray-400" />
                                Marketplace de Matrizes
                            </Link>
                        </div>
                    </div>

                    {/* Ajuda e Informações */}
                    <div>
                        <p className="px-3 text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                            Suporte & Termos
                        </p>
                        <div className="space-y-1">
                            <Link
                                href="/how-it-works"
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <HelpCircle className="w-4 h-4 text-gray-400" />
                                Como Funciona
                            </Link>
                            <Link
                                href="/termos"
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <FileText className="w-4 h-4 text-gray-400" />
                                Termos de Uso
                            </Link>
                            <Link
                                href="/privacidade"
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <Shield className="w-4 h-4 text-gray-400" />
                                Política de Privacidade
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer with Logout */}
                <div className="p-4 border-t border-white/5 bg-[#121418]">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair da conta
                    </button>
                </div>
            </div>
        </div>
    )
}
