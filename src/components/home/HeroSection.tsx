'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, Star } from 'lucide-react'
import HeroMarquee from '@/components/home/HeroMarquee'
import HeroAtelierBackdrop from '@/components/home/HeroAtelierBackdrop'
import ProgrammerInviteModal from '@/components/ProgrammerInviteModal'

export default function HeroSection() {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

    return (
        <>
            <section className="hero-bg-matte relative overflow-hidden border-b border-[var(--border-hairline)]">
                <HeroAtelierBackdrop />
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:pt-14 sm:pb-16 lg:py-20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                        {/* Left Column — Fast Decision Copy & Dual CTAs */}
                        <div className="lg:col-span-7 flex flex-col items-start">
                            {/* Translucent Trust Pill */}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border-glass)] bg-white/85 dark:bg-[var(--btn-glass-bg)] shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:shadow-none backdrop-blur-md text-xs font-medium text-[var(--text-primary)] mb-6">
                                <Star className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA] fill-current shrink-0" />
                                <span>4.9/5</span>
                                <span className="text-[var(--text-secondary)]">·</span>
                                <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6] shrink-0" />
                                <span>Pagamento em Custódia Segura</span>
                            </div>

                            {/* Matte Vertical Gradient Headline */}
                            <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-semibold leading-[1.06] tracking-[-0.035em] hero-h1-gradient mb-5 max-w-2xl">
                                Matrizes sob medida e prontas em minutos
                            </h1>

                            {/* High-Contrast 2-Line Subtitle */}
                            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-[1.55] max-w-xl mb-8">
                                Envie sua arte ou logo e receba orçamentos de programadores profissionais em minutos — com aprovação na máquina antes de liberar o repasse.
                            </p>

                            {/* 2 Side-by-Side CTAs (>=48px tap target on mobile) */}
                            <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 mb-4">
                                <Link
                                    href="/jobs/new"
                                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 sm:px-6 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] font-semibold text-sm sm:text-[15px] transition-colors text-center shadow-[0_1px_2px_rgba(15,23,42,0.12)] dark:shadow-none"
                                >
                                    <span>Pedir Matriz Agora</span>
                                    <ArrowRight className="w-4 h-4 shrink-0 hidden sm:inline" />
                                </Link>

                                <Link
                                    href="/marketplace"
                                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 sm:px-6 rounded-lg bg-white/85 hover:bg-white dark:bg-[var(--btn-glass-bg)] dark:hover:bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] backdrop-blur-md text-[var(--text-primary)] hover:border-[#2563EB]/45 dark:hover:border-[#3B82F6]/45 font-semibold text-sm sm:text-[15px] transition-colors text-center shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:shadow-none"
                                >
                                    Explorar Marketplace
                                </Link>
                            </div>

                            {/* Subtle Programmer Onboarding Trigger */}
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="min-h-[44px] inline-flex items-center text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                >
                                    É programador de matrizes?{' '}
                                    <span className="ml-1.5 font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline underline-offset-4">
                                        Produzir no BordadoHub
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Right Column (Desktop) / Stacked Below CTAs (Mobile) — 3-Col Vertical Marquee */}
                        <div className="lg:col-span-5 w-full">
                            <HeroMarquee />
                        </div>
                    </div>
                </div>
            </section>

            <ProgrammerInviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </>
    )
}
