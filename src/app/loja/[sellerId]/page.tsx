'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { clearCache } from '@/lib/clientCache'
import ProductCard from '@/components/ProductCard'
import { toast } from 'sonner'
import { 
    ArrowLeft, 
    Store, 
    Sparkles, 
    Star, 
    ShoppingBag, 
    Loader2, 
    AlertCircle,
    Plus,
    Pause,
    Play,
    Trash2,
    ExternalLink,
    ShieldCheck
} from 'lucide-react'

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price)
}

export default function SellerStorePage() {
    const params = useParams()
    const sellerId = params?.sellerId as string
    const { user, profile, profileId, loading: authLoading } = useAuth()

    const [seller, setSeller] = useState<any>(null)
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    
    // Store owner management states
    const [filter, setFilter] = useState<'todas' | 'ativas' | 'pausadas'>('todas')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [productToDelete, setProductToDelete] = useState<any | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Resolved owner status
    const isOwner = useMemo(() => {
        if (authLoading || !seller) return false
        return Boolean(
            (profile?.id && (profile.id === seller.id || profile.id === sellerId)) ||
            (profileId && (profileId === seller.id || profileId === sellerId)) ||
            (user?.id && (user.id === seller.supabase_user_id || user.id === sellerId))
        )
    }, [authLoading, seller, sellerId, profile?.id, profileId, user?.id])

    useEffect(() => {
        if (!sellerId) return

        let isMounted = true

        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 4000)

        async function loadStore() {
            if (!seller) setLoading(true)
            try {
                const cleanSellerId = sellerId.trim()
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSellerId)

                // 1. Fetch seller profile
                let sellerQuery = supabase
                    .from('users')
                    .select('id, name, avatar_url, bio, rating, reviews_count, supabase_user_id')

                if (isUuid) {
                    sellerQuery = sellerQuery.or(`id.eq.${cleanSellerId},supabase_user_id.eq.${cleanSellerId}`)
                } else {
                    sellerQuery = sellerQuery.eq('id', cleanSellerId)
                }

                const { data: sellerData } = await sellerQuery.maybeSingle()

                if (!sellerData) {
                    if (isMounted) {
                        setSeller(null)
                        setLoading(false)
                    }
                    return
                }

                if (isMounted) {
                    setSeller(sellerData)
                }

                // Check ownership for query scoping
                const resolvedOwner = Boolean(
                    (profile?.id && (profile.id === sellerData.id || profile.id === cleanSellerId)) ||
                    (profileId && (profileId === sellerData.id || profileId === cleanSellerId)) ||
                    (user?.id && (user.id === sellerData.supabase_user_id || user.id === cleanSellerId))
                )

                // 2. Fetch products from this seller
                let prodQuery = supabase
                    .from('marketplace_products')
                    .select('*, seller:seller_id(name, avatar_url, rating)')
                    .eq('seller_id', sellerData.id)

                if (!resolvedOwner) {
                    prodQuery = prodQuery.eq('is_active', true)
                }

                const { data: prods } = await prodQuery.order('created_at', { ascending: false })

                if (isMounted && prods) {
                    setProducts(prods)
                }
            } catch (err) {
                console.error('Erro ao carregar loja do vendedor:', err)
            } finally {
                clearTimeout(safetyTimer)
                if (isMounted) setLoading(false)
            }
        }

        loadStore()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [sellerId, profile?.id, profileId, user?.id])

    // Toggle Pause / Resume
    const handleTogglePause = async (product: any) => {
        const nextActiveState = !product.is_active
        setActionLoading(product.id)

        // Optimistic UI update
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: nextActiveState } : p))

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            const res = await fetch(`/api/marketplace/products/${product.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    action: nextActiveState ? 'resume' : 'pause',
                    is_active: nextActiveState
                })
            })

            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                // Rollback optimistic update
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: product.is_active } : p))
                throw new Error(data.error || 'Erro ao atualizar status da matriz.')
            }

            clearCache('marketplace_products')
            toast.success(nextActiveState ? 'Matriz reativada com sucesso!' : 'Matriz pausada com sucesso!')
        } catch (err: any) {
            console.error('Erro ao alternar status da matriz:', err)
            toast.error(err.message || 'Falha ao alterar status da matriz.')
        } finally {
            setActionLoading(null)
        }
    }

    // Soft-delete confirm action
    const handleConfirmDelete = async () => {
        if (!productToDelete) return

        setIsDeleting(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            const res = await fetch(`/api/marketplace/products/${productToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            })

            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao desativar matriz.')
            }

            // Remove from current local state
            setProducts(prev => prev.filter(p => p.id !== productToDelete.id))
            clearCache('marketplace_products')
            toast.success('Matriz desativada com sucesso!')
            setProductToDelete(null)
        } catch (err: any) {
            console.error('Erro ao desativar matriz:', err)
            toast.error(err.message || 'Falha ao desativar matriz.')
        } finally {
            setIsDeleting(false)
        }
    }

    // Filter products
    const filteredProducts = useMemo(() => {
        if (!isOwner) return products
        if (filter === 'ativas') return products.filter(p => p.is_active === true)
        if (filter === 'pausadas') return products.filter(p => p.is_active === false)
        return products
    }, [products, isOwner, filter])

    const activeCount = useMemo(() => products.filter(p => p.is_active).length, [products])
    const pausedCount = useMemo(() => products.filter(p => !p.is_active).length, [products])

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
                <div className="flex items-center justify-between">
                    <Link 
                        href="/marketplace" 
                        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                    </Link>

                    {isOwner && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFAE00]/10 text-[#FFAE00] text-xs font-bold border border-[#FFAE00]/20">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Modo Administrador da Loja
                        </div>
                    )}
                </div>

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
                                <span className="font-bold text-white">{products.length}</span> matrizes {isOwner ? `(${activeCount} ativas${pausedCount > 0 ? `, ${pausedCount} pausadas` : ''})` : 'cadastradas'}
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

                    {isOwner && (
                        <div className="sm:self-center">
                            <Link
                                href="/marketplace/vender"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FFAE00] to-amber-500 hover:brightness-110 text-[#0F1115] font-extrabold text-sm rounded-xl shadow-lg shadow-[#FFAE00]/20 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                <Plus className="w-4 h-4 stroke-[3]" />
                                Nova Matriz
                            </Link>
                        </div>
                    )}
                </div>

                {/* Produtos da Loja */}
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#FFAE00]" />
                            {isOwner ? `Gerenciar Matrizes (${filteredProducts.length})` : `Catálogo da Loja (${products.length})`}
                        </h2>

                        {/* Owner Toolbar with Filters and CTA */}
                        {isOwner && (
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex bg-[#12151C] p-1 rounded-xl border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setFilter('todas')}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            filter === 'todas'
                                                ? 'bg-gradient-to-r from-[#FFAE00] to-amber-500 text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        Todas ({products.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilter('ativas')}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            filter === 'ativas'
                                                ? 'bg-gradient-to-r from-[#FFAE00] to-amber-500 text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${filter === 'ativas' ? 'bg-[#0F1115]' : 'bg-emerald-400'}`} />
                                        Ativas ({activeCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilter('pausadas')}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            filter === 'pausadas'
                                                ? 'bg-gradient-to-r from-[#FFAE00] to-amber-500 text-[#0F1115] shadow-md shadow-[#FFAE00]/20'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${filter === 'pausadas' ? 'bg-[#0F1115]' : 'bg-amber-400'}`} />
                                        Pausadas ({pausedCount})
                                    </button>
                                </div>

                                <Link
                                    href="/marketplace/vender"
                                    className="sm:hidden inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FFAE00] to-amber-500 hover:brightness-110 text-[#0F1115] rounded-xl font-extrabold text-xs shadow-md shadow-[#FFAE00]/20"
                                >
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                    Nova Matriz
                                </Link>
                            </div>
                        )}
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-16 bg-[#12151C] border border-white/5 rounded-2xl p-6">
                            <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            {isOwner ? (
                                <>
                                    <p className="text-white font-bold text-base mb-1">
                                        {filter === 'todas'
                                            ? 'Você ainda não cadastrou nenhuma matriz.'
                                            : `Nenhuma matriz ${filter === 'ativas' ? 'ativa' : 'pausada'} encontrada.`}
                                    </p>
                                    <p className="text-gray-400 text-sm max-w-md mx-auto mb-5">
                                        Cadastre suas matrizes prontas e comece a vender no marketplace oficial.
                                    </p>
                                    <Link
                                        href="/marketplace/vender"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FFAE00] to-amber-500 hover:brightness-110 text-[#0F1115] font-extrabold text-sm rounded-xl shadow-lg shadow-[#FFAE00]/20"
                                    >
                                        <Plus className="w-4 h-4 stroke-[3]" />
                                        Cadastrar Matriz
                                    </Link>
                                </>
                            ) : (
                                <p className="text-gray-400 text-sm">Este vendedor ainda não publicou matrizes ativas.</p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.map((product) => (
                                isOwner ? (
                                    /* Owner Management Card */
                                    <div 
                                        key={product.id}
                                        className={`bg-[#161920] border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col relative ${
                                            product.is_active 
                                                ? 'border-white/10 hover:border-[#FFAE00]/40' 
                                                : 'border-white/5 opacity-85 hover:opacity-100 hover:border-amber-500/40'
                                        }`}
                                    >
                                        {/* Image & Badges */}
                                        <div className="relative w-full h-48 bg-[#0F1115] overflow-hidden group">
                                            <Link href={`/marketplace/${product.id}`} className="block w-full h-full">
                                                <img
                                                    src={product.image_url}
                                                    alt={product.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#161920] via-transparent to-transparent opacity-80" />
                                            </Link>

                                            {/* Status Badge */}
                                            <div className="absolute top-3 left-3 flex items-center gap-2">
                                                {product.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-lg">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        Ativa
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-lg">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                        Pausada
                                                    </span>
                                                )}

                                                {product.is_bundle && (
                                                    <span className="bg-[#FFAE00] text-[#0F1115] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md">
                                                        Pacote ({product.items_count || 2})
                                                    </span>
                                                )}
                                            </div>

                                            {/* Formats badges */}
                                            <div className="absolute bottom-3 left-3 flex gap-1">
                                                {product.formats?.slice(0, 3).map((fmt: string) => (
                                                    <span key={fmt} className="bg-[#0F1115]/90 backdrop-blur-sm border border-white/10 text-[10px] font-bold px-2 py-0.5 rounded text-gray-300">
                                                        .{fmt}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-4 flex flex-col flex-1">
                                            <Link href={`/marketplace/${product.id}`} className="hover:text-[#FFAE00] transition-colors">
                                                <h3 className="text-base font-bold text-white line-clamp-1 mb-1">{product.title}</h3>
                                            </Link>

                                            {/* Price & Sales */}
                                            <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                                                <span className="text-lg font-black text-[#FFAE00]">
                                                    {product.price > 0 ? formatPrice(product.price) : 'Grátis'}
                                                </span>
                                                <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5 font-medium">
                                                    {product.sales_count || 0} {product.sales_count === 1 ? 'venda' : 'vendas'}
                                                </span>
                                            </div>

                                            {/* Owner Controls Action Row */}
                                            <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-2">
                                                {/* Pause / Resume Button */}
                                                <button
                                                    type="button"
                                                    disabled={actionLoading === product.id}
                                                    onClick={() => handleTogglePause(product)}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border disabled:opacity-50 ${
                                                        product.is_active
                                                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'
                                                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                                                    }`}
                                                    title={product.is_active ? 'Pausar vendas desta matriz' : 'Reativar vendas desta matriz'}
                                                >
                                                    {actionLoading === product.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : product.is_active ? (
                                                        <>
                                                            <Pause className="w-3.5 h-3.5" />
                                                            Pausar
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="w-3.5 h-3.5 fill-current" />
                                                            Reativar
                                                        </>
                                                    )}
                                                </button>

                                                {/* Soft Delete Button */}
                                                <button
                                                    type="button"
                                                    disabled={actionLoading === product.id}
                                                    onClick={() => setProductToDelete(product)}
                                                    className="py-2 px-3 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                                    title="Excluir matriz da loja"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>

                                                {/* View Product Link */}
                                                <Link
                                                    href={`/marketplace/${product.id}`}
                                                    className="py-2 px-3 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all flex items-center justify-center"
                                                    title="Ver página da matriz no marketplace"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Non-owner Standard Product Card */
                                    <ProductCard key={product.id} product={product} />
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Confirmação para Desativar / Excluir Matriz */}
            {productToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#12151C] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold text-white">Desativar Matriz</h3>
                                <p className="text-xs text-gray-400">Remover matriz da vitrine pública</p>
                            </div>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 mb-5 space-y-2">
                            <p className="text-sm text-gray-300 leading-relaxed">
                                Tem certeza que deseja desativar a matriz <strong className="text-white">&quot;{productToDelete.title}&quot;</strong>?
                            </p>
                            <p className="text-xs text-gray-400 flex items-start gap-1.5 leading-normal">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>
                                    A matriz deixará de ser exibida no Marketplace para novos clientes. Clientes que já a compraram continuarão tendo acesso aos downloads adquiridos.
                                </span>
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setProductToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 bg-white/5 border border-white/10 text-gray-300 font-bold py-3 rounded-xl hover:bg-white/10 transition-colors text-sm disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Desativando...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Sim, Desativar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
