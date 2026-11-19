'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import MobileBottomNav from './MobileBottomNav'
import MobileDrawer from './MobileDrawer'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import NotificationBell from './NotificationBell'
import BrandLogo from './BrandLogo'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth()
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Delay rendering the authenticated layout until after hydration completes.
    // This ensures the server-rendered HTML and the first client render match exactly.
    useEffect(() => {
        setMounted(true)
    }, [])

    const isFullBleedPublicRoute = pathname === '/' || pathname === '/how-it-works'

    // Before mount or if not authenticated, render the public layout.
    // This prevents hydration mismatches and SEO blockers.
    if (!mounted || !user) {
        return (
            <div className="min-h-screen app-canvas-matte text-[var(--text-primary)] flex flex-col">
                <Navbar />
                <main
                    className={
                        isFullBleedPublicRoute
                            ? 'flex-1 w-full'
                            : 'flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full'
                    }
                >
                    {children}
                </main>
            </div>
        )
    }

    // Authenticated Layout
    return (
        <div className="min-h-screen app-canvas-matte text-[var(--text-primary)] flex flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <Sidebar initialUser={user} initialProfile={profile} />

            {/* Mobile Top Header (64px frosted glass) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-[var(--bg-primary)]/90 backdrop-blur-[20px] border-b border-[var(--border-hairline)] z-30 flex items-center justify-between px-4">
                <Link href={profile?.role === 'criador' ? '/jobs' : '/pedidos'} className="flex items-center py-1">
                    <BrandLogo variant="horizontal" className="h-7 w-auto" priority />
                </Link>
                <div className="flex items-center gap-1.5">
                    <ThemeToggle />
                    <NotificationBell profileId={profile?.id} />
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--btn-glass-bg)] transition-colors cursor-pointer"
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
            <div className="flex-1 md:ml-64 mt-16 md:mt-0 w-full min-w-0 flex flex-col">
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
