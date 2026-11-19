export default function HeroAtelierBackdrop() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden select-none"
        >
            {/* Architectural Drafting & Embroidery Hoop Vectors */}
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 1440 680"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
            >
                <defs>
                    <pattern
                        id="hero-atelier-grid-pattern"
                        width="64"
                        height="64"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M 64 0 L 0 0 0 64"
                            strokeWidth="1"
                            style={{
                                stroke: 'var(--atelier-grid-stroke)',
                                strokeOpacity: 'var(--atelier-grid-opacity)',
                            }}
                        />
                    </pattern>

                    <radialGradient id="hero-atelier-grid-fade" cx="72%" cy="46%" r="54%">
                        <stop offset="0%" stopColor="white" stopOpacity="1" />
                        <stop offset="65%" stopColor="white" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>

                    <mask id="hero-atelier-grid-mask">
                        <rect width="1440" height="680" fill="url(#hero-atelier-grid-fade)" />
                    </mask>
                </defs>

                {/* Masked Architectural Grid Focused Behind Showcase Side */}
                <rect
                    width="1440"
                    height="680"
                    fill="url(#hero-atelier-grid-pattern)"
                    mask="url(#hero-atelier-grid-mask)"
                />

                {/* Crisp Matte Framing Plane Behind Left Typography */}
                <polygon
                    points="0,0 820,0 680,680 0,680"
                    style={{
                        fill: 'var(--atelier-plane-fill)',
                        fillOpacity: 'var(--atelier-plane-opacity)',
                    }}
                />
                <line
                    x1="820"
                    y1="0"
                    x2="680"
                    y2="680"
                    strokeWidth="1"
                    style={{
                        stroke: 'var(--atelier-diagonal-stroke)',
                        strokeOpacity: 'var(--atelier-diagonal-opacity)',
                    }}
                />

                {/* Technical Embroidery Hoop Arcs Behind Marquee Column */}
                <g transform="translate(1090, 335)">
                    <circle
                        r="296"
                        strokeWidth="1"
                        style={{
                            stroke: 'var(--atelier-hoop-outer)',
                            strokeOpacity: 'var(--atelier-hoop-outer-opacity)',
                        }}
                    />
                    <circle
                        r="248"
                        strokeWidth="1.25"
                        strokeDasharray="5 5"
                        style={{
                            stroke: 'var(--atelier-hoop-stitch)',
                            strokeOpacity: 'var(--atelier-hoop-stitch-opacity)',
                        }}
                    />
                    <circle
                        r="198"
                        strokeWidth="1"
                        strokeDasharray="1.5 5"
                        style={{
                            stroke: 'var(--atelier-hoop-inner)',
                            strokeOpacity: 'var(--atelier-hoop-inner-opacity)',
                        }}
                    />
                </g>

                {/* Horizontal Running-Stitch Baseline */}
                <line
                    x1="0"
                    y1="666"
                    x2="1440"
                    y2="666"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                    style={{
                        stroke: 'var(--atelier-stitch-line)',
                        strokeOpacity: 'var(--atelier-stitch-line-opacity)',
                    }}
                />
            </svg>

            {/* Swiss Container Framing Rails & Desktop Running-Stitch Column Divider */}
            <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8">
                <div className="relative h-full border-x border-[#0F172A]/[0.05] dark:border-white/[0.06]">
                    {/* Vertical Running-Stitch Divider Between Hero Columns on Desktop */}
                    <svg
                        className="hidden lg:block absolute top-0 bottom-0 left-[58.3333%] w-px h-full overflow-visible"
                        preserveAspectRatio="none"
                    >
                        <line
                            x1="0.5"
                            y1="0"
                            x2="0.5"
                            y2="100%"
                            strokeWidth="1"
                            strokeDasharray="4 6"
                            style={{
                                stroke: 'var(--atelier-stitch-line)',
                                strokeOpacity: 'var(--atelier-stitch-line-opacity)',
                            }}
                        />
                    </svg>

                    {/* 4 Crisp Atelier Registration Crosshairs (+) */}
                    <svg
                        className="absolute -top-[5px] -left-[5px] w-2.5 h-2.5"
                        viewBox="0 0 10 10"
                    >
                        <path
                            d="M5 0V10M0 5H10"
                            strokeWidth="1"
                            style={{
                                stroke: 'var(--atelier-crosshair)',
                                strokeOpacity: 'var(--atelier-crosshair-opacity)',
                            }}
                        />
                    </svg>
                    <svg
                        className="absolute -top-[5px] -right-[5px] w-2.5 h-2.5"
                        viewBox="0 0 10 10"
                    >
                        <path
                            d="M5 0V10M0 5H10"
                            strokeWidth="1"
                            style={{
                                stroke: 'var(--atelier-crosshair)',
                                strokeOpacity: 'var(--atelier-crosshair-opacity)',
                            }}
                        />
                    </svg>
                    <svg
                        className="hidden lg:block absolute top-8 left-[calc(58.3333%-5px)] w-2.5 h-2.5"
                        viewBox="0 0 10 10"
                    >
                        <path
                            d="M5 0V10M0 5H10"
                            strokeWidth="1"
                            style={{
                                stroke: 'var(--atelier-crosshair-accent)',
                                strokeOpacity: 'var(--atelier-crosshair-accent-opacity)',
                            }}
                        />
                    </svg>
                    <svg
                        className="absolute bottom-3.5 -left-[5px] w-2.5 h-2.5"
                        viewBox="0 0 10 10"
                    >
                        <path
                            d="M5 0V10M0 5H10"
                            strokeWidth="1"
                            style={{
                                stroke: 'var(--atelier-crosshair)',
                                strokeOpacity: 'var(--atelier-crosshair-opacity)',
                            }}
                        />
                    </svg>
                </div>
            </div>
        </div>
    )
}
