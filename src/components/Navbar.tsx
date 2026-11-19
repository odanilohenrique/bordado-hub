'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import {
    Menu,
    X,
    LogOut,
    LayoutDashboard,
    Users,
    HelpCircle,
    LogIn,
    UserPlus,
    PlusCircle,
    ShoppingBag,
    Store,
    UserCircle,
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'
import BrandLogo from '@/components/BrandLogo'
import ThemeToggle from '@/components/ThemeToggle'

export default function Navbar() {
    const { user, profile } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        setMounted(true)
    }, [])

    // Only use user for conditional rendering after mount to prevent hydration mismatch
    const mountedUser = mounted ? user : null

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

    const navLinks = [
        { href: '/jobs', label: 'Mural de Pedidos', icon: LayoutDashboard, active: pathname === '/jobs' },
        { href: '/marketplace', label: 'Marketplace', icon: Store, active: pathname.startsWith('/marketplace') },
        { href: '/programadores', label: 'Programadores', icon: Users, active: pathname.startsWith('/programadores') },
        { href: '/how-it-works', label: 'Como Funciona', icon: HelpCircle, active: pathname === '/how-it-works' },
    ]

    return (
        <>
            <nav className="sticky top-0 z-50 h-16 bg-white/88 dark:bg-[var(--bg-primary)]/85 backdrop-blur-[20px] border-b border-[var(--border-hairline)] shadow-[0_1px_0_rgba(15,23,42,0.05)] dark:shadow-none">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex justify-between h-full items-center gap-4">
                        {/* Brand Logo & Desktop Links */}
                        <div className="flex items-center gap-6 lg:gap-8">
                            <Link href="/" className="flex items-center py-1 shrink-0" aria-label="BordadoHub Início">
                                <BrandLogo variant="horizontal" className="h-6 sm:h-7 w-auto" priority />
                            </Link>

                            {/* Desktop Links */}
                            <div className="hidden lg:flex items-center gap-1">
                                {navLinks.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                                            item.active
                                                ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] font-semibold'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--btn-glass-bg)]'
                                        }`}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Desktop Right Auth Actions + ThemeToggle */}
                        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
                            <ThemeToggle />
                            {mountedUser ? (
                                <div className="flex items-center gap-2">
                                    <NotificationBell />
                                    <Link
                                        href="/pedidos"
                                        className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 rounded-lg hover:bg-[var(--btn-glass-bg)] transition-colors whitespace-nowrap"
                                    >
                                        Meus Pedidos
                                    </Link>
                                    <Link
                                        href={`/profile/${profile?.id || mountedUser.id}`}
                                        className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 rounded-lg hover:bg-[var(--btn-glass-bg)] transition-colors whitespace-nowrap"
                                    >
                                        Meu Perfil
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--danger)] px-3 py-2 rounded-lg hover:bg-[var(--danger)]/10 transition-colors cursor-pointer"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sair
                                    </button>
                                    <Link
                                        href="/jobs/new"
                                        className="inline-flex items-center justify-center bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] px-4 min-h-[40px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                                    >
                                        Pedir Matriz
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Link
                                        href="/login"
                                        className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3.5 py-2 rounded-lg hover:bg-[var(--btn-glass-bg)] transition-colors"
                                    >
                                        Entrar
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="text-sm font-medium text-[var(--text-primary)] px-3.5 py-2 rounded-lg border border-[var(--border-glass)] bg-[var(--btn-glass-bg)] hover:border-[var(--cobalt)]/40 transition-colors"
                                    >
                                        Cadastre-se
                                    </Link>
                                    <Link
                                        href="/jobs/new"
                                        className="inline-flex items-center justify-center bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] px-4 min-h-[40px] rounded-lg text-sm font-semibold transition-colors ml-1 whitespace-nowrap"
                                    >
                                        Pedir Matriz
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Mobile Right Controls (ThemeToggle + Bell + >=44x44px Hamburger) */}
                        <div className="flex items-center gap-1.5 lg:hidden">
                            <ThemeToggle />
                            {mountedUser && <NotificationBell />}
                            <button
                                type="button"
                                onClick={() => setIsOpen((prev) => !prev)}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--btn-glass-bg)] text-[var(--text-primary)] hover:border-[var(--border-glass)] transition-colors cursor-pointer"
                                aria-label={isOpen ? 'Fechar menu principal' : 'Abrir menu principal'}
                                aria-expanded={isOpen}
                            >
                                {isOpen ? (
                                    <X className="h-5 w-5 text-[#2563EB] dark:text-[#60A5FA]" />
                                ) : (
                                    <Menu className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Full-Height Drawer starting cleanly at top-16 (zero top-link clipping) */}
            {isOpen && (
                <div className="lg:hidden fixed top-16 left-0 right-0 h-[calc(100dvh-4rem)] z-50 bg-[var(--bg-primary)] border-t border-[var(--border-hairline)] overflow-y-auto px-4 py-6 flex flex-col justify-between">
                    <div className="space-y-1.5">
                        {navLinks.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 min-h-[48px] rounded-lg text-[15px] font-medium transition-colors ${
                                    item.active
                                        ? 'bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 font-semibold'
                                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
                                }`}
                            >
                                <item.icon className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="pt-6 mt-6 border-t border-[var(--border-hairline)] space-y-3">
                        {mountedUser ? (
                            <>
                                <Link
                                    href="/pedidos"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-4 min-h-[48px] rounded-lg text-[15px] font-semibold text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 border border-[#2563EB]/20"
                                >
                                    <ShoppingBag className="w-4 h-4 shrink-0" />
                                    Meus Pedidos
                                </Link>
                                <Link
                                    href={`/profile/${profile?.id || mountedUser.id}`}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-4 min-h-[48px] rounded-lg text-[15px] font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-hairline)]"
                                >
                                    <UserCircle className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                                    Meu Perfil
                                </Link>
                                <Link
                                    href="/jobs/new"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-center gap-2 w-full min-h-[48px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] font-semibold text-[15px] rounded-lg transition-colors"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Pedir Matriz Agora
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex w-full items-center justify-center gap-2 px-4 min-h-[48px] rounded-lg text-[15px] font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sair da conta
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <Link
                                        href="/login"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center gap-2 min-h-[48px] px-3 rounded-lg text-[15px] font-semibold text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[var(--border-glass)] transition-colors"
                                    >
                                        <LogIn className="w-4 h-4 text-[var(--text-secondary)]" />
                                        Entrar
                                    </Link>
                                    <Link
                                        href="/register"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center gap-2 min-h-[48px] px-3 rounded-lg text-[15px] font-semibold text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[var(--border-glass)] transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                                        Cadastrar
                                    </Link>
                                </div>
                                <Link
                                    href="/jobs/new"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-center gap-2 w-full min-h-[48px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] font-semibold text-[15px] rounded-lg transition-colors"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Pedir Matriz Agora
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
