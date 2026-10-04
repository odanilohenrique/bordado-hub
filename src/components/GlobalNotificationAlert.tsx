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
            let myProfileId = getCached<string>('current_user_profile_id')
            if (!myProfileId) {
                const { data: { session } } = await supabase.auth.getSession()
                const user = session?.user
                if (!user) return

                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('supabase_user_id', user.id)
                    .maybeSingle()

                if (!profile) return
                myProfileId = profile.id
                setCached('current_user_profile_id', profile.id, 300000)
            }
            setUserId(myProfileId)

            // Fetch existing unread notifications
            const { data: unreads } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', myProfileId)
                .eq('is_read', false)
                .order('created_at', { ascending: false })

            if (unreads && unreads.length > 0) {
                setNotifications(unreads)
                setCurrentAlert(unreads[0])
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
                        setCurrentAlert(newNotification)
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
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)
            
            setNotifications(prev => prev.filter(n => n.id !== id))
            if (currentAlert?.id === id) {
                setCurrentAlert(null)
            }
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

    if (!currentAlert) return null

    const payProposalId = currentAlert.link_url?.match(/[?&]pay=([^&]+)/)?.[1]
    const isCounterAccepted = currentAlert.type === 'contraproposta_aceita' || currentAlert.title?.toLowerCase().includes('contraproposta aceita')

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center p-4 sm:p-6 pointer-events-none">
            {/* Dark semi-transparent overlay just to draw attention without blocking completely */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-auto"></div>

            <div className="relative w-full max-w-sm bg-[#1A1D23] border border-[#FFAE00] rounded-2xl shadow-[0_0_50px_rgba(255,174,0,0.3)] pointer-events-auto transform transition-all duration-500 scale-100 flex flex-col pt-6 pb-2 overflow-hidden animate-bounce-in">
                
                {/* Glow bar at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFAE00] to-yellow-300 animate-pulse"></div>
                
                {/* Close Button */}
                <button 
                    onClick={closeAlert}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-full p-1 transition-colors"
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
                            <Link 
                                href={`/checkout/${payProposalId}`}
                                onClick={() => markAsRead(currentAlert.id)}
                                className="flex items-center justify-center gap-2 w-full bg-[#FFAE00] hover:bg-[#FFB92E] text-[#0F1115] font-black py-3 rounded-xl transition-transform active:scale-95 uppercase tracking-wide text-xs shadow-lg shadow-[#FFAE00]/20"
                            >
                                <Zap className="w-4 h-4 fill-black" /> Pagar Agora
                            </Link>
                            {currentAlert.link_url && (
                                <Link 
                                    href={currentAlert.link_url}
                                    onClick={() => markAsRead(currentAlert.id)}
                                    className="flex items-center justify-center gap-1.5 w-full bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-2.5 rounded-xl text-xs transition-colors border border-white/10"
                                >
                                    Ver Detalhes do Pedido <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                            )}
                        </div>
                    ) : currentAlert.link_url ? (
                        <Link 
                            href={currentAlert.link_url}
                            onClick={() => markAsRead(currentAlert.id)}
                            className="flex items-center justify-center gap-2 w-full bg-[#FFAE00] hover:bg-[#FFB92E] text-[#0F1115] font-bold py-3 rounded-xl transition-transform active:scale-95 uppercase tracking-wide text-sm shadow-lg shadow-[#FFAE00]/20"
                        >
                            Ver Detalhes <ExternalLink className="w-4 h-4 ml-1" />
                        </Link>
                    ) : (
                        <button 
                            onClick={closeAlert}
                            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
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
