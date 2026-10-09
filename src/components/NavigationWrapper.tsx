'use client'

import { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import MobileBottomNav from './MobileBottomNav'
import MobileDrawer from './MobileDrawer'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import NotificationBell from './NotificationBell'
import { useAuth } from '@/contexts/AuthContext'

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        <div className="min-h-screen bg-[#0F1115] flex flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <Sidebar initialUser={user} initialProfile={profile} />

            {/* Mobile Top Header (Fixed on mobile screens) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#14171E]/95 backdrop-blur-md border-b border-white/5 z-30 flex items-center justify-between px-4">
                <Link href={profile?.role === 'criador' ? '/jobs' : '/pedidos'} className="flex items-center py-1">
                    <Image
                        src="/brand/logo-dark-grossa.png"
                        alt="BordadoHub"
                        width={92}
                        height={36}
                        className="h-8 w-auto object-contain"
                        priority
                    />
                </Link>
                <div className="flex items-center gap-3">
                    <NotificationBell profileId={profile?.id} />
                    <button 
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-1.5 text-gray-300 hover:text-white rounded-lg active:bg-white/5 transition-colors"
                        aria-label="Abrir menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Mobile Slide-over Drawer */}
            <MobileDrawer
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                profile={profile}
                userId={user?.id}
            />

            {/* Main Content Area */}
            <div className="flex-1 md:ml-64 mt-14 md:mt-0 w-full min-w-0 flex flex-col">
                {/* Desktop top-right notification bell */}
                <header className="hidden md:flex justify-end p-4 absolute top-0 right-0 w-full pointer-events-none z-30">
                    <div className="pointer-events-auto">
                        <NotificationBell profileId={profile?.id} />
                    </div>
                </header>

                {/* Content with bottom padding to avoid overlapping the bottom nav on mobile */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 w-full flex-1">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation Bar (Fixed at bottom on mobile) */}
            <MobileBottomNav profile={profile} userId={user?.id} />
        </div>
    )
}
