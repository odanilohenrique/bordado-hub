'use client'

const FORMAT_BADGES = [
    { src: '/svg/formats/pes-brother.svg', alt: '.PES Brother', width: 168 },
    { src: '/svg/formats/dst-tajima.svg', alt: '.DST Tajima', width: 160 },
    { src: '/svg/formats/jef-janome.svg', alt: '.JEF Janome', width: 166 },
    { src: '/svg/formats/exp-bernina.svg', alt: '.EXP Bernina', width: 168 },
    { src: '/svg/formats/xxx-singer.svg', alt: '.XXX Singer', width: 160 },
    { src: '/svg/formats/emb-wilcom.svg', alt: '.EMB Wilcom', width: 166 },
    { src: '/svg/formats/barudan.svg', alt: 'Barudan', width: 140 },
    { src: '/svg/formats/swf.svg', alt: 'SWF', width: 116 },
]

const ECOSYSTEM_METRICS = [
    {
        value: 'Em minutos',
        label: 'Orçamentos no mural',
        detail: 'Programadores verificados respondem direto no seu pedido.',
    },
    {
        value: 'Custódia 24h',
        label: 'Aprovação antes do repasse',
        detail: 'Você testa na máquina e aprova antes do valor ser liberado.',
    },
    {
        value: 'PIX ou 12x',
        label: 'Checkout transparente',
        detail: 'Download liberado automaticamente em até 3s após o PIX.',
    },
    {
        value: 'Multi-formato',
        label: 'Pronto para o bastidor',
        detail: 'Arquivos .PES, .DST, .JEF, .EXP e folha de sequência de cores.',
    },
]

export default function TrustLogowall() {
    return (
        <section className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] py-10 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-6">
                    Compatível com os principais formatos e máquinas de bordar
                </p>

                {/* Seamless Horizontal SVG Logowall Marquee */}
                <div className="relative overflow-hidden py-1">
                    <div className="flex w-max items-center animate-marquee-x">
                        <div className="flex items-center gap-4 pr-4">
                            {FORMAT_BADGES.map((badge, idx) => (
                                <img
                                    key={`a-${idx}`}
                                    src={badge.src}
                                    alt={badge.alt}
                                    width={badge.width}
                                    height={40}
                                    loading="eager"
                                    decoding="async"
                                    className="h-10 w-auto shrink-0 opacity-75 hover:opacity-100 dark:invert transition-opacity"
                                />
                            ))}
                        </div>
                        <div aria-hidden="true" className="flex items-center gap-4 pr-4">
                            {FORMAT_BADGES.map((badge, idx) => (
                                <img
                                    key={`b-${idx}`}
                                    src={badge.src}
                                    alt=""
                                    width={badge.width}
                                    height={40}
                                    loading="eager"
                                    decoding="async"
                                    className="h-10 w-auto shrink-0 opacity-75 hover:opacity-100 dark:invert transition-opacity"
                                />
                            ))}
                        </div>
                    </div>
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[var(--bg-surface)] to-transparent"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--bg-surface)] to-transparent"
                    />
                </div>

                {/* 4 Clean Ecosystem Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-9 pt-9 border-t border-[var(--border-hairline)]">
                    {ECOSYSTEM_METRICS.map((item) => (
                        <div
                            key={item.value}
                            className="rounded-xl bg-[#F7FAFE] dark:bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] surface-matte-elevated p-4 sm:p-5"
                        >
                            <p className="text-lg sm:text-xl font-semibold tracking-tight text-[#2563EB] dark:text-[#60A5FA]">
                                {item.value}
                            </p>
                            <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                                {item.label}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                {item.detail}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
