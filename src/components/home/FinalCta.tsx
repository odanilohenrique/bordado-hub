import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export default function FinalCta() {
    return (
        <section className="py-14 sm:py-20 section-bg-woven">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] surface-matte-elevated p-7 sm:p-12 overflow-hidden">
                    <div
                        aria-hidden="true"
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ background: 'linear-gradient(90deg, #2563EB 0%, #0D9488 100%)' }}
                    />

                    {/* Subtle Corner Embroidery Arc Accent (Dual-Theme) */}
                    <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute right-0 top-0 bottom-0 w-72 h-full select-none"
                        viewBox="0 0 288 260"
                        preserveAspectRatio="xMaxYMid slice"
                        fill="none"
                    >
                        <circle
                            cx="248"
                            cy="130"
                            r="142"
                            strokeWidth="1"
                            style={{
                                stroke: 'var(--atelier-hoop-outer)',
                                strokeOpacity: 'var(--atelier-hoop-outer-opacity)',
                            }}
                        />
                        <circle
                            cx="248"
                            cy="130"
                            r="112"
                            strokeWidth="1.25"
                            strokeDasharray="5 5"
                            style={{
                                stroke: 'var(--atelier-hoop-stitch)',
                                strokeOpacity: 'var(--atelier-hoop-stitch-opacity)',
                            }}
                        />
                    </svg>

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#14B8A6] mb-3">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Sem risco de calote ou arquivo corrompido</span>
                            </div>
                            <h2 className="text-[28px] sm:text-[36px] lg:text-[40px] font-semibold tracking-[-0.03em] leading-[1.12] hero-h1-gradient">
                                Chega de perder peça por matriz mal programada
                            </h2>
                            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3 leading-relaxed">
                                Publique sua arte para orçamento no mural em 60 segundos ou garanta matrizes testadas com download imediato após o PIX.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-3 shrink-0">
                            <Link
                                href="/jobs/new"
                                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] font-semibold text-[15px] transition-colors whitespace-nowrap"
                            >
                                <span>Pedir Matriz Agora</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/marketplace"
                                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-lg bg-white hover:bg-[#F8FAFC] dark:bg-[var(--btn-glass-bg)] dark:hover:bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] text-[var(--text-primary)] hover:border-[#2563EB]/45 font-semibold text-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:shadow-none transition-colors whitespace-nowrap"
                            >
                                Explorar Marketplace
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
