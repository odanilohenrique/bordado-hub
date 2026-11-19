'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Plus, Users, User, Palette, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface UserProfile {
    id: string
    name: string
    role: string
    avatar_url?: string | null
}

interface NavItem {
    name: string
    href: string
    icon: any
    exact?: boolean
    isAction?: boolean
    badge?: number
}

interface MobileBottomNavProps {
    profile: UserProfile | null
    userId?: string
}

export default function MobileBottomNav({ profile, userId }: MobileBottomNavProps) {
    const pathname = usePathname()
    const [revisionsCount, setRevisionsCount] = useState(0)

    const isCreator = profile?.role === 'criador'

    // Listen to revisions if creator
    useEffect(() => {
        if (!isCreator || !profile?.id) return

        let channel: any = null

        const checkRevisions = async () => {
            try {
                const { data } = await supabase
                    .from('proposals')
                    .select('id, jobs(status)')
                    .eq('criador_id', profile.id)
                    .eq('status', 'aceita')

                if (data) {
                    const inRev = data.filter((p: any) => {
                        const j = Array.isArray(p.jobs) ? p.jobs[0] : p.jobs
                        return j?.status === 'em_revisao'
                    })
                    setRevisionsCount(inRev.length)
                }
            } catch {
                // silent
            }
        }

        checkRevisions()

        channel = supabase
            .channel(`mobile_bottom_nav_notifs:${profile.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
                checkRevisions()
            })
            .subscribe()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [isCreator, profile?.id])

    // Client Nav Items
    const clientItems: NavItem[] = [
        {
            name: 'Explorar',
            href: '/jobs',
            icon: LayoutDashboard,
            exact: true,
        },
        {
            name: 'Pedidos',
            href: '/pedidos',
            icon: ShoppingBag,
            exact: false,
        },
        {
            name: 'Criar',
            href: '/jobs/new',
            icon: Plus,
            isAction: true,
        },
        {
            name: 'Criadores',
            href: '/programadores',
            icon: Users,
            exact: false,
        },
        {
            name: 'Perfil',
            href: profile ? `/profile/${profile.id}` : userId ? `/profile/${userId}` : '/login',
            icon: User,
            exact: false,
        },
    ]

    // Creator Nav Items
    const creatorItems: NavItem[] = [
        {
            name: 'Mural',
            href: '/jobs',
            icon: LayoutDashboard,
            exact: true,
        },
        {
            name: 'Produção',
            href: '/producao',
            icon: Palette,
            badge: revisionsCount,
            exact: false,
        },
        {
            name: 'Financeiro',
            href: '/financeiro',
            icon: Wallet,
            exact: false,
        },
        {
            name: 'Perfil',
            href: profile ? `/profile/${profile.id}` : userId ? `/profile/${userId}` : '/login',
            icon: User,
            exact: false,
        },
    ]

    const items = isCreator ? creatorItems : clientItems

    return (
        <nav
            aria-label="Navegação móvel"
            className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[var(--bg-surface)]/95 backdrop-blur-[20px] border-t border-[var(--border-hairline)] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] transition-colors"
        >
            <div className="flex items-center justify-around max-w-lg mx-auto">
                {items.map((item) => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname === item.href || pathname.startsWith(`${item.href}/`)

                    if (item.isAction) {
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex flex-col items-center justify-center -mt-5 min-w-[56px] group"
                            >
                                <div className="w-12 h-12 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center group-active:scale-95 transition-transform border-2 border-[var(--bg-surface)]">
                                    <item.icon className="w-6 h-6 stroke-[2.25]" />
                                </div>
                                <span className="text-[10px] font-semibold text-[var(--text-secondary)] mt-1 tracking-tight">
                                    {item.name}
                                </span>
                            </Link>
                        )
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-lg transition-colors relative ${
                                isActive
                                    ? 'text-[#2563EB] dark:text-[#60A5FA]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <div className="relative">
                                <item.icon
                                    className={`w-5 h-5 transition-transform ${
                                        isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.8]'
                                    }`}
                                />
                                {Boolean(item.badge && item.badge > 0) && (
                                    <span className="absolute -top-1 -right-2 bg-[#2563EB] text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span
                                className={`text-[10px] mt-1 tracking-tight transition-colors ${
                                    isActive
                                        ? 'font-semibold text-[#2563EB] dark:text-[#60A5FA]'
                                        : 'font-medium text-[var(--text-secondary)]'
                                }`}
                            >
                                {item.name}
                            </span>
                            {isActive && (
                                <span className="w-1 h-1 rounded-full bg-[#2563EB] dark:bg-[#60A5FA] mt-0.5" />
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
