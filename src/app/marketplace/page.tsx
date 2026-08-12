'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Search, Store, UploadCloud, TrendingUp, Tag, Plus } from 'lucide-react'
import ProductCard from '@/components/ProductCard'

export default function MarketplacePage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        async function fetchProducts() {
            const { data, error } = await supabase
                .from('marketplace_products')
                .select('*, seller:seller_id(name, avatar_url, rating)')
                .order('created_at', { ascending: false })

            if (data) {
                setProducts(data)
            } else if (error) {
                console.error("Erro ao buscar produtos do marketplace:", error)
            }
            setLoading(false)
        }

        fetchProducts()
    }, [])

    const filteredProducts = products.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen">
            {/* Hero Header - Minimalist & Compact */}
            <div className="bg-[#1A1D23] border border-white/5 rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-xl group">
                {/* Subtle gradient instead of big blob */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFAE00]/5 to-transparent pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FFAE00]/10 border border-[#FFAE00]/20 text-[#FFAE00] text-[10px] font-bold mb-3 uppercase tracking-[0.2em]">
                            <Store className="w-3 h-3" /> Marketplace
                        </div>
                        <h1 className="text-3xl md:text-3xl font-black text-[#F3F4F6] mb-2">
                             Minhas <span className="text-[#FFAE00]">Matrizes</span>
                        </h1>
                        <p className="text-gray-500 text-sm max-w-xl">
                            Compre arquivos prontos e coleções ou venda suas próprias criações instantaneamente.
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
            <div className="flex flex-wrap gap-3 mb-8">
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-[#FFAE00]/10 hover:border-[#FFAE00]/50 hover:text-[#FFAE00] transition-colors">
                    <TrendingUp className="w-4 h-4" /> Em Alta
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-colors">
                    <Tag className="w-4 h-4" /> Pacotes / Coleções
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-colors">
                    Geral
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-colors">
                    Infantil
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
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
