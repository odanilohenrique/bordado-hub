'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Store } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { getCached, setCached } from '@/lib/clientCache'
import ProductCard from '@/components/ProductCard'

const PUBLIC_MARKETPLACE_COLUMNS =
    'id, seller_id, title, description, price, category, formats, image_url, image_urls, is_bundle, items_count, sales_count, is_active, created_at, seller:seller_id(name, avatar_url, rating)'

type QuickFilter = 'all' | 'bestsellers' | 'bundles' | 'singles'

const FILTER_OPTIONS: { id: QuickFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'bestsellers', label: 'Mais Vendidas' },
    { id: 'bundles', label: 'Pacotes até 20 Matrizes' },
    { id: 'singles', label: 'Individuais' },
]

function ShowcaseSkeleton() {
    return (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden animate-pulse flex flex-col">
            <div className="w-full aspect-[4/3] bg-[var(--bg-surface-elevated)]" />
            <div className="p-5 space-y-3">
                <div className="h-5 bg-[var(--bg-surface-elevated)] rounded w-3/4" />
                <div className="h-3.5 bg-[var(--bg-surface-elevated)] rounded w-1/2" />
                <div className="flex justify-between items-center pt-3 border-t border-[var(--border-hairline)]">
                    <div className="h-6 bg-[var(--bg-surface-elevated)] rounded w-20" />
                    <div className="h-9 w-9 bg-[var(--bg-surface-elevated)] rounded-lg" />
                </div>
            </div>
        </div>
    )
}

export default function MarketplaceShowcase() {
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState<QuickFilter>('all')

    useEffect(() => {
        let isMounted = true

        const cached = getCached<any[]>('home_marketplace_showcase')
        if (cached && cached.length > 0) {
            setProducts(cached)
            setLoading(false)
        }

        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 7000)

        async function loadShowcase() {
            try {
                const { data, error } = await supabase
                    .from('marketplace_products')
                    .select(PUBLIC_MARKETPLACE_COLUMNS)
                    .eq('is_active', true)
                    .order('sales_count', { ascending: false })
                    .limit(40)

                if (!isMounted) return
                if (!error && Array.isArray(data)) {
                    let merged = data
                    const hasBundles = data.some(
                        (p) => Boolean(p.is_bundle) && (p.items_count == null || p.items_count <= 20)
                    )

                    if (!hasBundles) {
                        const { data: bundleData, error: bundleError } = await supabase
                            .from('marketplace_products')
                            .select(PUBLIC_MARKETPLACE_COLUMNS)
                            .eq('is_active', true)
                            .eq('is_bundle', true)
                            .or('items_count.is.null,items_count.lte.20')
                            .order('sales_count', { ascending: false })
                            .limit(8)

                        if (!isMounted) return
                        if (!bundleError && Array.isArray(bundleData) && bundleData.length > 0) {
                            const seenIds = new Set(data.map((item) => item.id))
                            merged = [...data, ...bundleData.filter((item) => !seenIds.has(item.id))]
                        }
                    }

                    setProducts(merged)
                    setCached('home_marketplace_showcase', merged, 60000)
                }
            } catch {
                // Silent fallback to empty CTA state
            } finally {
                clearTimeout(safetyTimer)
                if (isMounted) setLoading(false)
            }
        }

        loadShowcase()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [])

    const displayedProducts = useMemo(() => {
        let list = [...products]
        if (activeFilter === 'bestsellers') {
            list.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
        } else if (activeFilter === 'bundles') {
            list = list.filter((p) => Boolean(p.is_bundle) && (p.items_count == null || p.items_count <= 20))
        } else if (activeFilter === 'singles') {
            list = list.filter((p) => !p.is_bundle)
        }
        return list.slice(0, 8)
    }, [products, activeFilter])

    return (
        <section className="py-14 sm:py-20 bg-[var(--bg-primary)] border-b border-[var(--border-hairline)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA] mb-2">
                            Marketplace Instantâneo
                        </p>
                        <h2 className="text-[28px] sm:text-[36px] lg:text-[40px] font-semibold tracking-[-0.03em] leading-[1.12] hero-h1-gradient">
                            Matrizes prontas para baixar agora
                        </h2>
                        <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] mt-2 max-w-2xl">
                            Coleções testadas e matrizes individuais enviadas pelos melhores programadores. Pagou no PIX, liberou na tela.
                        </p>
                    </div>

                    <Link
                        href="/marketplace"
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg border border-[var(--border-glass)] bg-[var(--btn-glass-bg)] text-sm font-semibold text-[var(--text-primary)] hover:border-[#2563EB]/40 transition-colors shrink-0 self-start md:self-auto"
                    >
                        <span>Ver catálogo completo</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Quick Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 mb-8">
                    {FILTER_OPTIONS.map((opt) => {
                        const isActive = activeFilter === opt.id
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setActiveFilter(opt.id)}
                                className={`min-h-[44px] px-4 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                                    isActive
                                        ? 'bg-[#2563EB] text-white border border-[#2563EB]'
                                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-hairline)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        )
                    })}
                </div>

                {/* Product Grid */}
                {loading && products.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <ShowcaseSkeleton key={i} />
                        ))}
                    </div>
                ) : displayedProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {displayedProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-8 sm:p-10 text-center">
                        <Store className="w-8 h-8 text-[#2563EB] dark:text-[#60A5FA] mx-auto mb-3" />
                        <p className="text-base font-semibold text-[var(--text-primary)]">
                            Explore todas as matrizes disponíveis no Marketplace
                        </p>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 mb-5">
                            Nenhuma matriz corresponde a este filtro rápido no momento.
                        </p>
                        <Link
                            href="/marketplace"
                            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors"
                        >
                            Abrir Marketplace Completo
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </section>
    )
}
