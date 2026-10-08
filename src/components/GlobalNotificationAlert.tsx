'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Bell, X, ExternalLink, Zap, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

import { getCached, setCached } from '@/lib/clientCache'

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
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [currentAlert, setCurrentAlert] = useState<Notification | null>(null)
    const [userId, setUserId] = useState<string | null>(null)

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
            const myProfileId = profile.id
            setUserId(myProfileId)

            // Fetch existing unread notifications
            const { data: unreads } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', myProfileId)
                .eq('is_read', false)
                .order('created_at', { ascending: false })

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
                setNotifications(unreads)
                const firstToShow = unreads.find(n => shouldShowPopup(n)) || null
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
                        const newNotification = payload.new as Notification
                        setNotifications(prev => [newNotification, ...prev])
                        
                        // Only show popup alert if allowed (e.g. first chat message or system alert)
                        if (shouldShowPopup(newNotification)) {
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
                        const updated = payload.new as Notification
                        if (updated.is_read) {
                            setNotifications(prev => prev.filter(n => n.id !== updated.id))
                            if (currentAlert?.id === updated.id) {
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
            if (channel) supabase.removeChannel(channel)
        }
    }, [])

    const markAsRead = async (id: string) => {
        try {
            setNotifications(prev => prev.filter(n => n.id !== id))
            if (currentAlert?.id === id) {
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
        setCurrentAlert(null)
        if (targetAlertId) {
            setNotifications(prev => prev.filter(n => n.id !== targetAlertId))
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center p-4 sm:p-6 pointer-events-none">
            {/* Dark semi-transparent overlay com z-index menor e clique para fechar */}
            <div 
                onClick={closeAlert}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-auto cursor-pointer"
            />

            {/* Card com z-50 acima do overlay para garantir que o toque funcione no celular */}
            <div className="relative z-50 w-full max-w-sm bg-[#1A1D23] border border-[#FFAE00] rounded-2xl shadow-[0_0_50px_rgba(255,174,0,0.3)] pointer-events-auto transform transition-all duration-500 scale-100 flex flex-col pt-6 pb-2 overflow-hidden animate-bounce-in">
                
                {/* Glow bar at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFAE00] to-yellow-300 animate-pulse"></div>
                
                {/* Close Button */}
                <button 
                    type="button"
                    onClick={closeAlert}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-full p-1.5 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="px-6 flex items-start gap-4">
                    <div className="flex-shrink-0 bg-[#FFAE00]/20 p-3 rounded-full border border-[#FFAE00]/40 shadow-[0_0_15px_rgba(255,174,0,0.4)]">
                        {isCounterAccepted ? (
                            <Zap className="w-6 h-6 text-[#FFAE00] animate-bounce" />
                        ) : (
                            <Bell className="w-6 h-6 text-[#FFAE00] animate-wiggle" />
                        )}
                    </div>
                    <div className="flex-1 mt-1">
                        <h3 className="text-lg font-bold text-white leading-tight mb-1">
                            {currentAlert.title}
                        </h3>
                        <p className="text-gray-300 text-sm leading-snug">
                            {currentAlert.message}
                        </p>
                    </div>
                </div>

                {/* Action Area */}
                <div className="px-6 mt-6 mb-4">
                    {isCounterAccepted && payProposalId ? (
                        <div className="flex flex-col gap-2 w-full">
                            <button 
                                type="button"
                                onClick={() => handleNavigate(`/checkout/${payProposalId}`)}
                                className="flex items-center justify-center gap-2 w-full bg-[#FFAE00] hover:bg-[#FFB92E] text-[#0F1115] font-black py-3 rounded-xl transition-transform active:scale-95 uppercase tracking-wide text-xs shadow-lg shadow-[#FFAE00]/20 cursor-pointer"
                            >
                                <Zap className="w-4 h-4 fill-black" /> Pagar Agora
                            </button>
                            {currentAlert.link_url && (
                                <button 
                                    type="button"
                                    onClick={() => handleNavigate(currentAlert.link_url!)}
                                    className="flex items-center justify-center gap-1.5 w-full bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-2.5 rounded-xl text-xs transition-colors border border-white/10 cursor-pointer"
                                >
                                    Ver Detalhes do Pedido <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ) : currentAlert.link_url ? (
                        <button 
                            type="button"
                            onClick={() => handleNavigate(currentAlert.link_url!)}
                            className="flex items-center justify-center gap-2 w-full bg-[#FFAE00] hover:bg-[#FFB92E] text-[#0F1115] font-bold py-3.5 rounded-xl transition-transform active:scale-95 uppercase tracking-wide text-sm shadow-lg shadow-[#FFAE00]/20 cursor-pointer"
                        >
                            Ver Detalhes <ExternalLink className="w-4 h-4 ml-1" />
                        </button>
                    ) : (
                        <button 
                            type="button"
                            onClick={closeAlert}
                            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer"
                        >
                            Entendi
                        </button>
                    )}
                </div>

                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes bounce-in {
                        0% { transform: translateY(-50px) scale(0.9); opacity: 0; }
                        50% { transform: translateY(10px) scale(1.02); opacity: 1; }
                        100% { transform: translateY(0) scale(1); opacity: 1; }
                    }
                    @keyframes wiggle {
                        0%, 100% { transform: rotate(-10deg); }
                        50% { transform: rotate(10deg); }
                    }
                    .animate-bounce-in { animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                    .animate-wiggle { animation: wiggle 0.5s ease-in-out infinite; }
                `}} />
            </div>
        </div>
    )
}
