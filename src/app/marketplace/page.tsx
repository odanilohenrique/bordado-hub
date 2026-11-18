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
        <div className="bg-[#1A1D23] border border-gray-800 rounded-2xl overflow-hidden animate-pulse flex flex-col h-80">
            <div className="w-full h-48 bg-white/5" />
            <div className="p-5 flex flex-col justify-between flex-1 space-y-3">
                <div className="h-5 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                    <div className="h-6 bg-white/5 rounded w-20" />
                    <div className="h-9 w-9 bg-white/5 rounded-xl" />
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
            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase())
            if (!matchesSearch) return false

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
            <div className="bg-[#1A1D23] border border-white/5 rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-xl group">
                {/* Subtle gradient instead of big blob */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFAE00]/5 to-transparent pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FFAE00]/10 border border-[#FFAE00]/20 text-[#FFAE00] text-[10px] font-bold mb-3 uppercase tracking-[0.2em]">
                            <Store className="w-3 h-3" /> Marketplace • Em Breve
                        </div>
                        <h1 className="text-3xl md:text-3xl font-black text-[#F3F4F6] mb-2">
                             Minhas <span className="text-[#FFAE00]">Matrizes</span>
                        </h1>
                        <p className="text-gray-400 text-sm max-w-xl">
                            Nosso catálogo de matrizes prontas e coleções estará disponível em breve! Estamos preparando tudo com muito carinho.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <div className="relative w-full sm:w-72">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar matrizes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl leading-5 bg-[#0F1115] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FFAE00] focus:border-[#FFAE00] transition-all text-sm"
                            />
                        </div>
                        
                        <Link
                            href="/marketplace/vender"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#FFAE00] hover:bg-yellow-400 text-[#0F1115] font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-[#FFAE00]/10 hover:scale-105 active:scale-95 text-sm"
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
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeFilter === 'all'
                            ? 'bg-[#FFAE00] text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                            : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    Todas
                </button>
                <button
                    onClick={() => setActiveFilter('trending')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeFilter === 'trending'
                            ? 'bg-[#FFAE00] text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                            : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <TrendingUp className="w-3.5 h-3.5" /> Mais Vendidas
                </button>
                <button
                    onClick={() => setActiveFilter('bundle')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeFilter === 'bundle'
                            ? 'bg-[#FFAE00] text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                            : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <Tag className="w-3.5 h-3.5" /> Pacotes & Coleções
                </button>
                <button
                    onClick={() => setActiveFilter('infantil')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeFilter === 'infantil'
                            ? 'bg-[#FFAE00] text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                            : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    Infantil & Bebê
                </button>
                <button
                    onClick={() => setActiveFilter('animais')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeFilter === 'animais'
                            ? 'bg-[#FFAE00] text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                            : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    Animais
                </button>
                <button
                    onClick={() => setActiveFilter('floral')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeFilter === 'floral'
                            ? 'bg-[#FFAE00] text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                            : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    Floral
                </button>
                <button
                    onClick={() => setActiveFilter('religioso')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeFilter === 'religioso'
                            ? 'bg-[#FFAE00] text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                            : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    Religioso
                </button>
                <button
                    onClick={() => setActiveFilter('logos')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeFilter === 'logos'
                            ? 'bg-[#FFAE00] text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                            : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
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
                <div className="bg-[#1A1D23] border border-red-500/20 rounded-3xl p-12 sm:p-16 text-center max-w-3xl mx-auto mt-10 space-y-4">
                    <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">Falha ao carregar o Marketplace</h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto">
                        {fetchError}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setFetchError(null)
                            setLoading(true)
                            setRetryCount((c) => c + 1)
                        }}
                        className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-[#FFAE00] hover:bg-[#D97706] text-[#0F1115] font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#FFAE00]/20"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tentar novamente
                    </button>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="bg-[#1A1D23] border border-gray-800 border-dashed rounded-3xl p-16 text-center max-w-3xl mx-auto mt-10">
                    <div className="bg-[#FFAE00]/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Store className="w-12 h-12 text-[#FFAE00]" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-300 mb-3">Nenhuma matriz pronta ainda</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        A loja acabou de inaugurar! Seja o primeiro a anunciar uma matriz ou pacote de matrizes para nossa comunidade comprar.
                    </p>
                    <Link
                        href="/marketplace/vender"
                        className="inline-flex items-center justify-center gap-2 bg-[#FFAE00] hover:bg-[#D97706] text-[#0F1115] font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#FFAE00]/20"
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
