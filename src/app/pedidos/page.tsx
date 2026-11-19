'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import JobCard from '@/components/JobCard'
import Link from 'next/link'
import { 
    Plus, 
    Inbox, 
    Target, 
    Trash2, 
    AlertCircle, 
    ShoppingBag, 
    Download, 
    Loader2, 
    CheckCircle2, 
    Store, 
    ExternalLink, 
    FileCode,
    RefreshCw
} from 'lucide-react'
import { clearCache, getCached, setCached, getScopedCached, setScopedCached } from '@/lib/clientCache'
import { toast } from 'sonner'

interface MarketplaceProductItem {
    id: string
    title: string
    description?: string | null
    price?: number
    image_url?: string | null
    file_url?: string | null
    storage_path?: string | null
    formats?: string[] | null
    category?: string | null
    is_bundle?: boolean | null
    items_count?: number | null
    is_active?: boolean | null
}

interface MarketplaceOrderItem {
    id: string
    product_id: string
    buyer_id: string
    seller_id: string
    amount: number
    platform_fee?: number
    seller_net?: number
    status: 'paid' | 'pending' | 'cancelled'
    payment_method?: string
    created_at: string
    product?: MarketplaceProductItem | null
    seller?: {
        id: string
        name: string
        avatar_url?: string | null
    } | null
}

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price)
}

function PedidoCardSkeleton() {
    return (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden p-6 animate-pulse flex flex-col md:flex-row gap-6 mb-4">
            <div className="w-full md:w-64 h-48 bg-[var(--bg-surface-elevated)] rounded-xl shrink-0" />
            <div className="flex-1 flex flex-col justify-between space-y-4 py-2">
                <div className="space-y-3">
                    <div className="h-6 bg-[var(--bg-surface-elevated)] rounded w-3/4" />
                    <div className="h-4 bg-[var(--bg-surface-elevated)] rounded w-1/3" />
                </div>
                <div className="h-4 bg-[var(--bg-surface-elevated)] rounded w-full" />
                <div className="h-10 bg-[var(--bg-surface-elevated)] rounded-xl w-36" />
            </div>
        </div>
    )
}

function MarketplacePurchaseSkeleton() {
    return (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-5 md:p-6 animate-pulse flex flex-col md:flex-row gap-5 items-start md:items-center justify-between mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-[var(--bg-surface-elevated)] shrink-0" />
                <div className="space-y-3 flex-1">
                    <div className="h-5 bg-[var(--bg-surface-elevated)] rounded w-48" />
                    <div className="h-4 bg-[var(--bg-surface-elevated)] rounded w-32" />
                    <div className="h-3 bg-[var(--bg-surface-elevated)] rounded w-24" />
                </div>
            </div>
            <div className="w-full md:w-40 h-10 bg-[var(--bg-surface-elevated)] rounded-xl shrink-0" />
        </div>
    )
}

export default function PedidosPage() {
    const { user: authUser, profileId, loading: authLoading, profileLoading } = useAuth()
    const authUserId = authUser?.id || null

    // Tab state: 'jobs' = Encomendas Sob Medida, 'marketplace' = Minhas Compras do Marketplace
    const [activeTab, setActiveTab] = useState<'jobs' | 'marketplace'>('jobs')

    // Jobs state (SSR-safe initialization; cache hydrated inside useEffect)
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [jobsError, setJobsError] = useState<string | null>(null)
    const [filter, setFilter] = useState<string>('all')
    const [jobToDelete, setJobToDelete] = useState<{ id: string; title: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Marketplace orders state
    const [marketplaceOrders, setMarketplaceOrders] = useState<MarketplaceOrderItem[]>([])
    const [ordersLoading, setOrdersLoading] = useState<boolean>(true)
    const [ordersError, setOrdersError] = useState<string | null>(null)
    const [downloadingProductId, setDownloadingProductId] = useState<string | null>(null)
    const [retryTick, setRetryTick] = useState<number>(0)

    const jobsRef = useRef<any[]>([])
    const ordersRef = useRef<MarketplaceOrderItem[]>([])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const handleReload = () => setRetryTick((t) => t + 1)
        window.addEventListener('bordadohub_reload_job', handleReload)
        return () => {
            window.removeEventListener('bordadohub_reload_job', handleReload)
        }
    }, [])

    // URL query sync
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            if (params.get('tab') === 'marketplace') {
                setActiveTab('marketplace')
            }
        }
    }, [])

    const handleTabChange = (tab: 'jobs' | 'marketplace') => {
        setActiveTab(tab)
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            url.searchParams.set('tab', tab)
            window.history.replaceState({}, '', url.toString())
        }
    }

    const handleConfirmDelete = async () => {
        if (!jobToDelete) return
        const currentUserId = profileId || getCached<string>('current_user_profile_id')
        if (!currentUserId) {
            toast.error('Sessão expirada. Faça login novamente.')
            return
        }
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/jobs/${jobToDelete.id}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Erro ao excluir pedido.')
                setIsDeleting(false)
                return
            }

            toast.success('Pedido excluído com sucesso!')
            setJobs(prev => {
                const next = prev.filter(j => j.id !== jobToDelete.id)
                jobsRef.current = next
                setScopedCached('pedidos_jobs', currentUserId, next, 120000)
                setCached(`pedidos_jobs_${currentUserId}`, next, 120000)
                setCached('pedidos_jobs', next, 120000)
                return next
            })
            clearCache()
            setJobToDelete(null)
        } catch (err) {
            console.error('Erro ao excluir pedido:', err)
            toast.error('Erro ao excluir pedido. Tente novamente.')
        } finally {
            setIsDeleting(false)
        }
    }

    // Instant download handler
    const handleDownloadMatrix = async (productId: string, title?: string) => {
        if (!productId) {
            toast.error('Identificador da matriz inválido.')
            return
        }

        const currentUserId = profileId || getCached<string>('current_user_profile_id')
        if (!currentUserId) {
            toast.error('Faça login para baixar seus arquivos.')
            return
        }

        if (downloadingProductId) return // Debounce against multiple clicks

        setDownloadingProductId(productId)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const headers: Record<string, string> = {}
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`
            }

            const res = await fetch(`/api/marketplace/download/${productId}?userId=${currentUserId}`, { headers })
            const data = await res.json().catch(() => ({}))

            if (!res.ok || data.error || !data.downloadUrl) {
                throw new Error(data.error || 'Erro ao gerar link de download seguro.')
            }

            // Trigger instant download via 60s signed URL
            window.location.href = data.downloadUrl
            toast.success(title ? `Download de "${title}" iniciado!` : 'Download da matriz iniciado com sucesso!')
        } catch (err: any) {
            console.error('Download error:', err)
            toast.error(err.message || 'Falha ao baixar matriz. Tente novamente.')
        } finally {
            setDownloadingProductId(null)
        }
    }

    useEffect(() => {
        let isMounted = true

        // Fallback safety: never let pedidos spin forever
        const authSafetyTimer = setTimeout(() => {
            if (isMounted) {
                setLoading(false)
                setOrdersLoading(false)
            }
        }, 8500)

        const targetId = profileId || getCached<string>('current_user_profile_id')
        const isIdentityPending = !targetId && (authLoading || profileLoading || Boolean(authUserId))

        if (isIdentityPending) {
            setLoading(true)
            setOrdersLoading(true)
            return () => {
                isMounted = false
                clearTimeout(authSafetyTimer)
            }
        }

        if (!targetId) {
            if (authUserId) {
                setJobsError('Não foi possível confirmar seu perfil no momento. Tente novamente.')
                setOrdersError('Não foi possível confirmar seu perfil no momento. Tente novamente.')
            }
            setLoading(false)
            setOrdersLoading(false)
            return () => {
                isMounted = false
                clearTimeout(authSafetyTimer)
            }
        }

        // Fast user-scoped client-side cache mount (0ms latency without SSR hydration mismatch)
        const cachedJobs =
            getScopedCached<any[]>('pedidos_jobs', targetId, { requireNonEmpty: true }) ||
            getCached<any[]>(`pedidos_jobs_${targetId}`)
        if (cachedJobs && cachedJobs.length > 0) {
            jobsRef.current = cachedJobs
            setJobs(cachedJobs)
            setJobsError(null)
            setLoading(false)
        } else if (jobsRef.current.length === 0) {
            setLoading(true)
        }

        const cachedOrders =
            getScopedCached<MarketplaceOrderItem[]>('pedidos_marketplace_orders', targetId, { requireNonEmpty: true }) ||
            getCached<MarketplaceOrderItem[]>(`pedidos_marketplace_orders_${targetId}`)
        if (cachedOrders && cachedOrders.length > 0) {
            ordersRef.current = cachedOrders
            setMarketplaceOrders(cachedOrders)
            setOrdersError(null)
            setOrdersLoading(false)
        } else if (ordersRef.current.length === 0) {
            setOrdersLoading(true)
        }

        // 1. Fetch custom jobs
        async function fetchJobs() {
            try {
                let jobsResult: any[] | null = null
                let lastError: any = null

                for (let attempt = 0; attempt < 2; attempt++) {
                    if (!isMounted) return
                    const queryPromise = supabase
                        .from('jobs')
                        .select('*, proposals(status), target_programmer:target_programmer_id(name, avatar_url)')
                        .eq('cliente_id', targetId)
                        .order('created_at', { ascending: false })

                    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
                        setTimeout(() => resolve({ data: null, error: new Error('Pedidos query timeout') }), 7500)
                    )

                    const { data: jobsData, error: fetchErr } = await Promise.race([queryPromise, timeoutPromise])
                    if (!isMounted) return

                    if (!fetchErr && Array.isArray(jobsData)) {
                        jobsResult = jobsData
                        lastError = null
                        break
                    }

                    lastError = fetchErr || new Error('Falha ao buscar pedidos sob medida')
                    if (attempt === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 350))
                    }
                }

                if (!isMounted) return

                if (Array.isArray(jobsResult)) {
                    const enriched = jobsResult.map((job: any) => {
                        const enrichedJob = { ...job }
                        if (enrichedJob.status === 'aberto') {
                            const proposals = enrichedJob.proposals || []
                            if (proposals.length === 0) {
                                enrichedJob.my_proposal_status = 'aguardando_propostas'
                            } else {
                                const hasCounter = proposals.some((p: any) => p.status === 'contraproposta')
                                enrichedJob.my_proposal_status = hasCounter ? 'acao_necessaria' : 'com_propostas'
                            }
                        }
                        return enrichedJob
                    })
                    jobsRef.current = enriched
                    setJobs(enriched)
                    setJobsError(null)
                    setScopedCached('pedidos_jobs', targetId, enriched, 120000)
                    setCached(`pedidos_jobs_${targetId}`, enriched, 120000)
                    setCached('pedidos_jobs', enriched, 120000)
                } else {
                    if (lastError) console.warn('Erro ao buscar pedidos sob medida:', lastError)
                    if (jobsRef.current.length === 0) {
                        setJobsError('Não foi possível carregar seus pedidos sob medida. Tente novamente.')
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar pedidos sob medida:', err)
                if (isMounted && jobsRef.current.length === 0) {
                    setJobsError('Não foi possível carregar seus pedidos sob medida. Tente novamente.')
                }
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        // 2. Fetch marketplace orders
        async function fetchMarketplaceOrders() {
            try {
                let ordersResult: MarketplaceOrderItem[] | null = null
                let lastError: any = null

                for (let attempt = 0; attempt < 2; attempt++) {
                    if (!isMounted) return
                    const queryPromise = supabase
                        .from('marketplace_orders')
                        .select(`
                            id,
                            product_id,
                            buyer_id,
                            seller_id,
                            amount,
                            platform_fee,
                            seller_net,
                            status,
                            payment_method,
                            created_at,
                            product:product_id (
                                id,
                                title,
                                description,
                                price,
                                image_url,
                                file_url,
                                storage_path,
                                formats,
                                category,
                                is_bundle,
                                items_count,
                                is_active
                            ),
                            seller:seller_id (
                                id,
                                name,
                                avatar_url
                            )
                        `)
                        .eq('buyer_id', targetId)
                        .eq('status', 'paid')
                        .order('created_at', { ascending: false })

                    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
                        setTimeout(() => resolve({ data: null, error: new Error('Marketplace orders query timeout') }), 7500)
                    )

                    const { data: ordersData, error: fetchErr } = await Promise.race([queryPromise, timeoutPromise])
                    if (!isMounted) return

                    if (!fetchErr && Array.isArray(ordersData)) {
                        ordersResult = ordersData as MarketplaceOrderItem[]
                        lastError = null
                        break
                    }

                    lastError = fetchErr || new Error('Falha ao buscar compras do marketplace')
                    if (attempt === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 350))
                    }
                }

                if (!isMounted) return

                if (Array.isArray(ordersResult)) {
                    ordersRef.current = ordersResult
                    setMarketplaceOrders(ordersResult)
                    setOrdersError(null)
                    setScopedCached('pedidos_marketplace_orders', targetId, ordersResult, 120000)
                    setCached(`pedidos_marketplace_orders_${targetId}`, ordersResult, 120000)
                    setCached('pedidos_marketplace_orders', ordersResult, 120000)
                } else {
                    if (lastError) console.warn('Erro ao buscar compras do marketplace:', lastError)
                    if (ordersRef.current.length === 0) {
                        setOrdersError('Não foi possível carregar suas compras do marketplace. Tente novamente.')
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar compras do marketplace:', err)
                if (isMounted && ordersRef.current.length === 0) {
                    setOrdersError('Não foi possível carregar suas compras do marketplace. Tente novamente.')
                }
            } finally {
                if (isMounted) setOrdersLoading(false)
            }
        }

        Promise.all([fetchJobs(), fetchMarketplaceOrders()]).finally(() => {
            clearTimeout(authSafetyTimer)
        })

        return () => {
            isMounted = false
            clearTimeout(authSafetyTimer)
        }
    }, [profileId, authLoading, profileLoading, authUserId, retryTick])

    return (
        <div className="min-h-[70vh]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                        {activeTab === 'jobs' ? 'Matrizes que Encomendei' : 'Minhas Compras do Marketplace'}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                        {activeTab === 'jobs' 
                            ? 'Acompanhe o andamento das suas encomendas sob medida e aprove suas matrizes com garantia'
                            : 'Acesse e baixe todas as matrizes profissionais adquiridas na loja oficial'}
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    {activeTab === 'jobs' ? (
                        <Link
                            href="/jobs/new"
                            className="min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] rounded-lg transition-colors font-semibold text-sm whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            Novo Pedido
                        </Link>
                    ) : (
                        <Link
                            href="/marketplace"
                            className="min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] rounded-lg transition-colors font-semibold text-sm whitespace-nowrap"
                        >
                            <Store className="w-4 h-4" />
                            Explorar Loja
                        </Link>
                    )}
                </div>
            </div>

            {/* Main Tabs Switcher */}
            <div className="flex bg-[var(--bg-surface)] p-1.5 rounded-xl border border-[var(--border-hairline)] mb-8 gap-2 w-full sm:w-auto overflow-x-auto">
                <button
                    type="button"
                    onClick={() => handleTabChange('jobs')}
                    className={`min-h-[44px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
                        activeTab === 'jobs'
                            ? 'bg-[#2563EB] text-white font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold'
                    }`}
                >
                    <span>Encomendas Sob Medida</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                        activeTab === 'jobs' ? 'bg-white/20 text-white font-bold' : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] font-semibold'
                    }`}>
                        {jobs.length}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('marketplace')}
                    className={`min-h-[44px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
                        activeTab === 'marketplace'
                            ? 'bg-[#2563EB] text-white font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold'
                    }`}
                >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Minhas Compras</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                        activeTab === 'marketplace' ? 'bg-white/20 text-white font-bold' : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] font-semibold'
                    }`}>
                        {marketplaceOrders.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: Encomendas Sob Medida */}
            {activeTab === 'jobs' && (
                <div>
                    {/* Filter bar for jobs */}
                    <div className="flex items-center gap-2 mb-6">
                        <div className="flex flex-wrap p-1 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] gap-1">
                            <button
                                type="button"
                                onClick={() => setFilter('all')}
                                className={`min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${filter === 'all'
                                    ? 'bg-[#2563EB] text-white'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                Todos
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter('aberto')}
                                className={`min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${filter === 'aberto'
                                    ? 'bg-[#2563EB] text-white'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                Aguardando
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter('em_progresso')}
                                className={`min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${filter === 'em_progresso'
                                    ? 'bg-[#2563EB] text-white'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                Em Produção
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="grid grid-cols-1 gap-6">
                            <PedidoCardSkeleton />
                            <PedidoCardSkeleton />
                        </div>
                    ) : jobsError && jobs.length === 0 ? (
                        <div className="bg-[var(--bg-surface)] border border-[#DC2626]/25 dark:border-[#EF4444]/25 rounded-2xl p-10 text-center">
                            <AlertCircle className="w-10 h-10 text-[#DC2626] dark:text-[#F87171] mx-auto mb-3 opacity-90" />
                            <p className="text-[var(--text-primary)] font-bold text-base">{jobsError}</p>
                            <button
                                type="button"
                                onClick={() => setRetryTick((t) => t + 1)}
                                className="mt-4 min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] font-semibold text-sm rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Tentar novamente
                            </button>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-12 text-center">
                            <div className="bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#2563EB]/25 dark:border-[#3B82F6]/30">
                                <Inbox className="w-10 h-10 text-[#1D4ED8] dark:text-[#60A5FA]" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                                Nenhum pedido ainda
                            </h3>
                            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto text-sm">
                                Você ainda não criou nenhum pedido de matriz. Comece agora e receba orçamentos de programadores profissionais!
                            </p>
                            <Link
                                href="/jobs/new"
                                className="min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] rounded-lg transition-colors font-semibold text-sm"
                            >
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                                Criar Primeiro Pedido
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {jobs.filter(j => filter === 'all' ? true : j.status === filter).length === 0 ? (
                                <div className="text-center py-20 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-hairline)]">
                                    <p className="text-[var(--text-secondary)] text-sm">Nenhum pedido encontrado nesta categoria.</p>
                                </div>
                            ) : (
                                jobs.filter(j => filter === 'all' ? true : j.status === filter).map((job) => (
                                    <div key={job.id} className="space-y-0">
                                        {/* Direct Request Banner */}
                                        {job.target_programmer_id && (
                                            <div className="flex items-center gap-2 bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 border border-[#2563EB]/25 dark:border-[#3B82F6]/30 border-b-0 rounded-t-2xl px-4 py-2">
                                                <span className="text-[#1D4ED8] dark:text-[#60A5FA] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                    <Target className="w-3.5 h-3.5" />
                                                    Solicitação Direta
                                                </span>
                                                <span className="text-[var(--text-secondary)] text-xs">→</span>
                                                <span className="text-[var(--text-primary)] text-sm font-semibold">
                                                    {job.target_programmer?.name ?? `Programador (ID: ${String(job.target_programmer_id).slice(0, 8)}...)`}
                                                </span>
                                            </div>
                                        )}
                                        <div className={job.target_programmer_id ? 'rounded-t-none overflow-hidden' : ''}>
                                            <JobCard
                                                job={job}
                                                hasNegotiation={job.proposals?.some((p: { status: string }) => p.status === 'contraproposta')}
                                                viewerRole="client"
                                                onDelete={(id, title) => setJobToDelete({ id, title })}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: Minhas Compras do Marketplace */}
            {activeTab === 'marketplace' && (
                <div>
                    {ordersLoading ? (
                        <div className="grid grid-cols-1 gap-4">
                            <MarketplacePurchaseSkeleton />
                            <MarketplacePurchaseSkeleton />
                            <MarketplacePurchaseSkeleton />
                        </div>
                    ) : ordersError && marketplaceOrders.length === 0 ? (
                        <div className="bg-[var(--bg-surface)] border border-[#DC2626]/25 dark:border-[#EF4444]/25 rounded-2xl p-10 text-center">
                            <AlertCircle className="w-10 h-10 text-[#DC2626] dark:text-[#F87171] mx-auto mb-3 opacity-90" />
                            <p className="text-[var(--text-primary)] font-bold text-base">{ordersError}</p>
                            <button
                                type="button"
                                onClick={() => setRetryTick((t) => t + 1)}
                                className="mt-4 min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] font-semibold text-sm rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Tentar novamente
                            </button>
                        </div>
                    ) : marketplaceOrders.length === 0 ? (
                        /* Empty State matching T2-F04-03 requirements */
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-12 text-center">
                            <div className="bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#2563EB]/25 dark:border-[#3B82F6]/30 text-[#1D4ED8] dark:text-[#60A5FA]">
                                <ShoppingBag className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                                Nenhuma matriz comprada ainda
                            </h3>
                            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto text-sm leading-relaxed">
                                Você ainda não comprou nenhuma matriz pronta na nossa loja. Explore centenas de matrizes profissionais prontas para bordar!
                            </p>
                            <Link
                                href="/marketplace"
                                className="min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] rounded-lg transition-colors font-semibold text-sm"
                            >
                                <Store className="w-4 h-4" />
                                Explorar Loja de Matrizes
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {marketplaceOrders.map((order) => {
                                const product = order.product
                                const title = product?.title || 'Matriz BordadoHUB'
                                const formats = product?.formats && product.formats.length > 0 
                                    ? product.formats 
                                    : ['PES', 'DST', 'JEF']
                                const isDownloading = downloadingProductId === order.product_id

                                return (
                                    <div 
                                        key={order.id}
                                        className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[#2563EB]/40 dark:hover:border-[#3B82F6]/40 rounded-2xl p-5 md:p-6 transition-colors duration-200 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between group shadow-sm"
                                    >
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                                            {/* Thumbnail */}
                                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] shrink-0 relative aspect-square">
                                                {product?.image_url ? (
                                                    <img 
                                                        src={product.image_url} 
                                                        alt={title}
                                                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[var(--cobalt)] bg-[var(--bg-surface-elevated)]">
                                                        <FileCode className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Product & Order Details */}
                                            <div className="space-y-2 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 text-[#1D4ED8] dark:text-[#60A5FA] border border-[#2563EB]/25 dark:border-[#3B82F6]/30">
                                                        <Store className="w-3 h-3" />
                                                        Loja Oficial
                                                    </span>

                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0D9488]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6] border border-[#0D9488]/25 dark:border-[#14B8A6]/30">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Acesso Vitalício
                                                    </span>

                                                    {product?.is_bundle && (
                                                        <span className="bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                            Pacote ({product.items_count || 2} itens)
                                                        </span>
                                                    )}
                                                </div>

                                                <Link 
                                                    href={`/marketplace/${order.product_id}`}
                                                    className="block text-base md:text-lg font-bold text-[var(--text-primary)] group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors line-clamp-1"
                                                >
                                                    {title}
                                                </Link>

                                                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                                                    {order.seller?.name && (
                                                        <span>Vendido por <strong className="text-[var(--text-primary)]">{order.seller.name}</strong></span>
                                                    )}
                                                    <span>•</span>
                                                    <span>Adquirido em {new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                                                </div>

                                                {/* Formats Badges */}
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    {formats.map((fmt) => (
                                                        <span 
                                                            key={fmt} 
                                                            className="bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono text-[10px] font-bold px-2 py-0.5 rounded"
                                                        >
                                                            .{fmt.toUpperCase().replace('.', '')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Column */}
                                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--border-hairline)]">
                                            <div className="text-left md:text-right">
                                                <span className="text-[11px] text-[var(--text-secondary)] block font-medium">Valor pago</span>
                                                <span className="text-[#0F766E] dark:text-[#14B8A6] font-extrabold text-base md:text-lg">
                                                    {formatPrice(order.amount)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isDownloading}
                                                    onClick={() => handleDownloadMatrix(order.product_id, title)}
                                                    className="min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs md:text-sm rounded-lg transition-colors active:scale-[0.99] disabled:opacity-50 whitespace-nowrap"
                                                >
                                                    {isDownloading ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                            <span>Baixando...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="w-4 h-4 stroke-[2.5]" />
                                                            <span>Baixar Matriz</span>
                                                        </>
                                                    )}
                                                </button>

                                                <Link
                                                    href={`/marketplace/${order.product_id}`}
                                                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center bg-[var(--bg-surface-elevated)] hover:border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)] rounded-lg transition-colors"
                                                    title="Ver matriz no marketplace"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Confirmação para Excluir Pedido Sob Medida */}
            {jobToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/25 flex items-center justify-center shrink-0">
                                <Trash2 className="w-6 h-6 text-[#DC2626] dark:text-[#EF4444]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Excluir Pedido</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Esta ação não poderá ser desfeita</p>
                            </div>
                        </div>

                        <div className="bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl p-4 mb-5">
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                Tem certeza que deseja apagar o pedido <strong className="text-[var(--text-primary)]">&quot;{jobToDelete.title}&quot;</strong>?
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-2 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF4444] shrink-0" />
                                Ele será removido permanentemente do banco de dados e do seu painel.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setJobToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-semibold py-3 rounded-lg hover:border-[var(--border-glass)] transition-colors text-sm disabled:opacity-50"
                            >
                                Voltar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="flex-1 min-h-[48px] bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Excluindo...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Sim, Excluir
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
