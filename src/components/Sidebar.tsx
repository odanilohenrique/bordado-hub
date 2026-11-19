'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
    LayoutDashboard,
    ShoppingBag,
    Palette,
    Wallet,
    Users,
    Store,
    LogOut,
    UserCircle,
} from 'lucide-react'

import { getCached, setCached } from '@/lib/clientCache'
import { useAuth } from '@/contexts/AuthContext'
import BrandLogo from '@/components/BrandLogo'
import ThemeToggle from '@/components/ThemeToggle'

export default function Sidebar({ initialUser, initialProfile }: { initialUser?: any; initialProfile?: any } = {}) {
    const pathname = usePathname()
    const router = useRouter()
    const { user: authUser, profile: authProfile, profileId: authProfileId } = useAuth()

    const user = authUser || initialUser || null
    const profile = authProfile || initialProfile || null
    const profileId = authProfileId || profile?.id || null

    const [revisionsCount, setRevisionsCount] = useState(0)

    const checkRevisions = async (targetId: string) => {
        const cached = getCached<number>(`revisions_count_${targetId}`)
        if (cached !== null) {
            setRevisionsCount(cached)
        }
        try {
            const { data } = await supabase
                .from('proposals')
                .select('id, jobs(status)')
                .eq('criador_id', targetId)
                .eq('status', 'aceita')

            if (data) {
                const inRev = data.filter((p: any) => {
                    const j = Array.isArray(p.jobs) ? p.jobs[0] : p.jobs
                    return j?.status === 'em_revisao'
                })
                setRevisionsCount(inRev.length)
                setCached(`revisions_count_${targetId}`, inRev.length, 60000)
            }
        } catch {
            // silent
        }
    }

    const [unreadNotifCount, setUnreadNotifCount] = useState(0)

    const checkUnreadNotifs = async (targetId: string) => {
        try {
            const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', targetId)
                .eq('is_read', false)
            if (count !== null) {
                setUnreadNotifCount(count)
            }
        } catch {
            // silent
        }
    }

    useEffect(() => {
        // Skip all queries on mobile devices (hidden md:flex)
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            return
        }

        if (profileId) {
            checkRevisions(profileId)
            checkUnreadNotifs(profileId)
        }

        const handleReload = () => {
            if (profileId) {
                checkRevisions(profileId)
                checkUnreadNotifs(profileId)
            }
        }

        const handleNotifUpdate = () => {
            if (profileId) {
                checkUnreadNotifs(profileId)
            }
        }

        window.addEventListener('bordadohub_reload_job', handleReload)
        window.addEventListener('bordadohub_notification', handleNotifUpdate)
        window.addEventListener('bordadohub_notification_read', handleNotifUpdate)
        window.addEventListener('bordadohub_notification_update', handleNotifUpdate)

        return () => {
            window.removeEventListener('bordadohub_reload_job', handleReload)
            window.removeEventListener('bordadohub_notification', handleNotifUpdate)
            window.removeEventListener('bordadohub_notification_read', handleNotifUpdate)
            window.removeEventListener('bordadohub_notification_update', handleNotifUpdate)
        }
    }, [profileId])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    const navigation = [
        { name: 'Pedidos de Clientes', href: '/jobs', icon: LayoutDashboard },
        { name: 'Encontrar Programadores', href: '/programadores', icon: Users },
        { name: 'Marketplace', href: '/marketplace', icon: Store },
    ]

    const clientNav = [{ name: 'Meus Pedidos', href: '/pedidos', icon: ShoppingBag }]

    const creatorNav = [
        { name: 'Minha Produção', href: '/producao', icon: Palette },
        { name: 'Painel Financeiro', href: '/financeiro', icon: Wallet },
    ]

    return (
        <div className="flex flex-col w-64 h-screen fixed left-0 top-0 bg-[var(--bg-surface)] border-r border-[var(--border-hairline)] shrink-0 z-50 overflow-y-auto hidden md:flex">
            {/* Logo */}
            <div className="pt-6 pb-5 px-5 flex justify-start items-center">
                <Link
                    href={profile?.role === 'criador' ? '/jobs' : '/pedidos'}
                    className="flex items-center"
                    title="Ir para o início"
                >
                    <BrandLogo variant="horizontal" className="h-7 w-auto" priority />
                </Link>
            </div>

            {/* User Profile Summary */}
            <div
                className="px-4 mb-6 group cursor-pointer"
                onClick={() => router.push(profile ? `/profile/${profile.id}` : user ? `/profile/${user.id}` : '/login')}
            >
                <div className="flex items-center gap-3 bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-hairline)] group-hover:border-[#2563EB]/35 dark:group-hover:border-[#3B82F6]/35 transition-colors">
                    {profile?.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={profile.name}
                            className="w-10 h-10 rounded-full object-cover border border-[var(--border-glass)]"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] flex items-center justify-center border border-[var(--border-hairline)]">
                            <UserCircle className="w-6 h-6 text-[var(--text-secondary)]" />
                        </div>
                    )}
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Minha Conta'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Menus */}
            <div className="flex-1 px-4 space-y-7">
                {/* Público */}
                <div>
                    <h3 className="px-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">
                        Público
                    </h3>
                    <div className="space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 dark:border-[#3B82F6]/30'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
                                    }`}
                                >
                                    <item.icon
                                        className={`w-4 h-4 shrink-0 ${
                                            isActive ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-[var(--text-secondary)]'
                                        }`}
                                    />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Comprador */}
                <div>
                    <h3 className="px-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5 flex items-center gap-2">
                        Sou Comprador
                    </h3>
                    <div className="space-y-1">
                        {clientNav.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 dark:border-[#3B82F6]/30'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
                                    }`}
                                >
                                    <item.icon
                                        className={`w-4 h-4 shrink-0 ${
                                            isActive ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-[var(--text-secondary)]'
                                        }`}
                                    />
                                    {item.name}
                                    {item.href === '/pedidos' && unreadNotifCount > 0 && (
                                        <span className="ml-auto bg-[#2563EB] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                            {unreadNotifCount}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Programador */}
                <div>
                    <h3 className="px-2 text-[11px] font-semibold text-[#0F766E] dark:text-[#14B8A6] uppercase tracking-wider mb-2.5 flex items-center gap-2">
                        Sou Programador
                    </h3>
                    <div className="space-y-1">
                        {creatorNav.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-[#0D9488]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0D9488]/25 dark:border-[#14B8A6]/30'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
                                    }`}
                                >
                                    <item.icon
                                        className={`w-4 h-4 shrink-0 ${
                                            isActive ? 'text-[#0F766E] dark:text-[#14B8A6]' : 'text-[var(--text-secondary)]'
                                        }`}
                                    />
                                    <span className="truncate">{item.name}</span>
                                    {item.href === '/producao' && revisionsCount > 0 && (
                                        <span className="ml-auto shrink-0 whitespace-nowrap bg-[#2563EB] text-white font-semibold text-[10px] px-2 py-0.5 rounded-full tracking-tight">
                                            {revisionsCount} {revisionsCount === 1 ? 'Ajuste' : 'Ajustes'}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 mt-auto border-t border-[var(--border-hairline)] space-y-2">
                <ThemeToggle showLabel className="w-full justify-start" />
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors cursor-pointer"
                >
                    <LogOut className="w-4 h-4" />
                    Sair da conta
                </button>
            </div>
        </div>
    )
}
