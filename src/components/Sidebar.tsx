'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { 
    LayoutDashboard, 
    ShoppingBag, 
    Palette, 
    Wallet,
    Users, 
    Store, 
    LogOut,
    UserCircle
} from 'lucide-react'

interface UserProfile {
    id: string
    name: string
    avatar_url: string | null
    bio: string | null
}

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<SupabaseUser | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [revisionsCount, setRevisionsCount] = useState(0)

    const checkRevisions = async (profileId: string) => {
        try {
            const { data } = await supabase
                .from('proposals')
                .select('id, jobs(status)')
                .eq('criador_id', profileId)
                .eq('status', 'aceita')

            if (data) {
                const inRev = data.filter((p: any) => {
                    const j = Array.isArray(p.jobs) ? p.jobs[0] : p.jobs
                    return j?.status === 'em_revisao'
                })
                setRevisionsCount(inRev.length)
            }
        } catch (e) {
            // silent
        }
    }

    useEffect(() => {
        let channel: any = null

        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                setUser(session.user)
                const { data } = await supabase
                    .from('users')
                    .select('id, name, avatar_url, bio')
                    .eq('supabase_user_id', session.user.id)
                    .single()
                
                if (data) {
                    setProfile(data)
                    checkRevisions(data.id)

                    channel = supabase
                        .channel(`sidebar_notifs:${data.id}`)
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
                            checkRevisions(data.id)
                        })
                        .subscribe()
                }
            }
        }

        fetchUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user)
            } else {
                setUser(null)
                setProfile(null)
                setRevisionsCount(0)
            }
        })

        return () => {
            subscription.unsubscribe()
            if (channel) supabase.removeChannel(channel)
        }
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    const navigation = [
        { name: 'Feed Público', href: '/jobs', icon: LayoutDashboard },
        { name: 'Encontrar Programadores', href: '/programadores', icon: Users },
        { name: 'Marketplace', href: '/marketplace', icon: Store },
    ]

    const clientNav = [
        { name: 'Meus Pedidos', href: '/pedidos', icon: ShoppingBag },
    ]

    const creatorNav = [
        { name: 'Minha Produção', href: '/producao', icon: Palette },
        { name: 'Painel Financeiro', href: '/financeiro', icon: Wallet },
    ]

    return (
        <div className="flex flex-col w-64 h-screen fixed left-0 top-0 bg-[#1A1D23] border-r border-[#FFAE00]/10 shrink-0 shadow-2xl z-50 overflow-y-auto hidden md:flex">
            {/* Logo */}
            <div className="p-6">
                <Link href="/" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFAE00] to-yellow-300">
                    BordadoHub
                </Link>
            </div>

            {/* User Profile Summary */}
            <div className="px-6 mb-8 group cursor-pointer" onClick={() => router.push(user ? `/profile/${user.id}` : '/login')}>
                <div className="flex items-center gap-3 bg-[#0F1115] p-3 rounded-xl border border-white/5 group-hover:border-[#FFAE00]/30 transition-all">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.name} className="w-10 h-10 rounded-full object-cover border border-[#FFAE00]/20" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                            <UserCircle className="w-6 h-6 text-gray-400" />
                        </div>
                    )}
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{profile?.name || 'Carregando...'}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Perfil</p>
                    </div>
                </div>
            </div>

            {/* Navigation Menus */}
            <div className="flex-1 px-4 space-y-8">
                
                {/* Público */}
                <div>
                    <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
                                            ? 'bg-white/10 text-white shadow-sm' 
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-[#FFAE00]' : 'text-gray-500'}`} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Comprador */}
                <div>
                    <h3 className="px-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
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
                                            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
                                            : 'text-gray-400 hover:text-indigo-300 hover:bg-indigo-500/5'
                                    }`}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Programador */}
                <div>
                    <h3 className="px-2 text-xs font-semibold text-[#FFAE00] uppercase tracking-wider mb-3 flex items-center gap-2">
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
                                            ? 'bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/20' 
                                            : 'text-gray-400 hover:text-[#FFAE00] hover:bg-[#FFAE00]/5'
                                    }`}
                                >
                                    <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#FFAE00]' : 'text-gray-500'}`} />
                                    <span className="truncate">{item.name}</span>
                                    {item.href === '/producao' && revisionsCount > 0 && (
                                        <span className="ml-auto shrink-0 whitespace-nowrap bg-amber-500 text-black font-black text-[10px] px-2 py-0.5 rounded-full shadow-sm tracking-tight">
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
            <div className="p-4 mt-auto border-t border-gray-800">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Sair da conta
                </button>
            </div>
        </div>
    )
}
