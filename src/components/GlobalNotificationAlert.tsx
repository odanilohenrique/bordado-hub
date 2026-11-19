'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Bell, X, ExternalLink, Zap } from 'lucide-react'
import { setCached } from '@/lib/clientCache'
import { useAuth } from '@/contexts/AuthContext'

interface Notification {
    id: string
    user_id: string
    type: string
    title: string
    message: string
    link_url: string | null
    is_read: boolean
    created_at: string
}

export default function GlobalNotificationAlert() {
    const { profileId } = useAuth()
    const [currentAlert, setCurrentAlert] = useState<Notification | null>(null)
    const currentAlertIdRef = useRef<string | null>(null)

    useEffect(() => {
        currentAlertIdRef.current = currentAlert?.id ?? null
    }, [currentAlert?.id])

    useEffect(() => {
        let isMounted = true
        let channel: any = null

        const setup = async () => {
            const myProfileId = profileId
            if (!myProfileId) return

            // Fetch existing unread notifications
            const { data: unreads } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', myProfileId)
                .eq('is_read', false)
                .order('created_at', { ascending: false })

            if (!isMounted) return

            // Helper to check if chat popup should be suppressed (only show on first message of conversation)
            const shouldShowPopup = (notif: Notification) => {
                if (notif.type === 'nova_mensagem') {
                    try {
                        // If user is already on the page of this chat, never show popup
                        if (typeof window !== 'undefined' && notif.link_url) {
                            const currentPath = window.location.pathname + window.location.search
                            if (currentPath === notif.link_url || (window.location.search.includes('chat=') && notif.link_url.includes(window.location.search))) {
                                return false
                            }
                        }

                        // Extract chat thread key from link_url (e.g., job_id or chat parameter)
                        const chatKey = notif.link_url || 'chat'
                        const seenKey = `bordadohub_chat_popup_seen_${chatKey}`
                        const hasSeen = sessionStorage.getItem(seenKey)
                        if (hasSeen) {
                            return false // Already popped up for this conversation in this session!
                        }
                        sessionStorage.setItem(seenKey, '1')
                        return true
                    } catch {
                        return true
                    }
                }
                // All other critical notifications (nova_proposta, pagamento, entrega, etc.) always show popup
                return true
            }

            if (unreads && unreads.length > 0) {
                const firstToShow = unreads.find(n => shouldShowPopup(n)) || null
                currentAlertIdRef.current = firstToShow?.id ?? null
                setCurrentAlert(firstToShow)
            }
            const count = unreads?.length || 0
            setCached('unread_notification_count', count, 60000)
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('bordadohub_unread_count', { detail: count }))
            }

            // Listen for notifications in real-time (INSERT and UPDATE)
            channel = supabase
                .channel(`notifs:${myProfileId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${myProfileId}`
                    },
                    (payload) => {
                        if (!isMounted) return
                        const newNotification = payload.new as Notification

                        // Only show popup alert if allowed (e.g. first chat message or system alert)
                        if (shouldShowPopup(newNotification)) {
                            currentAlertIdRef.current = newNotification.id
                            setCurrentAlert(newNotification)
                        }

                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('bordadohub_notification', { detail: newNotification }))
                            window.dispatchEvent(new CustomEvent('bordadohub_reload_job'))
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${myProfileId}`
                    },
                    (payload) => {
                        if (!isMounted) return
                        const updated = payload.new as Notification
                        if (updated.is_read) {
                            if (currentAlertIdRef.current === updated.id) {
                                currentAlertIdRef.current = null
                                setCurrentAlert(null)
                            }
                        }
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('bordadohub_notification_update', { detail: updated }))
                        }
                    }
                )
                .subscribe()
        }

        setup()

        return () => {
            isMounted = false
            if (channel) supabase.removeChannel(channel)
        }
    }, [profileId])

    const markAsRead = async (id: string) => {
        try {
            if (currentAlertIdRef.current === id) {
                currentAlertIdRef.current = null
                setCurrentAlert(null)
            }

            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('bordadohub_reload_job'))
            }
        } catch (error) {
            console.error('Error marking as read:', error)
        }
    }

    const closeAlert = () => {
        if (currentAlert) {
            markAsRead(currentAlert.id)
        }
    }

    const handleNavigate = (url: string) => {
        if (!url) return
        const targetAlertId = currentAlert?.id

        // 1. Fecha o popup imediatamente para dar feedback instantâneo ao usuário no celular
        currentAlertIdRef.current = null
        setCurrentAlert(null)
        if (targetAlertId) {
            // Atualiza no banco em background
            void (async () => {
                try {
                    await supabase
                        .from('notifications')
                        .update({ is_read: true })
                        .eq('id', targetAlertId)

                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('bordadohub_reload_job'))
                    }
                } catch (e) {
                    console.error('Erro ao marcar notificação:', e)
                }
            })()
        }

        // 2. Navegação garantida no celular
        if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            const targetPath = url.split('?')[0]

            if (currentPath === targetPath) {
                // Se já estiver na página do pedido, força o recarregamento para exibir a proposta que acabou de chegar
                window.location.reload()
            } else {
                // Redireciona diretamente para o pedido
                window.location.href = url
            }
        }
    }

    if (!currentAlert) return null

    const payProposalId = currentAlert.link_url?.match(/[?&]pay=([^&]+)/)?.[1]
    const isCounterAccepted = currentAlert.type === 'contraproposta_aceita' || currentAlert.title?.toLowerCase().includes('contraproposta aceita')

    return (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
            {/* Matte DS 2.0 Notification Card */}
            <div className="relative w-full bg-[var(--bg-surface)] border border-[#2563EB]/35 dark:border-[#3B82F6]/35 rounded-2xl shadow-xl pointer-events-auto flex flex-col pt-6 pb-2 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                {/* Matte Cobalt-to-Teal Top Bar */}
                <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: 'linear-gradient(90deg, #2563EB 0%, #0D9488 100%)' }}
                />

                {/* Close Button (>=44x44px) */}
                <button
                    type="button"
                    onClick={closeAlert}
                    className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] rounded-lg transition-colors z-10 cursor-pointer"
                    aria-label="Fechar alerta"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="px-6 pr-12 flex items-start gap-3.5">
                    <div className="flex-shrink-0 bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 p-2.5 rounded-xl border border-[#2563EB]/25 dark:border-[#3B82F6]/25">
                        {isCounterAccepted ? (
                            <Zap className="w-5 h-5 text-[#0F766E] dark:text-[#14B8A6]" />
                        ) : (
                            <Bell className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] leading-tight mb-1">
                            {currentAlert.title}
                        </h3>
                        <p className="text-[var(--text-secondary)] text-sm leading-snug">
                            {currentAlert.message}
                        </p>
                    </div>
                </div>

                {/* Action Area */}
                <div className="px-6 mt-5 mb-3">
                    {isCounterAccepted && payProposalId ? (
                        <div className="flex flex-col gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => handleNavigate(`/checkout/${payProposalId}`)}
                                className="flex items-center justify-center gap-2 w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold min-h-[44px] py-2.5 rounded-lg transition-colors text-xs uppercase tracking-wide cursor-pointer"
                            >
                                <Zap className="w-4 h-4" /> Pagar Agora
                            </button>
                            {currentAlert.link_url && (
                                <button
                                    type="button"
                                    onClick={() => handleNavigate(currentAlert.link_url!)}
                                    className="flex items-center justify-center gap-1.5 w-full bg-[var(--btn-glass-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] font-medium min-h-[44px] py-2.5 rounded-lg text-xs transition-colors border border-[var(--border-hairline)] cursor-pointer"
                                >
                                    Ver Detalhes do Pedido <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ) : currentAlert.link_url ? (
                        <button
                            type="button"
                            onClick={() => handleNavigate(currentAlert.link_url!)}
                            className="flex items-center justify-center gap-2 w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold min-h-[44px] py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
                        >
                            Ver Detalhes <ExternalLink className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={closeAlert}
                            className="w-full bg-[var(--bg-surface-elevated)] hover:opacity-90 text-[var(--text-primary)] font-semibold min-h-[44px] py-2.5 rounded-lg border border-[var(--border-hairline)] transition-colors cursor-pointer"
                        >
                            Entendi
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
