'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Bell, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'

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
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('users')
                .select('id')
                .eq('supabase_user_id', user.id)
                .single()

            if (!profile) return
            setUserId(profile.id)

            // Fetch existing unread notifications
            const { data: unreads } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false })

            if (unreads && unreads.length > 0) {
                setNotifications(unreads)
                // If there's an unread, show the most recent as an alert
                setCurrentAlert(unreads[0])
            }

            // Listen for new notifications in real-time
            channel = supabase
                .channel(`popup:${profile.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${profile.id}`
                    },
                    (payload) => {
                        console.log('Popup: New notification received!', payload.new)
                        const newNotification = payload.new as Notification
                        setNotifications(prev => [newNotification, ...prev])
                        setCurrentAlert(newNotification)
                    }
                )
                .subscribe((status) => {
                    console.log(`Popup subscription status: ${status}`)
                })
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
                        <Bell className="w-6 h-6 text-[#FFAE00] animate-wiggle" />
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
                    {currentAlert.link_url ? (
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
