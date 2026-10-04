'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Bell, Wrench, MessageSquare, CheckCircle, ExternalLink, Check, Zap } from 'lucide-react'
import Link from 'next/link'

interface NotificationItem {
    id: string
    user_id: string
    type: string
    title: string
    message: string
    link_url: string | null
    is_read: boolean
    created_at: string
}

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let channel: any = null
        
        const setup = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            if (!user) return

            const { data: profile } = await supabase
                .from('users')
                .select('id')
                .eq('supabase_user_id', user.id)
                .maybeSingle()

            if (!profile) return
            setUserId(profile.id)

            // Fetch initial count
            const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', profile.id)
                .eq('is_read', false)

            setUnreadCount(count || 0)

            // Listen in real-time
            channel = supabase
                .channel(`bell:${profile.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${profile.id}`
                    },
                    (payload) => {
                        const newNotif = payload.new as NotificationItem
                        setUnreadCount(prev => prev + 1)
                        setNotifications(prev => [newNotif, ...prev])
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${profile.id}`
                    },
                    (payload) => {
                        const updated = payload.new as NotificationItem
                        if (updated.is_read) {
                            setUnreadCount(prev => Math.max(0, prev - 1))
                            setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n))
                        }
                    }
                )
                .subscribe()
        }

        setup()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const fetchNotifications = async () => {
        if (!userId) return
        setLoading(true)
        try {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10)

            if (data) setNotifications(data)
        } finally {
            setLoading(false)
        }
    }

    const toggleDropdown = () => {
        if (!isOpen) {
            fetchNotifications()
        }
        setIsOpen(!isOpen)
    }

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)

        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const markAllAsRead = async () => {
        if (!userId) return
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false)

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={toggleDropdown}
                className="relative p-2 rounded-xl text-gray-300 hover:text-[#FFAE00] hover:bg-white/5 transition-all focus:outline-none"
                title="Notificações"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#1A1D23] border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3.5 border-b border-gray-800 flex items-center justify-between bg-[#0F1115]">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[#FFAE00]" />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Notificações</span>
                            {unreadCount > 0 && (
                                <span className="bg-[#FFAE00]/20 text-[#FFAE00] text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[11px] text-gray-400 hover:text-[#FFAE00] transition-colors flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" /> Marcar lidas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-800/60 scrollbar-thin scrollbar-thumb-gray-800">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center text-xs text-gray-500">Carregando...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-xs text-gray-500">
                                Nenhuma notificação recente.
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const isAdjustment = n.type?.includes('ajuste') || n.title?.includes('Ajuste')
                                const isCounterAccepted = n.type === 'contraproposta_aceita' || n.title?.toLowerCase().includes('contraproposta aceita')
                                const payProposalId = n.link_url?.match(/[?&]pay=([^&]+)/)?.[1]
                                return (
                                    <div
                                        key={n.id}
                                        className={`p-3.5 transition-colors hover:bg-white/5 ${
                                            !n.is_read ? 'bg-[#FFAE00]/5 border-l-2 border-[#FFAE00]' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                isCounterAccepted ? 'bg-amber-500/20 text-[#FFAE00]' : isAdjustment ? 'bg-amber-500/20 text-[#FFAE00]' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {isCounterAccepted ? <Zap className="w-4 h-4 fill-[#FFAE00]" /> : isAdjustment ? <Wrench className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-bold text-white truncate">{n.title}</p>
                                                    <span className="text-[10px] text-gray-500 shrink-0">
                                                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-300 mt-0.5 line-clamp-2 leading-relaxed">
                                                    {n.message}
                                                </p>
                                                {n.link_url && (
                                                    <div className="flex items-center gap-3 mt-2">
                                                        {isCounterAccepted && payProposalId ? (
                                                            <Link
                                                                href={`/checkout/${payProposalId}`}
                                                                onClick={() => {
                                                                    markAsRead(n.id)
                                                                    setIsOpen(false)
                                                                    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bordadohub_reload_job'))
                                                                }}
                                                                className="inline-flex items-center gap-1 text-[11px] font-black bg-[#FFAE00] text-black px-2.5 py-1 rounded-md hover:bg-yellow-400 transition-colors shadow-sm"
                                                            >
                                                                <Zap className="w-3 h-3 fill-black" /> Pagar Agora
                                                            </Link>
                                                        ) : null}
                                                        <Link
                                                            href={n.link_url}
                                                            onClick={() => {
                                                                markAsRead(n.id)
                                                                setIsOpen(false)
                                                                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bordadohub_reload_job'))
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FFAE00] hover:text-yellow-400"
                                                        >
                                                            {isCounterAccepted ? 'Ver Pedido' : 'Abrir Pedido / Chat'} <ExternalLink className="w-3 h-3" />
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
