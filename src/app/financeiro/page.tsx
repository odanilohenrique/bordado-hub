'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { getCached, setCached } from '@/lib/clientCache'
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
    ArrowDownRight
} from 'lucide-react'
import { formatDate } from '@/lib/helpers'
import { toast } from 'sonner'

interface FinancialRecord {
    id: string
    job_id: string
    title: string
    client_name: string
    client_avatar: string | null
    created_at: string
    gross_amount: number
    net_amount: number
    payment_method: string
    status: 'liberado' | 'custodia' | 'pendente'
    items_count: number
}

export default function FinancialDashboard() {
    const { user: authUser, profile: authProfile, profileId, loading: authLoading } = useAuth()
    const [loading, setLoading] = useState(() => !getCached<FinancialRecord[]>('financeiro_records'))
    const [profile, setProfile] = useState<{ id: string; name: string; pix_key?: string; pix_key_type?: string } | null>(
        authProfile ? { id: authProfile.id, name: authProfile.name || '' } : null
    )
    const [records, setRecords] = useState<FinancialRecord[]>(() => getCached<FinancialRecord[]>('financeiro_records') || [])
    
    // Filtros
    const [statusFilter, setStatusFilter] = useState<'todos' | 'liberado' | 'custodia'>('todos')
    const [searchTerm, setSearchTerm] = useState('')

    // Edição de Chave PIX
    const [isEditingPix, setIsEditingPix] = useState(false)
    const [pixKey, setPixKey] = useState('')
    const [pixKeyType, setPixKeyType] = useState('cpf')
    const [savingPix, setSavingPix] = useState(false)

    useEffect(() => {
        async function fetchFinancialData() {
            if (authLoading) return
            if (!profileId || !authUser?.id) {
                setLoading(false)
                return
            }

            try {
                // Run all 3 queries in PARALLEL
                const [{ data: userProfile }, { data: myProposals }, { data: myTransactions }] = await Promise.all([
                    supabase
                        .from('users')
                        .select('id, name, pix_key, pix_key_type')
                        .eq('supabase_user_id', authUser.id)
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
                                    avatar_url
                                )
                            )
                        `)
                        .eq('criador_id', profileId)
                        .eq('status', 'aceita')
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('transactions')
                        .select('*')
                        .eq('criador_id', profileId)
                        .order('created_at', { ascending: false })
                ])

                if (userProfile) {
                    setProfile(userProfile)
                    setPixKey(userProfile.pix_key || '')
                    setPixKeyType(userProfile.pix_key_type || 'cpf')
                }

                const txMap = new Map<string, any>()
                if (myTransactions) {
                    myTransactions.forEach(tx => {
                        if (tx.job_id) txMap.set(tx.job_id, tx)
                    })
                }

                // 4. Mapeia os registros consolidados
                const consolidated: FinancialRecord[] = []

                if (myProposals) {
                    for (const prop of myProposals) {
                        const job = Array.isArray(prop.jobs) ? prop.jobs[0] : prop.jobs
                        if (!job) continue

                        const tx = txMap.get(job.id)
                        const gross = tx?.amount ? Number(tx.amount) : Number(prop.amount)
                        const net = tx?.valor_liquido ? Number(tx.valor_liquido) : Math.round(gross * 0.95 * 100) / 100
                        const method = tx?.metodo || 'asaas_pix'

                        // Determina status financeiro:
                        // 'finalizado' => valor liberado para o programador
                        // 'em_progresso' / 'entregue' / 'em_revisao' => saldo em custódia garantido
                        let financialStatus: 'liberado' | 'custodia' | 'pendente' = 'custodia'
                        if (job.status === 'finalizado' || tx?.status === 'liberado') {
                            financialStatus = 'liberado'
                        } else if (job.status === 'aberto' && tx?.status === 'pendente') {
                            financialStatus = 'pendente'
                        }

                        const clientObj: any = Array.isArray(job.cliente) ? job.cliente[0] : job.cliente

                        // Só inclui registros que foram pagos pelo comprador ou estão em andamento/concluídos
                        if (job.status !== 'aberto' || tx?.status === 'pago') {
                            consolidated.push({
                                id: tx?.id || prop.id,
                                job_id: job.id,
                                title: job.title,
                                client_name: clientObj?.name || 'Cliente',
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

                setRecords(consolidated)
                setCached('financeiro_records', consolidated, 120000)
            } catch (err) {
                console.error('Erro ao carregar dados financeiros:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchFinancialData()
    }, [profileId, authLoading, authUser?.id])

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
            const matchesSearch = searchTerm.trim() === '' || 
                r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                r.client_name.toLowerCase().includes(searchTerm.toLowerCase())
            return matchesStatus && matchesSearch
        })
    }, [records, statusFilter, searchTerm])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center">
                    <div className="w-14 h-14 border-4 border-[#FFAE00]/20 border-t-[#FFAE00] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm font-medium text-gray-400">Carregando painel financeiro...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-12">
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
                <div className="bg-[#1A1D23] border border-white/5 hover:border-green-500/30 rounded-xl p-5 shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Total Faturado
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        R$ {metrics.totalEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        {metrics.totalOrders} {metrics.totalOrders === 1 ? 'pedido finalizado' : 'pedidos finalizados'}
                    </p>
                </div>

                {/* 2. Saldo em Garantia (Custódia) */}
                <div className="bg-[#1A1D23] border border-white/5 hover:border-[#FFAE00]/30 rounded-xl p-5 shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Saldo em Custódia
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-[#FFAE00]/10 border border-[#FFAE00]/20 flex items-center justify-center text-[#FFAE00]">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        R$ {metrics.totalInEscrow.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#FFAE00]" />
                        {metrics.inProductionOrders} {metrics.inProductionOrders === 1 ? 'pedido em produção' : 'pedidos em produção'}
                    </p>
                </div>

                {/* 3. Ticket Médio por Matriz */}
                <div className="bg-[#1A1D23] border border-white/5 hover:border-cyan-500/30 rounded-xl p-5 shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Ticket Médio
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <BarChart3 className="w-5 h-5" />
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
                <div className="bg-[#1A1D23] border border-white/5 hover:border-indigo-500/30 rounded-xl p-5 shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Matrizes Entregues
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Package className="w-5 h-5" />
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
                {filteredRecords.length > 0 ? (
                    <div className="overflow-x-auto">
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
                                {filteredRecords.map(rec => (
                                    <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors group">
                                        {/* Data */}
                                        <td className="py-3.5 px-4 text-gray-400 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                                <Calendar className="w-3 h-3 text-gray-500" />
                                                {formatDate(rec.created_at)}
                                            </div>
                                        </td>

                                        {/* Título do Pedido */}
                                        <td className="py-3.5 px-4 font-medium text-white max-w-[240px]">
                                            <div className="truncate" title={rec.title}>
                                                {rec.title}
                                            </div>
                                            {rec.items_count > 1 && (
                                                <span className="text-[10px] text-gray-500">
                                                    Kit com {rec.items_count} matrizes
                                                </span>
                                            )}
                                        </td>

                                        {/* Comprador */}
                                        <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {rec.client_avatar ? (
                                                    <img src={rec.client_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-400 font-bold">
                                                        {rec.client_name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="truncate max-w-[120px]">{rec.client_name}</span>
                                            </div>
                                        </td>

                                        {/* Método de Pagamento */}
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

                                        {/* Status */}
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

                                        {/* Valor Líquido */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm">
                                            <span className={rec.status === 'liberado' ? 'text-green-400' : 'text-gray-200'}>
                                                R$ {rec.net_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>

                                        {/* Ação */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <Link
                                                href={`/jobs/${rec.job_id}`}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-[#FFAE00] transition-colors p-1"
                                                title="Ver Detalhes do Pedido"
                                            >
                                                <span>Ver</span>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
