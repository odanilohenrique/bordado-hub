'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import ProductCard from '@/components/ProductCard'
import { 
    ArrowLeft, 
    Store, 
    Sparkles, 
    Star, 
    ShoppingBag, 
    Loader2, 
    AlertCircle,
    User
} from 'lucide-react'

export default function SellerStorePage() {
    const params = useParams()
    const sellerId = params?.sellerId as string

    const [seller, setSeller] = useState<any>(null)
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!sellerId) return

        async function loadStore() {
            try {
                // 1. Fetch seller profile
                const { data: sellerData, error: sErr } = await supabase
                    .from('users')
                    .select('id, name, avatar_url, bio, rating, reviews_count')
                    .eq('id', sellerId)
                    .single()

                if (sellerData) {
                    setSeller(sellerData)
                }

                // 2. Fetch active products from this seller
                const { data: prods, error: pErr } = await supabase
                    .from('marketplace_products')
                    .select('*, seller:seller_id(name, avatar_url, rating)')
                    .eq('seller_id', sellerId)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })

                if (prods) {
                    setProducts(prods)
                }
            } catch (err) {
                console.error('Erro ao carregar loja do vendedor:', err)
            } finally {
                setLoading(false)
            }
        }

        loadStore()
    }, [sellerId])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0D11] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#FFAE00] animate-spin" />
            </div>
        )
    }

    if (!seller) {
        return (
            <div className="min-h-screen bg-[#0B0D11] text-white flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                <h1 className="text-xl font-bold">Loja não encontrada</h1>
                <Link href="/marketplace" className="mt-4 text-[#FFAE00] hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0B0D11] text-white py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Back button */}
                <Link 
                    href="/marketplace" 
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                </Link>

                {/* Seller Banner / Header */}
                <div className="bg-[#12151C] border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFAE00]/5 rounded-full blur-3xl pointer-events-none" />

                    {seller.avatar_url ? (
                        <img 
                            src={seller.avatar_url} 
                            alt={seller.name} 
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#FFAE00]/30 shadow-xl"
                        />
                    ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#FFAE00]/20 text-[#FFAE00] font-black text-3xl flex items-center justify-center border-2 border-[#FFAE00]/30">
                            {seller.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                    )}

                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFAE00]/10 text-[#FFAE00] text-xs font-bold uppercase tracking-wider border border-[#FFAE00]/20">
                            <Store className="w-3.5 h-3.5" />
                            Loja Oficial de Matrizes
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white">{seller.name}</h1>
                        {seller.bio && (
                            <p className="text-sm text-gray-400 max-w-2xl whitespace-pre-line leading-relaxed">
                                {seller.bio}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-gray-400">
                            <div className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                <ShoppingBag className="w-4 h-4 text-[#FFAE00]" />
                                <span className="font-bold text-white">{products.length}</span> matrizes cadastradas
                            </div>
                            {seller.rating && (
                                <div className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                    <span className="font-bold text-white">{Number(seller.rating).toFixed(1)}</span>
                                    <span>({seller.reviews_count || 0} avaliações)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Produtos da Loja */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#FFAE00]" />
                            Catálogo da Loja ({products.length})
                        </h2>
                    </div>

                    {products.length === 0 ? (
                        <div className="text-center py-16 bg-[#12151C] border border-white/5 rounded-2xl">
                            <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">Este vendedor ainda não publicou matrizes ativas.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
