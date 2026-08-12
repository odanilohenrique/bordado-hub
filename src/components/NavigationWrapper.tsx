'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import NotificationBell from './NotificationBell'
import GlobalNotificationAlert from './GlobalNotificationAlert'

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user ?? null)
            setLoading(false)
        }

        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    // While loading, or if not authenticated, render the public layout.
    // This prevents SEO blockers and hydration flickers.
    if (!user) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex flex-col">
                <Navbar />
                <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                    {children}
                </main>
            </div>
        )
    }

    // Authenticated Layout
    return (
        <div className="min-h-screen bg-[#0F1115] flex">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Header (Only visible on small screens when logged in) */}
            <div className="md:hidden fixed top-0 w-full bg-[#1A1D23] border-b border-[#FFAE00]/10 z-40 flex items-center justify-between px-4 h-16">
                <Link href="/" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFAE00] to-yellow-300">
                    BordadoHub
                </Link>
                <div className="flex items-center gap-4">
                    <NotificationBell />
                    <button onClick={() => setMobileMenuOpen(true)}>
                        <Menu className="w-6 h-6 text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)}></div>
                    <div className="relative w-64 bg-[#1A1D23] h-full shadow-2xl flex flex-col pt-16 animate-in slide-in-from-left duration-200">
                        <button 
                            className="absolute top-4 right-4 text-gray-400 p-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                        {/* We reuse the Sidebar component by rendering it inside here, but we pass a prop or just wrap it. 
                            Since Sidebar has 'fixed left-0 hidden md:flex', we can't easily reuse the exact component without passing a prop or refactoring.
                            Actually, let's just make Sidebar handle the mobile state internally, or copy the links.
                            For now, let's close the menu on route change. We'll update Sidebar to accept mobile overlay styling.
                        */}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 md:ml-64 mt-16 md:mt-0 w-full">
                {/* Desktop top-right contextual stuff (like bell) can go here if we want, or we keep it simple */}
                <header className="hidden md:flex justify-end p-4 absolute top-0 right-0 w-full pointer-events-none">
                    <div className="pointer-events-auto">
                        <NotificationBell />
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                    {children}
                </main>
            </div>
            {/* Real-time Popups */}
            <GlobalNotificationAlert />
        </div>
    )
}
