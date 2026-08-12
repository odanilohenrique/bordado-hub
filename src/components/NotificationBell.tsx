'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Bell } from 'lucide-react'

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0)
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
                    () => {
                        console.log('Bell: New notification received in real-time')
                        setUnreadCount(prev => prev + 1)
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
                        if ((payload.new as any).is_read) {
                            setUnreadCount(prev => Math.max(0, prev - 1))
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`Bell subscription status: ${status}`)
                })
        }

        setup()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [])

    return (
        <div className="relative">
            <Bell className="w-5 h-5 text-gray-300 hover:text-[#FFAE00] transition-colors cursor-pointer" />
            {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </div>
    )
}
