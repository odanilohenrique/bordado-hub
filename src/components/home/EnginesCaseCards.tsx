import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const CASE_CARDS = [
    {
        tag: 'Para Ateliês e Confecções',
        title: 'Encomenda Sob Medida',
        description:
            'Envie a arte, tamanho do bastidor e tecido. Receba propostas de programadores testados e baixe o arquivo pronto com folha de cores.',
        metricPrimary: '90% Programador',
        metricSecondary: 'Propostas em minutos',
        href: '/jobs/new',
        cta: 'Abrir pedido no mural',
        gradient: 'linear-gradient(160deg, #1E3A8A 0%, #0F172A 100%)',
    },
    {
        tag: 'Download Imediato',
        title: 'Marketplace Instantâneo',
        description:
            'Precisa bordar ainda hoje? Escolha pacotes até 20 matrizes ou arquivos avulsos em .PES, .DST e .JEF com liberação em segundos no PIX.',
        metricPrimary: '85% Loja',
        metricSecondary: 'Liberação em 3s',
        href: '/marketplace',
        cta: 'Explorar catálogo',
        gradient: 'linear-gradient(160deg, #1E293B 0%, #0A0F1D 100%)',
    },
    {
        tag: 'Custódia Asaas 24h',
        title: 'Garantia em Custódia',
        description:
            'Seu pagamento fica guardado em custódia segura. Só liberamos o repasse depois que você baixar, bordar a amostra e aprovar o resultado.',
        metricPrimary: 'PIX / 12x',
        metricSecondary: 'Ajuste garantido',
        href: '/how-it-works',
        cta: 'Entender garantias',
        gradient: 'linear-gradient(160deg, #115E59 0%, #0A191E 100%)',
    },
]

export default function EnginesCaseCards() {
    return (
        <section className="py-14 sm:py-20 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mb-10">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#14B8A6] mb-2">
                        Como o BordadoHub Funciona
                    </p>
                    <h2 className="text-[28px] sm:text-[36px] lg:text-[40px] font-semibold tracking-[-0.03em] leading-[1.12] hero-h1-gradient">
                        Dois motores para o seu ateliê produzir sem atraso
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {CASE_CARDS.map((card) => (
                        <Link
                            key={card.title}
                            href={card.href}
                            style={{ background: card.gradient }}
                            className="group relative rounded-2xl border border-[var(--border-hairline)] p-6 sm:p-7 flex flex-col justify-between min-h-[300px] overflow-hidden interactive-card"
                        >
                            {/* Subtle bottom dark vignette for crisp readability */}
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent"
                            />

                            <div className="relative z-10">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/15 text-white mb-5">
                                    {card.tag}
                                </span>
                                <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em] mb-3 flex items-center justify-between gap-2">
                                    <span>{card.title}</span>
                                    <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                                </h3>
                                <p className="text-sm sm:text-[15px] text-slate-200 leading-relaxed">
                                    {card.description}
                                </p>
                            </div>

                            <div className="relative z-10 mt-8 pt-4 border-t border-white/15 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-base font-semibold text-white">
                                        {card.metricPrimary}
                                    </p>
                                    <p className="text-xs text-slate-300">
                                        {card.metricSecondary}
                                    </p>
                                </div>
                                <span className="text-xs font-semibold text-[#93C5FD] group-hover:text-white transition-colors">
                                    {card.cta}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
