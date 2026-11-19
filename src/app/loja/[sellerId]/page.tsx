'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { clearCache, getCached, setCached } from '@/lib/clientCache'
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
    ShieldCheck,
    Pencil,
    RefreshCw
} from 'lucide-react'

const PUBLIC_STORE_PRODUCT_COLUMNS =
    'id, seller_id, title, description, price, category, formats, image_url, image_urls, is_bundle, items_count, sales_count, is_active, created_at, seller:seller_id(name, avatar_url, rating)'

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price)
}

export default function SellerStorePage() {
    const params = useParams()
    const sellerId = params?.sellerId as string
    const { user, profile, profileId } = useAuth()

    const [seller, setSeller] = useState<any>(null)
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [productsError, setProductsError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const fetchedScopeRef = useRef<{ sellerId: string; owner: boolean; retry: number } | null>(null)
    
    // Store owner management states
    const [filter, setFilter] = useState<'todas' | 'ativas' | 'pausadas'>('todas')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [productToDelete, setProductToDelete] = useState<any | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Resolved owner status
    const isOwner = useMemo(() => {
        if (!seller) return false
        return Boolean(
            (profile?.id && (profile.id === seller.id || profile.id === sellerId)) ||
            (profileId && (profileId === seller.id || profileId === sellerId)) ||
            (user?.id && (user.id === seller.supabase_user_id || user.id === sellerId))
        )
    }, [seller, sellerId, profile?.id, profileId, user?.id])

    // Effect 1: Fetch seller profile immediately (non-blocking public fetch)
    useEffect(() => {
        if (!sellerId) return

        const cleanSellerId = sellerId.trim()
        let isMounted = true
        const cachedSeller = getCached<any>(`store_seller_${cleanSellerId}`)
        const cachedProducts = getCached<any[]>(`store_products_${cleanSellerId}`)
        const hasWarmCache = Boolean(cachedSeller && cachedProducts)

        if (hasWarmCache) {
            setSeller(cachedSeller)
            setProducts(cachedProducts!)
            setLoading(false)
        } else {
            setLoading(true)
        }
        setFetchError(null)
        fetchedScopeRef.current = null

        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 8500)

        async function loadSeller() {
            try {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSellerId)

                let sellerQuery = supabase
                    .from('users')
                    .select('id, name, avatar_url, bio, rating, reviews_count, supabase_user_id')

                if (isUuid) {
                    sellerQuery = sellerQuery.or(`id.eq.${cleanSellerId},supabase_user_id.eq.${cleanSellerId}`)
                } else {
                    sellerQuery = sellerQuery.eq('id', cleanSellerId)
                }

                const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
                    setTimeout(() => resolve({ data: null, error: new Error('Seller query timeout') }), 8000)
                )

                const { data: sellerData, error: sellerErr } = await Promise.race([
                    sellerQuery.maybeSingle(),
                    timeoutPromise,
                ])

                if (!isMounted) return

                if (sellerErr) {
                    console.error('Erro ao carregar vendedor:', sellerErr)
                    if (!hasWarmCache) {
                        setFetchError('Não foi possível carregar os dados desta loja. Verifique sua conexão e tente novamente.')
                        setSeller(null)
                    }
                    setLoading(false)
                    return
                }

                if (!sellerData) {
                    setSeller(null)
                    setLoading(false)
                    return
                }

                setSeller(sellerData)
                setCached(`store_seller_${cleanSellerId}`, sellerData, 60000)
                if (sellerData.id && sellerData.id !== cleanSellerId) {
                    setCached(`store_seller_${sellerData.id}`, sellerData, 60000)
                }
            } catch (err) {
                console.error('Erro ao carregar loja do vendedor:', err)
                if (isMounted) {
                    if (!hasWarmCache) {
                        setFetchError('Não foi possível carregar os dados desta loja. Verifique sua conexão e tente novamente.')
                    }
                    setLoading(false)
                }
            } finally {
                clearTimeout(safetyTimer)
            }
        }

        loadSeller()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [sellerId, retryCount])

    // Effect 2: Fetch seller products (avoids double-fetch for visitors when auth hydrates)
    useEffect(() => {
        if (!seller?.id) return

        const cleanSellerId = sellerId.trim()
        const resolvedOwner = Boolean(
            (profile?.id && (profile.id === seller.id || profile.id === cleanSellerId)) ||
            (profileId && (profileId === seller.id || profileId === cleanSellerId)) ||
            (user?.id && (user.id === seller.supabase_user_id || user.id === cleanSellerId))
        )

        if (
            fetchedScopeRef.current &&
            fetchedScopeRef.current.sellerId === seller.id &&
            fetchedScopeRef.current.owner === resolvedOwner &&
            fetchedScopeRef.current.retry === retryCount
        ) {
            return
        }

        let isMounted = true
        setProductsError(null)

        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 8500)

        async function loadProducts() {
            try {
                let prodQuery = supabase
                    .from('marketplace_products')
                    .select(PUBLIC_STORE_PRODUCT_COLUMNS)
                    .eq('seller_id', seller.id)

                if (!resolvedOwner) {
                    prodQuery = prodQuery.eq('is_active', true)
                }

                const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
                    setTimeout(() => resolve({ data: null, error: new Error('Store products query timeout') }), 8000)
                )

                const { data: prods, error: prodErr } = await Promise.race([
                    prodQuery.order('created_at', { ascending: false }),
                    timeoutPromise,
                ])

                if (!isMounted) return

                if (prodErr) {
                    console.error('Erro ao carregar matrizes da loja:', prodErr)
                    setProductsError('Não foi possível carregar as matrizes desta loja. Tente novamente.')
                } else {
                    setProductsError(null)
                    setProducts(prods || [])
                    if (!resolvedOwner) {
                        setCached(`store_products_${cleanSellerId}`, prods || [], 60000)
                        if (seller.id !== cleanSellerId) {
                            setCached(`store_products_${seller.id}`, prods || [], 60000)
                        }
                    }
                    fetchedScopeRef.current = {
                        sellerId: seller.id,
                        owner: resolvedOwner,
                        retry: retryCount,
                    }
                }
            } catch (err) {
                console.error('Erro inesperado ao carregar matrizes da loja:', err)
                if (isMounted) {
                    setProductsError('Não foi possível carregar as matrizes desta loja. Tente novamente.')
                }
            } finally {
                clearTimeout(safetyTimer)
                if (isMounted) setLoading(false)
            }
        }

        loadProducts()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [seller?.id, seller?.supabase_user_id, sellerId, profile?.id, profileId, user?.id, retryCount])

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
            clearCache(`marketplace_product_${product.id}`)
            clearCache(`store_products_${sellerId}`)
            if (seller?.id) clearCache(`store_products_${seller.id}`)
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
            clearCache(`marketplace_product_${productToDelete.id}`)
            clearCache(`store_products_${sellerId}`)
            if (seller?.id) clearCache(`store_products_${seller.id}`)
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
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#2563EB] dark:text-[#60A5FA] animate-spin" />
            </div>
        )
    }

    if (fetchError && !seller) {
        return (
            <div className="min-h-[60vh] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-[#DC2626] dark:text-[#EF4444]" />
                <h1 className="text-xl font-semibold">Erro ao carregar loja</h1>
                <p className="text-sm text-[var(--text-secondary)] max-w-md">{fetchError}</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setFetchError(null)
                            setLoading(true)
                            setRetryCount((c) => c + 1)
                        }}
                        className="min-h-[48px] inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-colors cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" /> Tentar novamente
                    </button>
                    <Link
                        href="/marketplace"
                        className="min-h-[48px] inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] text-[var(--text-primary)] font-semibold text-sm hover:border-[#2563EB]/40 dark:hover:border-[#3B82F6]/40 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                    </Link>
                </div>
            </div>
        )
    }

    if (!seller) {
        return (
            <div className="min-h-[60vh] text-[var(--text-primary)] flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-12 h-12 text-[#DC2626] dark:text-[#EF4444] mb-3" />
                <h1 className="text-xl font-semibold">Loja não encontrada</h1>
                <Link href="/marketplace" className="mt-4 min-h-[44px] px-4 text-[#2563EB] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-2 font-medium">
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                </Link>
            </div>
        )
    }

    return (
        <div className="py-2 sm:py-4">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Back button */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link 
                        href="/marketplace" 
                        className="min-h-[44px] inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                    </Link>

                    {isOwner && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold border border-[#2563EB]/25">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Modo Administrador da Loja
                        </div>
                    )}
                </div>

                {/* Seller Banner / Header */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
                    {seller.avatar_url ? (
                        <img 
                            src={seller.avatar_url} 
                            alt={seller.name} 
                            loading="lazy"
                            decoding="async"
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-[var(--border-glass)]"
                        />
                    ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] font-bold text-3xl flex items-center justify-center border border-[#2563EB]/25">
                            {seller.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                    )}

                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold uppercase tracking-wider border border-[#2563EB]/25">
                            <Store className="w-3.5 h-3.5" />
                            Loja Oficial de Matrizes
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{seller.name}</h1>
                        {seller.bio && (
                            <p className="text-sm text-[var(--text-secondary)] max-w-2xl whitespace-pre-line leading-relaxed">
                                {seller.bio}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-[var(--text-secondary)]">
                            <div className="flex items-center gap-1.5 bg-[var(--bg-surface-elevated)] px-3 py-1.5 rounded-lg border border-[var(--border-hairline)]">
                                <ShoppingBag className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                                <span className="font-semibold text-[var(--text-primary)]">{products.length}</span> matrizes {isOwner ? `(${activeCount} ativas${pausedCount > 0 ? `, ${pausedCount} pausadas` : ''})` : 'cadastradas'}
                            </div>
                            {seller.rating && (
                                <div className="flex items-center gap-1.5 bg-[var(--bg-surface-elevated)] px-3 py-1.5 rounded-lg border border-[var(--border-hairline)]">
                                    <Star className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] fill-current" />
                                    <span className="font-semibold text-[var(--text-primary)]">{Number(seller.rating).toFixed(1)}</span>
                                    <span>({seller.reviews_count || 0} avaliações)</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {isOwner && (
                        <div className="sm:self-center">
                            <Link
                                href="/marketplace/vender"
                                className="min-h-[48px] inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                                Nova Matriz
                            </Link>
                        </div>
                    )}
                </div>

                {/* Produtos da Loja */}
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
                            {isOwner ? `Gerenciar Matrizes (${filteredProducts.length})` : `Catálogo da Loja (${products.length})`}
                        </h2>

                        {/* Owner Toolbar with Filters and CTA */}
                        {isOwner && (
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-hairline)]">
                                    <button
                                        type="button"
                                        onClick={() => setFilter('todas')}
                                        className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                            filter === 'todas'
                                                ? 'bg-[#2563EB] text-white'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        Todas ({products.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilter('ativas')}
                                        className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                            filter === 'ativas'
                                                ? 'bg-[#2563EB] text-white'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${filter === 'ativas' ? 'bg-white' : 'bg-[#0D9488] dark:bg-[#14B8A6]'}`} />
                                        Ativas ({activeCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilter('pausadas')}
                                        className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                            filter === 'pausadas'
                                                ? 'bg-[#2563EB] text-white'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${filter === 'pausadas' ? 'bg-white' : 'bg-slate-400'}`} />
                                        Pausadas ({pausedCount})
                                    </button>
                                </div>

                                <Link
                                    href="/marketplace/vender"
                                    className="sm:hidden min-h-[44px] inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg font-semibold text-xs transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    Nova Matriz
                                </Link>
                            </div>
                        )}
                    </div>

                    {productsError && products.length === 0 ? (
                        <div className="text-center py-12 bg-[var(--bg-surface)] border border-[#DC2626]/25 dark:border-[#EF4444]/25 rounded-2xl p-6 space-y-4">
                            <AlertCircle className="w-10 h-10 text-[#DC2626] dark:text-[#EF4444] mx-auto" />
                            <p className="text-[var(--text-primary)] font-semibold text-base">Falha ao carregar matrizes da loja</p>
                            <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">{productsError}</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setProductsError(null)
                                    setRetryCount((c) => c + 1)
                                }}
                                className="min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
                            >
                                <RefreshCw className="w-4 h-4" /> Tentar novamente
                            </button>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6">
                            <ShoppingBag className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3" />
                            {isOwner ? (
                                <>
                                    <p className="text-[var(--text-primary)] font-semibold text-base mb-1">
                                        {filter === 'todas'
                                            ? 'Você ainda não cadastrou nenhuma matriz.'
                                            : `Nenhuma matriz ${filter === 'ativas' ? 'ativa' : 'pausada'} encontrada.`}
                                    </p>
                                    <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto mb-5">
                                        Cadastre suas matrizes prontas e comece a vender no marketplace oficial.
                                    </p>
                                    <Link
                                        href="/marketplace/vender"
                                        className="min-h-[48px] inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4 stroke-[2.5]" />
                                        Cadastrar Matriz
                                    </Link>
                                </>
                            ) : (
                                <p className="text-[var(--text-secondary)] text-sm">Este vendedor ainda não publicou matrizes ativas.</p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.map((product) => {
                                const normalizedFormats: string[] = Array.from(
                                    new Set<string>(
                                        (Array.isArray(product?.formats) ? product.formats : [])
                                            .map((f: unknown) => String(f ?? '').trim().replace(/^\.+/, '').toUpperCase())
                                            .filter(Boolean)
                                    )
                                )
                                return isOwner ? (
                                    /* Owner Management Card */
                                    <div 
                                        key={product.id}
                                        className={`bg-[var(--bg-surface)] border rounded-2xl overflow-hidden transition-colors flex flex-col relative ${
                                            product.is_active 
                                                ? 'border-[var(--border-hairline)] hover:border-[var(--border-glass)]' 
                                                : 'border-[var(--border-hairline)] opacity-85 hover:opacity-100 hover:border-[var(--border-glass)]'
                                        }`}
                                    >
                                        {/* Image & Badges */}
                                        <div className="relative w-full aspect-[4/3] bg-[var(--bg-surface-elevated)] overflow-hidden group">
                                            <Link href={`/marketplace/${product.id}`} className="block w-full h-full">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.title}
                                                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
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
                                            </Link>

                                            {/* Status Badge */}
                                            <div className="absolute top-3 left-3 flex items-center gap-2">
                                                {product.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#0F766E]/90 text-white border border-white/15 backdrop-blur-md">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
                                                        Ativa
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800/85 text-slate-200 border border-white/15 backdrop-blur-md">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                        Pausada
                                                    </span>
                                                )}

                                                {product.is_bundle && (
                                                    <span className="bg-[#2563EB] text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                        Pacote ({product.items_count || 2})
                                                    </span>
                                                )}
                                            </div>

                                            {/* Formats badges */}
                                            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                                                {normalizedFormats.slice(0, 3).map((fmt) => (
                                                    <span key={fmt} className="bg-black/75 backdrop-blur-sm border border-white/15 text-[11px] font-medium px-2 py-0.5 rounded text-white">
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

                                        {/* Content */}
                                        <div className="p-4 flex flex-col flex-1">
                                            <Link href={`/marketplace/${product.id}`} className="group/title">
                                                <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover/title:text-[#2563EB] dark:group-hover/title:text-[#60A5FA] transition-colors line-clamp-1 mb-1">{product.title}</h3>
                                            </Link>

                                            {/* Price & Sales */}
                                            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-4">
                                                <span className="text-lg font-bold text-[var(--text-primary)]">
                                                    {product.price > 0 ? formatPrice(product.price) : 'Grátis'}
                                                </span>
                                                <span className="bg-[var(--bg-surface-elevated)] px-2 py-1 rounded-md border border-[var(--border-hairline)] font-medium">
                                                    {product.sales_count || 0} {product.sales_count === 1 ? 'venda' : 'vendas'}
                                                </span>
                                            </div>

                                            {/* Owner Controls Action Row */}
                                            <div className="mt-auto pt-3 border-t border-[var(--border-hairline)] flex flex-wrap items-center gap-2">
                                                {/* Edit Button */}
                                                <Link
                                                    href={`/marketplace/vender?edit=${product.id}`}
                                                    className="min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 transition-colors flex items-center justify-center gap-1.5"
                                                    title="Editar matriz"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    <span>Editar</span>
                                                </Link>

                                                {/* Pause / Resume Button */}
                                                <button
                                                    type="button"
                                                    disabled={actionLoading === product.id}
                                                    onClick={() => handleTogglePause(product)}
                                                    className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors border disabled:opacity-50 cursor-pointer ${
                                                        product.is_active
                                                            ? 'bg-[var(--bg-surface-elevated)] hover:border-[var(--border-glass)] text-[var(--text-primary)] border-[var(--border-hairline)]'
                                                            : 'bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0F766E] dark:text-[#14B8A6] border-[#0D9488]/25'
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
                                                    className="min-w-[44px] min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold bg-[#DC2626]/10 hover:bg-[#DC2626]/20 text-[#DC2626] dark:text-[#EF4444] border border-[#DC2626]/25 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                                                    title="Excluir matriz da loja"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>

                                                {/* View Product Link */}
                                                <Link
                                                    href={`/marketplace/${product.id}`}
                                                    className="min-w-[44px] min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold bg-[var(--btn-glass-bg)] hover:border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)] transition-colors flex items-center justify-center"
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
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Confirmação para Desativar / Excluir Matriz */}
            {productToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/25 flex items-center justify-center shrink-0">
                                <Trash2 className="w-6 h-6 text-[#DC2626] dark:text-[#EF4444]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Desativar Matriz</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Remover matriz da vitrine pública</p>
                            </div>
                        </div>

                        <div className="bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl p-4 mb-5 space-y-2">
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                Tem certeza que deseja desativar a matriz <strong className="text-[var(--text-primary)]">&quot;{productToDelete.title}&quot;</strong>?
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5 leading-normal">
                                <AlertCircle className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF4444] shrink-0 mt-0.5" />
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
                                className="flex-1 min-h-[48px] bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] text-[var(--text-primary)] font-semibold py-3 rounded-lg hover:border-[#2563EB]/40 dark:hover:border-[#3B82F6]/40 transition-colors text-sm disabled:opacity-50 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="flex-1 min-h-[48px] bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer"
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
