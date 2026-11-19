'use client'

interface MarqueeItem {
    src: string
    poster: string
    alt: string
}

const COLUMN_1: MarqueeItem[] = [
    {
        src: '/media/marquee/atraves-da-ciencia.mp4',
        poster: '/media/marquee/atraves-da-ciencia-poster.webp',
        alt: 'Simulação de matriz bordada Através da Ciência',
    },
    {
        src: '/media/marquee/crepe.mp4',
        poster: '/media/marquee/crepe-poster.webp',
        alt: 'Simulação de pontos de matriz brasão gastronômico',
    },
    {
        src: '/media/marquee/patchderm.mp4',
        poster: '/media/marquee/patchderm-poster.webp',
        alt: 'Simulação de matriz brasão Patchderm em ponto tatami',
    },
    {
        src: '/media/marquee/thais-closet.mp4',
        poster: '/media/marquee/thais-closet-poster.webp',
        alt: 'Simulação de logotipo bordado em ponto cheio dourado',
    },
]

const COLUMN_2: MarqueeItem[] = [
    {
        src: '/media/marquee/leva-pelo-mundo.mp4',
        poster: '/media/marquee/leva-pelo-mundo-poster.webp',
        alt: 'Simulação de bordado circular trailer e violão',
    },
    {
        src: '/media/marquee/chacara.mp4',
        poster: '/media/marquee/chacara-poster.webp',
        alt: 'Simulação de bordado circular paisagem campestre',
    },
    {
        src: '/media/marquee/loirinha-liz.mp4',
        poster: '/media/marquee/loirinha-liz-poster.webp',
        alt: 'Simulação de matriz infantil personalizada com lettering',
    },
    {
        src: '/media/marquee/brasao-psi.mp4',
        poster: '/media/marquee/brasao-psi-poster.webp',
        alt: 'Simulação de brasão de Psicologia em ponto cheio',
    },
]

const COLUMN_3: MarqueeItem[] = [
    {
        src: '/media/marquee/brutal-force.mp4',
        poster: '/media/marquee/brutal-force-poster.webp',
        alt: 'Simulação de matriz esportiva em alta definição',
    },
    {
        src: '/media/marquee/flamengo.mp4',
        poster: '/media/marquee/flamengo-poster.webp',
        alt: 'Simulação de escudo esportivo listrado em ponto cheio',
    },
    {
        src: '/media/marquee/chalesin.mp4',
        poster: '/media/marquee/chalesin-poster.webp',
        alt: 'Simulação de tipografia bordada Chalézin Lumiar',
    },
    {
        src: '/media/marquee/emoji.mp4',
        poster: '/media/marquee/emoji-poster.webp',
        alt: 'Simulação de preenchimento tatami em matriz circular',
    },
]

function MarqueeCard({ item }: { item: MarqueeItem }) {
    return (
        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden border border-[var(--border-glass)] dark:border-[var(--border-hairline)] bg-white shadow-[0_2px_6px_rgba(15,23,42,0.06),0_10px_22px_-12px_rgba(15,23,42,0.15)] dark:shadow-[0_4px_12px_rgba(2,6,23,0.45),0_14px_28px_-12px_rgba(2,6,23,0.75)] shrink-0">
            <video
                src={item.src}
                poster={item.poster}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label={item.alt}
                className="w-full h-full object-cover object-center"
            />
        </div>
    )
}

function MarqueeColumn({ items, direction }: { items: MarqueeItem[]; direction: 'up' | 'down' }) {
    return (
        <div className="relative h-full overflow-hidden">
            <div className={`flex flex-col ${direction === 'up' ? 'animate-marquee-up' : 'animate-marquee-down'}`}>
                <div className="flex flex-col gap-3 sm:gap-4 pb-3 sm:pb-4">
                    {items.map((item, idx) => (
                        <MarqueeCard key={`a-${idx}`} item={item} />
                    ))}
                </div>
                <div aria-hidden="true" className="flex flex-col gap-3 sm:gap-4 pb-3 sm:pb-4">
                    {items.map((item, idx) => (
                        <MarqueeCard key={`b-${idx}`} item={item} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function HeroMarquee() {
    return (
        <div
            className="relative w-full h-[360px] sm:h-[440px] lg:h-[540px] overflow-hidden rounded-2xl"
            style={{
                maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
            }}
        >
            <div className="grid grid-cols-3 gap-3 sm:gap-4 h-full">
                <MarqueeColumn items={COLUMN_1} direction="up" />
                <MarqueeColumn items={COLUMN_2} direction="down" />
                <MarqueeColumn items={COLUMN_3} direction="up" />
            </div>
        </div>
    )
}
