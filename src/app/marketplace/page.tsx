'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Search, Store, UploadCloud, TrendingUp, Tag, AlertCircle, RefreshCw } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import { getCached, setCached } from '@/lib/clientCache'

const PUBLIC_MARKETPLACE_COLUMNS =
    'id, seller_id, title, description, price, category, formats, image_url, image_urls, is_bundle, items_count, sales_count, is_active, created_at, seller:seller_id(name, avatar_url, rating)'

function ProductCardSkeleton() {
    return (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden flex flex-col">
            <div className="w-full aspect-[4/3] bg-[var(--bg-surface-elevated)]" />
            <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3">
                <div className="h-5 bg-[var(--bg-surface-elevated)] rounded w-3/4" />
                <div className="h-3 bg-[var(--bg-surface-elevated)] rounded w-1/2" />
                <div className="flex justify-between items-center pt-3.5 border-t border-[var(--border-hairline)]">
                    <div className="h-6 bg-[var(--bg-surface-elevated)] rounded w-20" />
                    <div className="h-9 w-9 bg-[var(--bg-surface-elevated)] rounded-lg" />
                </div>
            </div>
        </div>
    )
}

export default function MarketplacePage() {
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeFilter, setActiveFilter] = useState<string>('all')

    useEffect(() => {
        let isMounted = true

        // Fast client-side cache mount (0ms latency without breaking SSR hydration)
        const cached = getCached<any[]>('marketplace_products')
        if (cached && cached.length > 0) {
            setProducts(cached)
            setLoading(false)
        }

        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 8500)

        async function fetchProducts() {
            try {
                const queryPromise = supabase
                    .from('marketplace_products')
                    .select(PUBLIC_MARKETPLACE_COLUMNS)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(60)

                const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
                    setTimeout(() => resolve({ data: null, error: new Error('Marketplace query timeout') }), 8000)
                )

                const { data, error } = await Promise.race([queryPromise, timeoutPromise])

                if (!isMounted) return

                if (data) {
                    setFetchError(null)
                    setProducts(data)
                    setCached('marketplace_products', data, 60000)
                } else if (error) {
                    console.error("Erro ao buscar produtos do marketplace:", error)
                    if (!cached || cached.length === 0) {
                        setFetchError('Não foi possível carregar as matrizes. Verifique sua conexão e tente novamente.')
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar marketplace:', err)
                if (isMounted && (!cached || cached.length === 0)) {
                    setFetchError('Não foi possível carregar as matrizes. Verifique sua conexão e tente novamente.')
                }
            } finally {
                clearTimeout(safetyTimer)
                if (isMounted) setLoading(false)
            }
        }

        fetchProducts()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [retryCount])

    const filteredProducts = products
        .filter(p => {
            const term = searchTerm.trim().toLowerCase()
            if (term) {
                const cleanTerm = term.replace(/^\.+/, '')
                const formats = Array.isArray(p.formats)
                    ? p.formats
                    : typeof p.formats === 'string'
                        ? p.formats.split(/[,;/\s]+/)
                        : []

                const matchesTitle = (p.title || '').toLowerCase().includes(term)
                const matchesDescription = (p.description || '').toLowerCase().includes(term)
                const matchesCategory = (p.category || '').toLowerCase().includes(term)
                const matchesSeller = (p.seller?.name || '').toLowerCase().includes(term)
                const matchesFormats = formats.some((fmt: unknown) => {
                    if (typeof fmt !== 'string') return false
                    const normalizedFmt = fmt.trim().toLowerCase().replace(/^\.+/, '')
                    return (
                        fmt.toLowerCase().includes(term) ||
                        (cleanTerm.length > 0 && normalizedFmt.includes(cleanTerm))
                    )
                })

                if (!matchesTitle && !matchesDescription && !matchesCategory && !matchesSeller && !matchesFormats) {
                    return false
                }
            }

            if (activeFilter === 'bundle') return p.is_bundle
            if (activeFilter === 'single') return !p.is_bundle
            if (activeFilter === 'trending') return (p.sales_count || 0) > 0 || true
            if (activeFilter !== 'all') return p.category === activeFilter
            return true
        })
        .sort((a, b) => {
            if (activeFilter === 'trending') {
                return (b.sales_count || 0) - (a.sales_count || 0)
            }
            return 0
        })

    return (
        <div className="min-h-screen">
            {/* Hero Header - Minimalist & Compact */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.06)_0%,transparent_60%)] pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/25 text-[#2563EB] dark:text-[#60A5FA] text-[10px] font-semibold mb-3 uppercase tracking-[0.2em]">
                            <Store className="w-3 h-3" /> Marketplace Oficial • Download Imediato
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
                            Catálogo de <span className="text-[#2563EB] dark:text-[#60A5FA]">Matrizes</span>
                        </h1>
                        <p className="text-[var(--text-secondary)] text-sm max-w-xl">
                            Compre matrizes prontas e coleções testadas com liberação instantânea via PIX ou publique suas criações.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <div className="relative w-full sm:w-72">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-[var(--text-secondary)]" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar matrizes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full min-h-[44px] pl-10 pr-3 py-2.5 border border-[var(--border-hairline)] rounded-lg leading-5 bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors text-sm"
                            />
                        </div>
                        
                        <Link
                            href="/marketplace/vender"
                            className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
                        >
                            <UploadCloud className="w-4 h-4" />
                            Quero Vender
                        </Link>
                    </div>
                </div>
            </div>

            {/* Categories/Trending quick actions */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
                <button
                    onClick={() => setActiveFilter('all')}
                    className={`min-h-[44px] inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        activeFilter === 'all'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)]'
                    }`}
                >
                    Todas
                </button>
                <button
                    onClick={() => setActiveFilter('trending')}
                    className={`min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        activeFilter === 'trending'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)]'
                    }`}
                >
                    <TrendingUp className="w-3.5 h-3.5" /> Mais Vendidas
                </button>
                <button
                    onClick={() => setActiveFilter('bundle')}
                    className={`min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        activeFilter === 'bundle'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)]'
                    }`}
                >
                    <Tag className="w-3.5 h-3.5" /> Pacotes & Coleções
                </button>
                <button
                    onClick={() => setActiveFilter('infantil')}
                    className={`min-h-[44px] inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        activeFilter === 'infantil'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)]'
                    }`}
                >
                    Infantil & Bebê
                </button>
                <button
                    onClick={() => setActiveFilter('animais')}
                    className={`min-h-[44px] inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        activeFilter === 'animais'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)]'
                    }`}
                >
                    Animais
                </button>
                <button
                    onClick={() => setActiveFilter('floral')}
                    className={`min-h-[44px] inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        activeFilter === 'floral'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)]'
                    }`}
                >
                    Floral
                </button>
                <button
                    onClick={() => setActiveFilter('religioso')}
                    className={`min-h-[44px] inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        activeFilter === 'religioso'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)]'
                    }`}
                >
                    Religioso
                </button>
                <button
                    onClick={() => setActiveFilter('logos')}
                    className={`min-h-[44px] inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        activeFilter === 'logos'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)]'
                    }`}
                >
                    Logotipos
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                </div>
            ) : fetchError && products.length === 0 ? (
                <div className="bg-[var(--bg-surface)] border border-[#DC2626]/25 dark:border-[#EF4444]/25 rounded-2xl p-12 sm:p-16 text-center max-w-3xl mx-auto mt-10 space-y-4">
                    <div className="bg-[#DC2626]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-10 h-10 text-[#DC2626] dark:text-[#EF4444]" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">Falha ao carregar o Marketplace</h3>
                    <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
                        {fetchError}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setFetchError(null)
                            setLoading(true)
                            setRetryCount((c) => c + 1)
                        }}
                        className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-6 py-3 rounded-lg transition-colors cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tentar novamente
                    </button>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="bg-[var(--bg-surface)] border border-dashed border-[var(--border-glass)] rounded-2xl p-12 sm:p-16 text-center max-w-3xl mx-auto mt-10">
                    <div className="bg-[#2563EB]/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Store className="w-12 h-12 text-[#2563EB] dark:text-[#60A5FA]" />
                    </div>
                    <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">Nenhuma matriz pronta ainda</h3>
                    <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                        A loja acabou de inaugurar! Seja o primeiro a anunciar uma matriz ou pacote de matrizes para nossa comunidade comprar.
                    </p>
                    <Link
                        href="/marketplace/vender"
                        className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                    >
                        <UploadCloud className="w-5 h-5" />
                        Criar Anúncio de Venda
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                    {filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    )
}
