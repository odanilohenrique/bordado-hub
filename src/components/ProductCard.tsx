import Image from 'next/image'
import Link from 'next/link'
import { Download, ShoppingCart, Star } from 'lucide-react'

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price)
}

export default function ProductCard({ product }: { product: any }) {
    const imageUrl = typeof product?.image_url === 'string' ? product.image_url.trim() : ''
    const normalizedFormats: string[] = Array.from(
        new Set<string>(
            (Array.isArray(product?.formats) ? product.formats : [])
                .map((f: unknown) => String(f ?? '').trim().replace(/^\.+/, '').toUpperCase())
                .filter(Boolean)
        )
    )

    return (
        <Link
            href={`/marketplace/${product.id}`}
            className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[var(--border-glass)] rounded-2xl overflow-hidden transition-all duration-200 group flex flex-col h-full relative cursor-pointer interactive-card"
        >
            {/* Image Container (4:3 standardized) */}
            <div className="relative w-full aspect-[4/3] bg-[var(--bg-surface-elevated)] overflow-hidden">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={product.title}
                        fill
                        unoptimized={imageUrl.toLowerCase().endsWith('.svg')}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <>
                        <img
                            src="/brand/v2/logo-bg-dark.svg"
                            alt={product.title}
                            width={720}
                            height={720}
                            decoding="async"
                            className="hidden dark:block w-full h-full object-cover object-center select-none group-hover:scale-105 transition-transform duration-500"
                        />
                        <img
                            src="/brand/v2/logo-bg-light.svg"
                            alt={product.title}
                            width={720}
                            height={720}
                            decoding="async"
                            className="block dark:hidden w-full h-full object-cover object-center select-none group-hover:scale-105 transition-transform duration-500"
                        />
                    </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                {/* Bundle Badge */}
                {product.is_bundle && (
                    <div className="absolute top-3 left-3 bg-[#0F766E] text-white text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md">
                        Pacote ({product.items_count || 2} Matrizes)
                    </div>
                )}

                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                    {normalizedFormats.slice(0, 3).map((fmt) => (
                        <span
                            key={fmt}
                            className="bg-black/75 backdrop-blur-sm border border-white/15 text-[11px] font-medium px-2 py-0.5 rounded text-white"
                        >
                            .{fmt}
                        </span>
                    ))}
                    {normalizedFormats.length > 3 && (
                        <span className="bg-black/75 backdrop-blur-sm border border-white/15 text-[11px] font-semibold px-2 py-0.5 rounded text-[#60A5FA]">
                            +{normalizedFormats.length - 3}
                        </span>
                    )}
                </div>
            </div>

            {/* Content Container */}
            <div className="p-4 sm:p-5 flex flex-col flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] mb-1 line-clamp-1 group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                    {product.title}
                </h3>

                {/* Seller Info */}
                <div className="flex items-center gap-2 mb-3">
                    {product.seller?.avatar_url ? (
                        <img
                            src={product.seller.avatar_url}
                            alt={product.seller.name}
                            loading="lazy"
                            decoding="async"
                            className="w-5 h-5 rounded-full object-cover border border-[var(--border-hairline)]"
                        />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] flex items-center justify-center">
                            <Star className="w-3 h-3 text-[var(--text-secondary)]" />
                        </div>
                    )}
                    <span className="text-xs text-[var(--text-secondary)] truncate">
                        Por <span className="text-[var(--text-primary)] font-medium">{product.seller?.name || 'Programador'}</span>
                    </span>
                </div>

                {/* Price and Action Row */}
                <div className="mt-auto flex items-center justify-between pt-3.5 border-t border-[var(--border-hairline)]">
                    <div className="flex items-end gap-1">
                        {product.price > 0 ? (
                            <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-none">
                                {formatPrice(product.price)}
                            </span>
                        ) : (
                            <span className="text-sm font-semibold text-[#0F766E] dark:text-[#14B8A6] uppercase tracking-wider bg-[#0D9488]/10 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                                <Download className="w-3.5 h-3.5" /> Grátis
                            </span>
                        )}
                    </div>

                    <span className="bg-[#2563EB] group-hover:bg-[#1D4ED8] text-white p-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4" />
                    </span>
                </div>
            </div>
        </Link>
    )
}
