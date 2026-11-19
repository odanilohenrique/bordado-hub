'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    X,
    LayoutDashboard,
    Users,
    Store,
    ShoppingBag,
    Palette,
    Wallet,
    LogOut,
    UserCircle,
    PlusCircle,
    HelpCircle,
    Shield,
    FileText,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import BrandLogo from '@/components/BrandLogo'
import ThemeToggle from '@/components/ThemeToggle'

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

    const profileHref = profile ? `/profile/${profile.id}` : userId ? `/profile/${userId}` : '/login'

    return (
        <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="relative w-80 max-w-[85vw] bg-[var(--bg-surface)] h-[100dvh] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300 border-r border-[var(--border-hairline)]">
                {/* Header with Logo, ThemeToggle & >=44x44px Close */}
                <div className="px-4 h-16 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2 shrink-0">
                    <Link
                        href={profile?.role === 'criador' ? '/jobs' : '/pedidos'}
                        onClick={onClose}
                        className="flex items-center py-1"
                    >
                        <BrandLogo variant="horizontal" className="h-6 w-auto" />
                    </Link>
                    <div className="flex items-center gap-1.5">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--btn-glass-bg)] rounded-lg transition-colors cursor-pointer"
                            aria-label="Fechar menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Profile Summary Card */}
                <div className="p-4 border-b border-[var(--border-hairline)]">
                    <Link
                        href={profileHref}
                        onClick={onClose}
                        className="flex items-center gap-3 bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-hairline)] hover:border-[#2563EB]/35 dark:hover:border-[#3B82F6]/35 transition-colors group"
                    >
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.name}
                                className="w-11 h-11 rounded-full object-cover border border-[var(--border-glass)] shrink-0"
                            />
                        ) : (
                            <div className="w-11 h-11 rounded-full bg-[var(--bg-primary)] flex items-center justify-center border border-[var(--border-hairline)] shrink-0">
                                <UserCircle className="w-6 h-6 text-[var(--text-secondary)]" />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                                {profile?.name || 'Meu Perfil'}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">Ver conta e portfólio</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation Links Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                    {/* Minha Conta */}
                    <div>
                        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                            Minha Conta
                        </p>
                        <div className="space-y-1">
                            <Link
                                href="/pedidos"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith('/pedidos')
                                        ? 'bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] font-semibold border border-[#2563EB]/25'
                                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
                                }`}
                            >
                                <ShoppingBag className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                                Meus Pedidos
                            </Link>

                            <Link
                                href="/jobs/new"
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Encomendar Matriz
                            </Link>

                            <Link
                                href="/producao"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith('/producao')
                                        ? 'bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] font-semibold border border-[#2563EB]/25'
                                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
                                }`}
                            >
                                <Palette className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                                Minha Produção
                            </Link>

                            <Link
                                href="/financeiro"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith('/financeiro')
                                        ? 'bg-[#0D9488]/10 text-[#0F766E] dark:text-[#14B8A6] font-semibold border border-[#0D9488]/25'
                                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
                                }`}
                            >
                                <Wallet className="w-4 h-4 text-[#0D9488] dark:text-[#14B8A6]" />
                                Painel Financeiro
                            </Link>
                        </div>
                    </div>

                    {/* Explorar */}
                    <div>
                        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                            Explorar
                        </p>
                        <div className="space-y-1">
                            <Link
                                href="/jobs"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                                    pathname === '/jobs'
                                        ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-hairline)]'
                                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
                                }`}
                            >
                                <LayoutDashboard className="w-4 h-4 text-[var(--text-secondary)]" />
                                Pedidos de Clientes
                            </Link>

                            <Link
                                href="/programadores"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith('/programadores')
                                        ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-hairline)]'
                                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
                                }`}
                            >
                                <Users className="w-4 h-4 text-[var(--text-secondary)]" />
                                Programadores
                            </Link>

                            <Link
                                href="/marketplace"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith('/marketplace')
                                        ? 'bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] font-semibold border border-[#2563EB]/25'
                                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
                                }`}
                            >
                                <Store className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                                <span>Marketplace de Matrizes</span>
                            </Link>
                        </div>
                    </div>

                    {/* Ajuda e Informações */}
                    <div>
                        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                            Suporte & Termos
                        </p>
                        <div className="space-y-1">
                            <Link
                                href="/how-it-works"
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
                            >
                                <HelpCircle className="w-4 h-4" />
                                Como Funciona
                            </Link>
                            <Link
                                href="/termos"
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                Termos de Uso
                            </Link>
                            <Link
                                href="/privacidade"
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
                            >
                                <Shield className="w-4 h-4" />
                                Política de Privacidade
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer with Logout */}
                <div className="p-4 border-t border-[var(--border-hairline)] bg-[var(--bg-primary)]">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair da conta
                    </button>
                </div>
            </div>
        </div>
    )
}
