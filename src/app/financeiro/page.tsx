'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { getCached, setCached, getScopedCached, setScopedCached } from '@/lib/clientCache'
import Link from 'next/link'
import { 
    Wallet, 
    TrendingUp, 
    Clock, 
    BarChart3, 
    CheckCircle2, 
    ArrowUpRight, 
    ShieldCheck, 
    Calendar, 
    QrCode, 
    CreditCard, 
    FileText, 
    Search, 
    Edit2, 
    Save, 
    X, 
    Check, 
    AlertCircle,
    Package,
    ArrowDownRight,
    ShoppingBag,
    Layers,
    RefreshCw
} from 'lucide-react'
import { formatDate } from '@/lib/helpers'
import { toast } from 'sonner'

interface FinancialRecord {
    id: string
    type: 'job' | 'marketplace'
    job_id?: string | null
    product_id?: string | null
    title: string
    client_name: string
    client_email?: string | null
    client_avatar: string | null
    created_at: string
    gross_amount: number
    net_amount: number
    payment_method: string
    status: 'liberado' | 'custodia' | 'pendente'
    items_count: number
}

interface ActionLinkInfo {
    href: string
    label: string
    tooltip: string
}

function getFinancialActionLink(record: FinancialRecord): ActionLinkInfo {
    if (record.type === 'marketplace') {
        if (record.product_id) {
            return {
                href: `/marketplace/${record.product_id}`,
                label: 'Ver Matriz',
                tooltip: 'Visualizar matriz na Loja'
            }
        }
        return {
            href: '/marketplace',
            label: 'Ver Loja',
            tooltip: 'Ir para a vitrine do Marketplace'
        }
    }

    if (record.job_id) {
        return {
            href: `/jobs/${record.job_id}`,
            label: 'Ver Pedido',
            tooltip: 'Ver detalhes do pedido sob medida'
        }
    }

    return {
        href: '/jobs',
        label: 'Ver Pedidos',
        tooltip: 'Ir para lista de pedidos'
    }
}

export default function FinancialDashboard() {
    const { user: authUser, profile: authProfile, profileId, loading: authLoading, profileLoading } = useAuth()
    const authUserId = authUser?.id || null
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [retryTick, setRetryTick] = useState(0)
    const [profile, setProfile] = useState<{ id: string; name: string; pix_key?: string; pix_key_type?: string } | null>(null)
    const [records, setRecords] = useState<FinancialRecord[]>([])
    const recordsRef = useRef<FinancialRecord[]>([])

    // Filtros
    const [statusFilter, setStatusFilter] = useState<'todos' | 'liberado' | 'custodia'>('todos')
    const [searchTerm, setSearchTerm] = useState('')

    // Edição de Chave PIX
    const [isEditingPix, setIsEditingPix] = useState(false)
    const [pixKey, setPixKey] = useState('')
    const [pixKeyType, setPixKeyType] = useState('cpf')
    const [savingPix, setSavingPix] = useState(false)

    // Sync profile summary from AuthContext as soon as hydrated
    useEffect(() => {
        if (authProfile?.id) {
            setProfile((prev) =>
                prev && prev.id === authProfile.id
                    ? { ...prev, name: authProfile.name || prev.name }
                    : {
                        id: authProfile.id,
                        name: authProfile.name || '',
                        pix_key: authProfile.pix_key ?? undefined,
                        pix_key_type: authProfile.pix_key_type ?? undefined,
                    }
            )
            if (authProfile.pix_key) {
                setPixKey((prev) => prev || authProfile.pix_key || '')
            }
            if (authProfile.pix_key_type) {
                setPixKeyType(authProfile.pix_key_type)
            }
        }
    }, [authProfile])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const handleReload = () => setRetryTick((t) => t + 1)
        window.addEventListener('bordadohub_reload_job', handleReload)
        return () => {
            window.removeEventListener('bordadohub_reload_job', handleReload)
        }
    }, [])

    useEffect(() => {
        let isMounted = true

        // Guaranteed safety timer: never spin forever
        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 8500)

        const targetId = profileId || getCached<string>('current_user_profile_id')
        const isIdentityPending = !targetId && (authLoading || profileLoading || Boolean(authUserId))

        if (isIdentityPending) {
            setLoading(true)
            return () => {
                isMounted = false
                clearTimeout(safetyTimer)
            }
        }

        if (!targetId) {
            if (authUserId) {
                setFetchError('Não foi possível confirmar seu perfil no momento. Tente novamente.')
            }
            setLoading(false)
            return () => {
                isMounted = false
                clearTimeout(safetyTimer)
            }
        }

        // Fast user-scoped client-side cache mount (0ms latency without breaking SSR hydration)
        const cached =
            getScopedCached<FinancialRecord[]>('financeiro_records', targetId, { requireNonEmpty: true }) ||
            getCached<FinancialRecord[]>(`financeiro_records_${targetId}`)
        if (cached && cached.length > 0) {
            recordsRef.current = cached
            setRecords(cached)
            setFetchError(null)
            setLoading(false)
        } else if (recordsRef.current.length === 0) {
            setLoading(true)
        }

        async function fetchFinancialData() {
            try {
                let fetchedTuple: [any, any, any, any] | null = null
                let lastError: any = null

                for (let attempt = 0; attempt < 2; attempt++) {
                    if (!isMounted) return

                    // Run all 4 queries in PARALLEL with 7.5s timeout safety net
                    const fetchPromise = Promise.all([
                        supabase
                            .from('users')
                            .select('id, name, pix_key, pix_key_type')
                            .eq('id', targetId)
                            .maybeSingle(),
                        supabase
                            .from('proposals')
                            .select(`
                                id,
                                amount,
                                status,
                                created_at,
                                jobs (
                                    id,
                                    title,
                                    status,
                                    dimensions,
                                    items_count,
                                    created_at,
                                    cliente:cliente_id (
                                        id,
                                        name,
                                        email,
                                        avatar_url
                                    )
                                )
                            `)
                            .eq('criador_id', targetId)
                            .eq('status', 'aceita')
                            .order('created_at', { ascending: false }),
                        supabase
                            .from('transactions')
                            .select('*, cliente:cliente_id(name, email, avatar_url)')
                            .eq('criador_id', targetId)
                            .order('created_at', { ascending: false }),
                        supabase
                            .from('marketplace_orders')
                            .select(`
                                id,
                                amount,
                                platform_fee,
                                seller_net,
                                status,
                                payment_method,
                                created_at,
                                asaas_payment_id,
                                product:product_id (
                                    id,
                                    title,
                                    items_count,
                                    image_url
                                ),
                                buyer:buyer_id (
                                    id,
                                    name,
                                    email,
                                    avatar_url
                                )
                            `)
                            .eq('seller_id', targetId)
                            .eq('status', 'paid')
                            .order('created_at', { ascending: false })
                    ])

                    const timeoutPromise = new Promise<any>((resolve) =>
                        setTimeout(
                            () =>
                                resolve([
                                    { data: null, error: new Error('User profile timeout') },
                                    { data: null, error: new Error('Proposals timeout') },
                                    { data: null, error: new Error('Transactions timeout') },
                                    { data: null, error: new Error('Marketplace orders timeout') },
                                ]),
                            7500
                        )
                    )

                    const results = await Promise.race([fetchPromise, timeoutPromise])
                    if (!isMounted) return

                    const [profileRes, proposalsRes, txRes, ordersRes] = results
                    const hasAnyError = Boolean(
                        profileRes?.error || proposalsRes?.error || txRes?.error || ordersRes?.error
                    )
                    const isAllNull =
                        !profileRes?.data && !proposalsRes?.data && !txRes?.data && !ordersRes?.data

                    if (!hasAnyError && !isAllNull) {
                        fetchedTuple = [profileRes?.data, proposalsRes?.data, txRes?.data, ordersRes?.data]
                        lastError = null
                        break
                    }

                    lastError =
                        profileRes?.error ||
                        proposalsRes?.error ||
                        txRes?.error ||
                        ordersRes?.error ||
                        new Error('Falha ao carregar dados financeiros')

                    if (attempt === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 350))
                    }
                }

                if (!isMounted) return

                if (!fetchedTuple) {
                    if (lastError) console.warn('Erro ao carregar dados financeiros:', lastError)
                    if (recordsRef.current.length === 0) {
                        setFetchError('Não foi possível carregar seus dados financeiros. Tente novamente.')
                    }
                    return
                }

                const [userProfile, myProposals, myTransactions, marketplaceOrders] = fetchedTuple

                if (userProfile && isMounted) {
                    setProfile(userProfile)
                    setPixKey(userProfile.pix_key || '')
                    setPixKeyType(userProfile.pix_key_type || 'cpf')
                }

                const txMap = new Map<string, any>()
                if (myTransactions) {
                    (myTransactions as any[]).forEach((tx: any) => {
                        if (tx.job_id) txMap.set(tx.job_id, tx)
                    })
                }

                const consolidated: FinancialRecord[] = []
                const marketplaceTxAsaasIds = new Set<string>()

                // 1. Processa vendas do Marketplace (marketplace_orders com status = 'paid')
                if (marketplaceOrders) {
                    for (const order of (marketplaceOrders as any[])) {
                        if (order.asaas_payment_id) {
                            marketplaceTxAsaasIds.add(order.asaas_payment_id.trim().toLowerCase())
                        }

                        const productObj = Array.isArray(order.product) ? order.product[0] : order.product
                        const buyerObj = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer

                        const gross = Number(order.amount || 0)
                        const net = order.seller_net != null
                            ? Number(order.seller_net)
                            : Number(Math.max(0, gross - Number((gross * 0.15 + (gross > 0 ? 1.00 : 0)).toFixed(2))).toFixed(2))

                        consolidated.push({
                            id: order.id,
                            type: 'marketplace',
                            job_id: null,
                            product_id: productObj?.id || order.product_id || null,
                            title: productObj?.title || 'Matriz do Marketplace',
                            client_name: buyerObj?.name || (buyerObj?.email ? buyerObj.email.split('@')[0] : 'Comprador'),
                            client_email: buyerObj?.email || null,
                            client_avatar: buyerObj?.avatar_url || null,
                            created_at: order.created_at,
                            gross_amount: gross,
                            net_amount: net,
                            payment_method: order.payment_method || 'asaas_pix',
                            status: 'liberado',
                            items_count: productObj?.items_count || 1,
                        })
                    }
                }

                // 2. Processa propostas aceitas de pedidos sob medida (jobs)
                if (myProposals) {
                    for (const prop of (myProposals as any[])) {
                        const job = Array.isArray(prop.jobs) ? prop.jobs[0] : prop.jobs
                        if (!job) continue

                        const tx = txMap.get(job.id)
                        if (tx?.asaas_payment_id) {
                            marketplaceTxAsaasIds.add(tx.asaas_payment_id.trim().toLowerCase())
                        }

                        const gross = tx?.amount ? Number(tx.amount) : Number(prop.amount)
                        const net = tx?.valor_liquido ? Number(tx.valor_liquido) : Math.round(gross * 0.90 * 100) / 100
                        const method = tx?.metodo || 'asaas_pix'

                        let financialStatus: 'liberado' | 'custodia' | 'pendente' = 'custodia'
                        if (job.status === 'finalizado' || tx?.status === 'liberado') {
                            financialStatus = 'liberado'
                        } else if (job.status === 'aberto' && tx?.status === 'pendente') {
                            financialStatus = 'pendente'
                        }

                        const clientObj: any = Array.isArray(job.cliente) ? job.cliente[0] : job.cliente

                        if (job.status !== 'aberto' || tx?.status === 'pago') {
                            consolidated.push({
                                id: tx?.id || prop.id,
                                type: 'job',
                                job_id: job.id,
                                product_id: null,
                                title: job.title || 'Pedido Sob Medida',
                                client_name: clientObj?.name || 'Cliente',
                                client_email: clientObj?.email || null,
                                client_avatar: clientObj?.avatar_url || null,
                                created_at: tx?.created_at || job.created_at || prop.created_at,
                                gross_amount: gross,
                                net_amount: net,
                                payment_method: method,
                                status: financialStatus,
                                items_count: job.items_count || 1,
                            })
                        }
                    }
                }

                // 3. Fallback de transações avulsas sem job_id (evitando duplicação via Set)
                if (myTransactions) {
                    for (const tx of (myTransactions as any[])) {
                        if (!tx.job_id && (tx.status === 'liberado' || tx.status === 'pago')) {
                            if (tx.asaas_payment_id) {
                                if (marketplaceTxAsaasIds.has(tx.asaas_payment_id.trim().toLowerCase())) {
                                    continue
                                }
                                marketplaceTxAsaasIds.add(tx.asaas_payment_id.trim().toLowerCase())
                            }
                            const clientObj = Array.isArray(tx.cliente) ? tx.cliente[0] : tx.cliente
                            const gross = Number(tx.amount || 0)
                            const net = tx.valor_liquido != null
                                ? Number(tx.valor_liquido)
                                : Number(Math.max(0, gross - Number((gross * 0.15 + (gross > 0 ? 1.00 : 0)).toFixed(2))).toFixed(2))

                            consolidated.push({
                                id: tx.id,
                                type: 'marketplace',
                                job_id: null,
                                product_id: null,
                                title: 'Venda de Matriz (Transação Avulsa)',
                                client_name: clientObj?.name || (clientObj?.email ? clientObj.email.split('@')[0] : 'Comprador'),
                                client_email: clientObj?.email || null,
                                client_avatar: clientObj?.avatar_url || null,
                                created_at: tx.created_at,
                                gross_amount: gross,
                                net_amount: net,
                                payment_method: tx.metodo || 'asaas_pix',
                                status: 'liberado',
                                items_count: 1,
                            })
                        }
                    }
                }

                // 4. Ordena por data decrescente com proteção contra datas nulas
                consolidated.sort((a, b) => {
                    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
                    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
                    return timeB - timeA
                })

                if (isMounted) {
                    recordsRef.current = consolidated
                    setRecords(consolidated)
                    setFetchError(null)
                    setScopedCached('financeiro_records', targetId, consolidated, 120000)
                    setCached(`financeiro_records_${targetId}`, consolidated, 120000)
                    setCached('financeiro_records', consolidated, 120000)
                }
            } catch (err) {
                console.error('Erro ao carregar dados financeiros:', err)
                if (isMounted && recordsRef.current.length === 0) {
                    setFetchError('Não foi possível carregar seus dados financeiros. Tente novamente.')
                }
            } finally {
                clearTimeout(safetyTimer)
                if (isMounted) setLoading(false)
            }
        }

        fetchFinancialData()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [profileId, authLoading, profileLoading, authUserId, retryTick])

    // Salvar Chave PIX
    const handleSavePix = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile) return
        if (!pixKey.trim()) {
            toast.error('Informe sua chave PIX.')
            return
        }

        setSavingPix(true)
        try {
            const { error } = await supabase
                .from('users')
                .update({ pix_key: pixKey.trim(), pix_key_type: pixKeyType })
                .eq('id', profile.id)

            if (error) {
                if (error.message?.includes('pix_key')) {
                    toast.error('A coluna pix_key ainda não existe no banco. Execute o SQL de migração no Supabase.')
                    return
                }
                throw error
            }

            setProfile(prev => prev ? { ...prev, pix_key: pixKey.trim(), pix_key_type: pixKeyType } : null)
            setIsEditingPix(false)
            toast.success('Chave PIX atualizada com sucesso!')
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar chave PIX')
        } finally {
            setSavingPix(false)
        }
    }

    // Métricas Calculadas
    const metrics = useMemo(() => {
        const releasedRecords = records.filter(r => r.status === 'liberado')
        const escrowRecords = records.filter(r => r.status === 'custodia')

        const totalEarned = releasedRecords.reduce((acc, r) => acc + r.net_amount, 0)
        const totalInEscrow = escrowRecords.reduce((acc, r) => acc + r.net_amount, 0)
        
        const totalCompletedMatrices = releasedRecords.reduce((acc, r) => acc + r.items_count, 0)
        const avgTicket = totalCompletedMatrices > 0 ? (totalEarned / totalCompletedMatrices) : 0

        return {
            totalEarned,
            totalInEscrow,
            totalCompletedMatrices,
            avgTicket,
            totalOrders: releasedRecords.length,
            inProductionOrders: escrowRecords.length
        }
    }, [records])

    // Registros Filtrados
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesStatus = statusFilter === 'todos' || r.status === statusFilter
            const searchLower = searchTerm.toLowerCase()
            const matchesSearch = searchTerm.trim() === '' || 
                (r.title ? r.title.toLowerCase().includes(searchLower) : false) || 
                (r.client_name ? r.client_name.toLowerCase().includes(searchLower) : false) ||
                (r.client_email ? r.client_email.toLowerCase().includes(searchLower) : false)
            return matchesStatus && matchesSearch
        })
    }, [records, statusFilter, searchTerm])



    return (
        <div className="space-y-8 pb-24 sm:pb-12">
            {/* Header Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-[#FFAE00]" />
                        Painel Financeiro
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Acompanhe seu faturamento acumulado, valores em custódia e histórico de produções
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Custódia Segura BordadoHUB
                    </span>
                </div>
            </div>

            {/* Grid dos Cards de Indicadores (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Faturado */}
                <div className="bg-[#12151C] border border-white/[0.07] hover:border-emerald-500/30 rounded-2xl p-5 shadow-lg transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Total Faturado
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        R$ {metrics.totalEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {metrics.totalOrders} {metrics.totalOrders === 1 ? 'pedido finalizado' : 'pedidos finalizados'}
                    </p>
                </div>

                {/* 2. Saldo em Garantia (Custódia) */}
                <div className="bg-[#12151C] border border-white/[0.07] hover:border-[#F5A623]/30 rounded-2xl p-5 shadow-lg transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Saldo em Custódia
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center text-[#F5A623]">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        R$ {metrics.totalInEscrow.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#F5A623]" />
                        {metrics.inProductionOrders} {metrics.inProductionOrders === 1 ? 'pedido em produção' : 'pedidos em produção'}
                    </p>
                </div>

                {/* 3. Ticket Médio por Matriz */}
                <div className="bg-[#12151C] border border-white/[0.07] hover:border-cyan-500/30 rounded-2xl p-5 shadow-lg transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Ticket Médio
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <BarChart3 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        R$ {metrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">
                        Ganho médio líquido por matriz entregue
                    </p>
                </div>

                {/* 4. Matrizes Entregues */}
                <div className="bg-[#12151C] border border-white/[0.07] hover:border-indigo-500/30 rounded-2xl p-5 shadow-lg transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Matrizes Entregues
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Package className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {metrics.totalCompletedMatrices}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-indigo-400" />
                        100% aprovadas pelos compradores
                    </p>
                </div>
            </div>

            {/* Card de Configuração de Chave PIX para Repasses */}
            <div className="bg-[#1A1D23] border border-white/10 rounded-xl p-5 sm:p-6 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-[#FFAE00]/10 border border-[#FFAE00]/20 flex items-center justify-center text-[#FFAE00] shrink-0 mt-0.5 sm:mt-0">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-bold text-white">Chave PIX para Recebimento de Repasses</h3>
                                {profile?.pix_key && !isEditingPix && (
                                    <span className="bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-green-500/30">
                                        Ativa
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Os valores de matrizes aprovadas são transferidos para esta chave via PIX
                            </p>
                        </div>
                    </div>

                    {!isEditingPix ? (
                        <div className="flex items-center gap-3">
                            <div className="bg-[#0F1115] border border-white/5 rounded-lg px-3.5 py-2 text-xs font-mono text-gray-200">
                                {profile?.pix_key ? (
                                    <span>
                                        <span className="text-gray-500 uppercase font-sans mr-2 text-[10px] font-bold">
                                            {profile.pix_key_type || 'PIX'}:
                                        </span>
                                        {profile.pix_key}
                                    </span>
                                ) : (
                                    <span className="text-amber-400 flex items-center gap-1.5 font-sans font-medium">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Nenhuma chave cadastrada
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsEditingPix(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0F1115] hover:bg-white/5 text-gray-300 hover:text-white rounded-lg border border-white/10 text-xs font-semibold transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5 text-[#FFAE00]" />
                                {profile?.pix_key ? 'Alterar' : 'Cadastrar Chave'}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSavePix} className="flex flex-wrap items-center gap-2">
                            <select
                                value={pixKeyType}
                                onChange={e => setPixKeyType(e.target.value)}
                                className="bg-[#0F1115] border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#FFAE00]"
                            >
                                <option value="cpf">CPF</option>
                                <option value="cnpj">CNPJ</option>
                                <option value="email">E-mail</option>
                                <option value="telefone">Telefone</option>
                                <option value="aleatoria">Chave Aleatória</option>
                            </select>

                            <input
                                type="text"
                                required
                                value={pixKey}
                                onChange={e => setPixKey(e.target.value)}
                                placeholder="Digite sua chave PIX..."
                                className="bg-[#0F1115] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] w-48 sm:w-60"
                            />

                            <button
                                type="submit"
                                disabled={savingPix}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FFAE00] hover:bg-yellow-400 text-black rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {savingPix ? 'Salvando...' : 'Salvar'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsEditingPix(false)}
                                className="p-2 bg-[#0F1115] hover:bg-white/5 text-gray-400 rounded-lg border border-white/10 transition-colors"
                                title="Cancelar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Seção da Tabela de Histórico Financeiro */}
            <div className="bg-[#1A1D23] border border-white/10 rounded-xl overflow-hidden shadow-lg">
                {/* Barra de Ferramentas / Filtros */}
                <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Tabs de Filtro */}
                    <div className="flex items-center gap-1.5 bg-[#0F1115] p-1 rounded-lg border border-white/5 shrink-0">
                        <button
                            onClick={() => setStatusFilter('todos')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                statusFilter === 'todos'
                                    ? 'bg-[#1A1D23] text-white shadow'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Todas ({records.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('liberado')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                statusFilter === 'liberado'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow'
                                    : 'text-gray-400 hover:text-green-400'
                            }`}
                        >
                            Liberadas ({records.filter(r => r.status === 'liberado').length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('custodia')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                statusFilter === 'custodia'
                                    ? 'bg-[#FFAE00]/20 text-[#FFAE00] border border-[#FFAE00]/30 shadow'
                                    : 'text-gray-400 hover:text-[#FFAE00]'
                            }`}
                        >
                            Em Custódia ({records.filter(r => r.status === 'custodia').length})
                        </button>
                    </div>

                    {/* Busca por Nome do Pedido ou Cliente */}
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar por pedido ou cliente..."
                            className="w-full bg-[#0F1115] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FFAE00]"
                        />
                    </div>
                </div>

                {/* Tabela de Transações */}
                {loading && records.length === 0 ? (
                    <div className="p-8 space-y-3">
                        <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
                        <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
                        <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
                    </div>
                ) : fetchError && records.length === 0 ? (
                    <div className="py-14 text-center px-4">
                        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400 opacity-80" />
                        <p className="text-sm font-bold text-gray-200">{fetchError}</p>
                        <button
                            type="button"
                            onClick={() => setRetryTick((t) => t + 1)}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#FFAE00] hover:bg-yellow-400 text-black text-xs font-bold rounded-lg transition-colors shadow"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Tentar novamente
                        </button>
                    </div>
                ) : filteredRecords.length > 0 ? (
                    <div>
                        {/* Desktop Table (hidden md:block) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-[#0F1115]/50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                        <th className="py-3 px-4">Data</th>
                                        <th className="py-3 px-4">Pedido / Matriz</th>
                                        <th className="py-3 px-4">Comprador</th>
                                        <th className="py-3 px-4">Método</th>
                                        <th className="py-3 px-4">Status do Repasse</th>
                                        <th className="py-3 px-4 text-right">Valor Líquido</th>
                                        <th className="py-3 px-4 text-center">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-xs">
                                    {filteredRecords.map(rec => {
                                        const action = getFinancialActionLink(rec)
                                        return (
                                            <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors group">
                                                {/* Data */}
                                                <td className="py-3.5 px-4 text-gray-400 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                                        <Calendar className="w-3 h-3 text-gray-500" />
                                                        {formatDate(rec.created_at)}
                                                    </div>
                                                </td>

                                                {/* Pedido / Matriz */}
                                                <td className="py-3.5 px-4 max-w-[260px]">
                                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                        {rec.type === 'marketplace' ? (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/25">
                                                                <ShoppingBag className="w-2.5 h-2.5" />
                                                                Loja
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                                                                <Layers className="w-2.5 h-2.5" />
                                                                Sob Medida
                                                            </span>
                                                        )}
                                                        {rec.items_count > 1 && (
                                                            <span className="text-[10px] text-gray-400 font-medium bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                                Kit com {rec.items_count} matrizes
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-semibold text-white truncate text-xs sm:text-sm hover:text-gray-200 transition-colors" title={rec.title}>
                                                        {rec.title}
                                                    </div>
                                                </td>

                                                {/* Comprador */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5">
                                                        {rec.client_avatar ? (
                                                            <img 
                                                                src={rec.client_avatar} 
                                                                alt={rec.client_name} 
                                                                className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" 
                                                            />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-[11px] text-gray-300 font-bold shrink-0">
                                                                {rec.client_name?.charAt(0)?.toUpperCase() || 'C'}
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-bold text-white text-xs truncate max-w-[150px]" title={rec.client_name}>
                                                                {rec.client_name}
                                                            </span>
                                                            {rec.client_email ? (
                                                                <span className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]" title={rec.client_email}>
                                                                    {rec.client_email}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-500 italic">
                                                                    Cliente BordadoHUB
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Método */}
                                                <td className="py-3.5 px-4 text-gray-400 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        {rec.payment_method?.includes('cartao') ? (
                                                            <>
                                                                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                                                                <span>Cartão</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <QrCode className="w-3.5 h-3.5 text-green-400" />
                                                                <span>PIX</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Status do Repasse */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    {rec.status === 'liberado' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Liberado via PIX
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/20">
                                                            <Clock className="w-3 h-3" />
                                                            Em Custódia
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Valor Líquido e Bruto */}
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                                                    <div className={`text-sm font-extrabold ${rec.status === 'liberado' ? 'text-emerald-400' : 'text-gray-200'}`}>
                                                        R$ {rec.net_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5 flex items-center justify-end gap-1.5 font-sans">
                                                        <span>Bruto: R$ {rec.gross_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                                            rec.type === 'marketplace' 
                                                                ? 'bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/20' 
                                                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                                        }`}>
                                                            {rec.type === 'marketplace' ? '85%' : '90%'} líq
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Ação */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <Link
                                                        href={action.href}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-300 hover:text-[#FFAE00] bg-white/[0.03] hover:bg-[#FFAE00]/10 border border-white/5 hover:border-[#FFAE00]/30 transition-all group/btn"
                                                        title={action.tooltip}
                                                    >
                                                        <span>{action.label}</span>
                                                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover/btn:text-[#FFAE00] transition-colors" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards (block md:hidden) */}
                        <div className="block md:hidden divide-y divide-white/5">
                            {filteredRecords.map(rec => {
                                const action = getFinancialActionLink(rec)
                                return (
                                    <div key={rec.id} className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors">
                                        {/* Linha Superior: Badges e Data */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {rec.type === 'marketplace' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/25">
                                                        <ShoppingBag className="w-3 h-3" />
                                                        Loja
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                                                        <Layers className="w-3 h-3" />
                                                        Sob Medida
                                                    </span>
                                                )}
                                                {rec.items_count > 1 && (
                                                    <span className="text-[10px] text-gray-400 font-medium bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                        Kit com {rec.items_count} matrizes
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 font-mono text-[11px] text-gray-400 shrink-0">
                                                <Calendar className="w-3 h-3 text-gray-500" />
                                                {formatDate(rec.created_at)}
                                            </div>
                                        </div>

                                        {/* Título do Pedido ou Matriz */}
                                        <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
                                            {rec.title}
                                        </h4>

                                        {/* Bloco Comprador & Status */}
                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {rec.client_avatar ? (
                                                    <img src={rec.client_avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-[10px] text-gray-300 font-bold shrink-0">
                                                        {rec.client_name?.charAt(0)?.toUpperCase() || 'C'}
                                                    </div>
                                                )}
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-white truncate max-w-[150px]">{rec.client_name}</span>
                                                    {rec.client_email && (
                                                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">{rec.client_email}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                {rec.status === 'liberado' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Liberado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/20">
                                                        <Clock className="w-3 h-3" />
                                                        Custódia
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Linha Inferior: Valores e Botão de Ação (Área de toque 44px) */}
                                        <div className="flex items-center justify-between gap-3 pt-2">
                                            <div>
                                                <div className={`text-base font-black font-mono ${rec.status === 'liberado' ? 'text-emerald-400' : 'text-gray-200'}`}>
                                                    R$ {rec.net_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-[10px] text-gray-400 flex items-center gap-1.5 font-sans">
                                                    <span>Bruto: R$ {rec.gross_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                                        rec.type === 'marketplace' ? 'text-[#FFAE00]' : 'text-cyan-400'
                                                    }`}>
                                                        ({rec.type === 'marketplace' ? '85%' : '90%'} líq)
                                                    </span>
                                                </div>
                                            </div>

                                            <Link
                                                href={action.href}
                                                className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-200 bg-white/5 hover:bg-[#FFAE00]/10 border border-white/10 hover:border-[#FFAE00]/30 transition-all shrink-0 min-h-[44px]"
                                                title={action.tooltip}
                                            >
                                                <span>{action.label}</span>
                                                <ArrowUpRight className="w-4 h-4 text-[#FFAE00]" />
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="py-16 text-center text-gray-500 px-4">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-gray-400" />
                        <p className="text-sm font-bold text-gray-300">Nenhum registro financeiro encontrado</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                            {searchTerm || statusFilter !== 'todos'
                                ? 'Nenhum resultado corresponde aos filtros selecionados.'
                                : 'Quando você enviar propostas aceitas e concluir matrizes, todo o seu histórico financeiro aparecerá aqui.'}
                        </p>
                        <Link
                            href="/jobs"
                            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-[#FFAE00] hover:bg-yellow-400 text-black text-xs font-bold rounded-lg transition-colors shadow"
                        >
                            Ver Pedidos Abertos no Feed
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
