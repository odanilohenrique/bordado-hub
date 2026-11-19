'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Bell, Wrench, MessageSquare, ExternalLink, Check, Zap } from 'lucide-react'
import Link from 'next/link'

import { getCached, setCached } from '@/lib/clientCache'
import { useAuth } from '@/contexts/AuthContext'

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

interface NotificationBellProps {
    profileId?: string
}

export default function NotificationBell({ profileId: propProfileId }: NotificationBellProps = {}) {
    const { profileId: authProfileId } = useAuth()
    const activeProfileId = propProfileId || authProfileId || null

    const [unreadCount, setUnreadCount] = useState<number>(0)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [userId, setUserId] = useState<string | null>(activeProfileId)
    const userIdRef = useRef<string | null>(activeProfileId)
    userIdRef.current = activeProfileId || userId
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const cached = getCached<number>('unread_notification_count')
        if (cached !== null) {
            setUnreadCount(cached)
        }
    }, [])

    useEffect(() => {
        if (activeProfileId) {
            setUserId(activeProfileId)
        }
    }, [activeProfileId])

    useEffect(() => {
        let isMounted = true

        const handleUnreadCount = (e: any) => {
            if (typeof e.detail === 'number') {
                setUnreadCount(e.detail)
            }
        }

        const handleNewNotification = (e: any) => {
            const newNotif = e.detail as NotificationItem
            if (newNotif) {
                setUnreadCount(prev => prev + 1)
                setNotifications(prev => [newNotif, ...prev])
            }
        }

        const handleNotificationUpdate = (e: any) => {
            const updated = e.detail as NotificationItem
            if (updated?.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1))
                setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n))
            }
        }

        const handleNotificationRead = async () => {
            const targetUserId = activeProfileId || userIdRef.current
            if (!targetUserId) return
            const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', targetUserId)
                .eq('is_read', false)
            if (count !== null && isMounted) {
                setUnreadCount(count)
                setCached('unread_notification_count', count, 60000)
            }
        }

        window.addEventListener('bordadohub_unread_count', handleUnreadCount)
        window.addEventListener('bordadohub_notification', handleNewNotification)
        window.addEventListener('bordadohub_notification_update', handleNotificationUpdate)
        window.addEventListener('bordadohub_notification_read', handleNotificationRead)

        const resolveUser = async () => {
            if (activeProfileId) {
                setUserId(activeProfileId)
                const { count } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', activeProfileId)
                    .eq('is_read', false)
                if (count !== null && isMounted) {
                    setUnreadCount(count)
                    setCached('unread_notification_count', count, 60000)
                }
            }
        }

        resolveUser()

        return () => {
            isMounted = false
            window.removeEventListener('bordadohub_unread_count', handleUnreadCount)
            window.removeEventListener('bordadohub_notification', handleNewNotification)
            window.removeEventListener('bordadohub_notification_update', handleNotificationUpdate)
            window.removeEventListener('bordadohub_notification_read', handleNotificationRead)
        }
    }, [activeProfileId])

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
                className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--btn-glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)] transition-colors focus:outline-none cursor-pointer"
                title="Notificações"
                aria-label="Notificações"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-[#DC2626] dark:bg-[#EF4444] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3.5 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-surface-elevated)]">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                            <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Notificações</span>
                            {unreadCount > 0 && (
                                <span className="bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="min-h-[36px] px-2.5 -my-1 rounded-lg text-[11px] font-medium text-[var(--text-secondary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA] hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <Check className="w-3.5 h-3.5" /> Marcar lidas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--border-hairline)]">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">Carregando...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
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
                                        className={`p-3.5 transition-colors hover:bg-[var(--bg-surface-elevated)] ${
                                            !n.is_read ? 'bg-[#2563EB]/[0.04] border-l-2 border-[#2563EB] dark:border-[#3B82F6]' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                    isCounterAccepted
                                                        ? 'bg-[#0D9488]/15 text-[#0F766E] dark:text-[#14B8A6]'
                                                        : isAdjustment
                                                            ? 'bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA]'
                                                            : 'bg-[var(--bg-surface-elevated)] text-[#2563EB] dark:text-[#60A5FA]'
                                                }`}
                                            >
                                                {isCounterAccepted ? (
                                                    <Zap className="w-4 h-4" />
                                                ) : isAdjustment ? (
                                                    <Wrench className="w-4 h-4" />
                                                ) : (
                                                    <MessageSquare className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{n.title}</p>
                                                    <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                                                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                                                    {n.message}
                                                </p>
                                                {n.link_url && (
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        {isCounterAccepted && payProposalId ? (
                                                            <Link
                                                                href={`/checkout/${payProposalId}`}
                                                                onClick={() => {
                                                                    markAsRead(n.id)
                                                                    setIsOpen(false)
                                                                    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bordadohub_reload_job'))
                                                                }}
                                                                className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-colors"
                                                            >
                                                                <Zap className="w-3.5 h-3.5" /> Pagar Agora
                                                            </Link>
                                                        ) : null}
                                                        <Link
                                                            href={n.link_url}
                                                            onClick={() => {
                                                                markAsRead(n.id)
                                                                setIsOpen(false)
                                                                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bordadohub_reload_job'))
                                                            }}
                                                            className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:bg-[#2563EB]/10 rounded-lg transition-colors"
                                                        >
                                                            {isCounterAccepted ? 'Ver Pedido' : 'Abrir Pedido / Chat'} <ExternalLink className="w-3.5 h-3.5" />
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
