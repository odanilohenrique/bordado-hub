'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import ProductCard from '@/components/ProductCard'
import { 
    Store, 
    User, 
    Share2, 
    Check, 
    ArrowLeft, 
    Layers, 
    Tag, 
    Search,
    ShieldCheck,
    Sparkles
} from 'lucide-react'

interface SellerProfile {
    id: string
    name: string
    avatar_url: string | null
    bio: string | null
    created_at: string
}

export default function SellerStorefrontPage({ params }: { params: Promise<{ sellerId: string }> }) {
    const { sellerId } = use(params)

    const [seller, setSeller] = useState<SellerProfile | null>(null)
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState<'all' | 'single' | 'bundle'>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        async function fetchStorefront() {
            setLoading(true)

            // 1. Fetch Seller Info
            const { data: sellerData, error: sErr } = await supabase
                .from('users')
                .select('id, name, avatar_url, bio, created_at')
                .eq('id', sellerId)
                .single()

            if (sellerData) {
                setSeller(sellerData)
            }

            // 2. Fetch Seller's Products
            const { data: prodsData, error: pErr } = await supabase
                .from('marketplace_products')
                .select('*, seller:seller_id(name, avatar_url)')
                .eq('seller_id', sellerId)
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (prodsData) {
                setProducts(prodsData)
            }

            setLoading(false)
        }

        fetchStorefront()
    }, [sellerId])

    const handleShare = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href)
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        }
    }

    const filtered = products.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase())
        if (!matchesSearch) return false

        if (filterType === 'single') return !p.is_bundle
        if (filterType === 'bundle') return p.is_bundle
        return true
    })

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
            </div>
        )
    }

    if (!seller) {
        return (
            <div className="min-h-screen bg-[#0F1115] text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-black mb-2">Lojinha não encontrada</h1>
                <p className="text-gray-400 mb-6">Este criador não possui uma loja ativa no momento.</p>
                <Link
                    href="/marketplace"
                    className="px-6 py-2.5 rounded-xl bg-[#FFAE00] text-[#0F1115] font-bold text-sm"
                >
                    Explorar Marketplace
                </Link>
            </div>
        )
    }

    const totalSales = products.reduce((acc, curr) => acc + (curr.sales_count || 0), 0)

    return (
        <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Back button */}
                <div className="mb-6">
                    <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#FFAE00] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                    </Link>
                </div>

                {/* Seller Store Banner & Profile Header */}
                <div className="bg-[#16191F] border border-white/5 rounded-3xl p-6 sm:p-10 mb-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFAE00]/10 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        {/* Avatar & Bio */}
                        <div className="flex items-start sm:items-center gap-5">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-800 border-2 border-[#FFAE00]/40 shrink-0 shadow-xl">
                                {seller.avatar_url ? (
                                    <img
                                        src={seller.avatar_url}
                                        alt={seller.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                        <User className="w-10 h-10" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFAE00]/15 text-[#FFAE00] text-[10px] font-black uppercase tracking-wider border border-[#FFAE00]/30 mb-2">
                                    <Store className="w-3 h-3" /> Lojinha Oficial
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    {seller.name}
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl leading-relaxed">
                                    {seller.bio || 'Criador oficial de matrizes de bordado computadorizado.'}
                                </p>
                            </div>
                        </div>

                        {/* Store Metrics & Share button */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                            <div className="flex items-center gap-3 bg-[#0F1115] border border-white/5 rounded-2xl px-5 py-3">
                                <div>
                                    <span className="text-xs text-gray-400 block">Matrizes à Venda</span>
                                    <span className="text-lg font-black text-white">{products.length}</span>
                                </div>
                                <div className="w-px h-8 bg-white/10 mx-2" />
                                <div>
                                    <span className="text-xs text-gray-400 block">Vendas Feitas</span>
                                    <span className="text-lg font-black text-[#FFAE00]">{totalSales}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleShare}
                                className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-[#FFAE00]/10 hover:text-[#FFAE00] text-gray-300 text-xs font-bold border border-white/10 hover:border-[#FFAE00]/40 transition-all flex items-center justify-center gap-2"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4 text-emerald-400" />
                                        <span>Link Copiado!</span>
                                    </>
                                ) : (
                                    <>
                                        <Share2 className="w-4 h-4" />
                                        <span>Compartilhar Loja</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 bg-[#16191F] p-1.5 rounded-2xl border border-white/5 w-fit">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                filterType === 'all'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-md'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Todas ({products.length})
                        </button>
                        <button
                            onClick={() => setFilterType('single')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                filterType === 'single'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-md'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Individuais
                        </button>
                        <button
                            onClick={() => setFilterType('bundle')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filterType === 'bundle'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-md'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" /> Pacotes
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar nesta lojinha..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl bg-[#16191F] text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] text-xs"
                        />
                    </div>
                </div>

                {/* Products Grid */}
                {filtered.length === 0 ? (
                    <div className="bg-[#16191F] border border-white/5 rounded-3xl p-16 text-center max-w-xl mx-auto">
                        <Store className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-1">Nenhuma matriz encontrada</h3>
                        <p className="text-xs text-gray-500">
                            {searchTerm 
                                ? 'Nenhuma matriz corresponde à sua busca nesta lojinha.' 
                                : 'Este criador ainda não publicou matrizes com esse filtro.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                        {filtered.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
