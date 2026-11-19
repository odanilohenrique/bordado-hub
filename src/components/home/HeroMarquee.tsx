'use client'

interface MarqueeItem {
    type: 'image' | 'video'
    src: string
    poster?: string
    alt: string
}

const COLUMN_1: MarqueeItem[] = [
    { type: 'image', src: '/media/marquee/still-01.webp', alt: 'Bordado macro de circuito em tecido escuro' },
    { type: 'video', src: '/media/marquee/crepe.mp4', poster: '/media/marquee/crepe-poster.webp', alt: 'Simulação de pontos de matriz brasão gastronômico' },
    { type: 'image', src: '/media/marquee/still-06.webp', alt: 'Detalhe de pontos tatami em paisagem bordada' },
    { type: 'image', src: '/media/marquee/still-04.webp', alt: 'Programação de pontos em execução' },
]

const COLUMN_2: MarqueeItem[] = [
    { type: 'image', src: '/media/marquee/still-02.webp', alt: 'Matriz circular com ponto cheio e tatami' },
    { type: 'video', src: '/media/marquee/chacara.mp4', poster: '/media/marquee/chacara-poster.webp', alt: 'Simulação de bordado circular multicolorido' },
    { type: 'image', src: '/media/marquee/still-09.webp', alt: 'Close de preenchimento tatami vermelho e preto' },
    { type: 'image', src: '/media/marquee/still-07.webp', alt: 'Construção de camadas em matriz de bordado' },
]

const COLUMN_3: MarqueeItem[] = [
    { type: 'image', src: '/media/marquee/still-05.webp', alt: 'Brasão campestre finalizado para bastidor' },
    { type: 'video', src: '/media/marquee/brutal-force.mp4', poster: '/media/marquee/brutal-force-poster.webp', alt: 'Simulação de matriz esportiva em alta definição' },
    { type: 'image', src: '/media/marquee/still-03.webp', alt: 'Close de acabamento em ponto cheio' },
    { type: 'image', src: '/media/marquee/still-08.webp', alt: 'Emblema esportivo em pontos otimizados' },
    { type: 'image', src: '/media/marquee/still-10.webp', alt: 'Pré-visualização de sequência de costura' },
]

function MarqueeCard({ item }: { item: MarqueeItem }) {
    return (
        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden border border-[var(--border-glass)] dark:border-[var(--border-hairline)] bg-white shadow-[0_2px_6px_rgba(15,23,42,0.06),0_10px_22px_-12px_rgba(15,23,42,0.15)] dark:shadow-none shrink-0">
            {item.type === 'video' ? (
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
            ) : (
                <img
                    src={item.src}
                    alt={item.alt}
                    width={600}
                    height={800}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover object-center"
                />
            )}
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
