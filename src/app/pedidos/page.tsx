'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import JobCard from '@/components/JobCard'
import Link from 'next/link'
import { Plus, Inbox } from 'lucide-react'
import { getCached, setCached } from '@/lib/clientCache'

function PedidoCardSkeleton() {
    return (
        <div className="bg-[#1A1D23] border border-white/5 rounded-xl overflow-hidden p-6 animate-pulse flex flex-col md:flex-row gap-6 mb-4">
            <div className="w-full md:w-64 h-48 bg-white/5 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col justify-between space-y-4 py-2">
                <div className="space-y-3">
                    <div className="h-6 bg-white/5 rounded w-3/4" />
                    <div className="h-4 bg-white/5 rounded w-1/3" />
                </div>
                <div className="h-4 bg-white/5 rounded w-full" />
                <div className="h-10 bg-white/5 rounded-xl w-36" />
            </div>
        </div>
    )
}

export default function PedidosPage() {
    const { profileId, loading: authLoading } = useAuth()
    const [jobs, setJobs] = useState<any[]>(() => getCached<any[]>('pedidos_jobs') || [])
    const [loading, setLoading] = useState(() => !getCached<any[]>('pedidos_jobs'))
    const [filter, setFilter] = useState<string>('all')

    useEffect(() => {
        let isMounted = true
        // Fallback safety: never let pedidos spin longer than 2s under any circumstance
        const authSafetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 2000)

        const targetId = profileId || getCached<string>('current_user_profile_id')
        if (!targetId && !authLoading) {
            setLoading(false)
            return () => clearTimeout(authSafetyTimer)
        }
        if (!targetId) return () => clearTimeout(authSafetyTimer)

        async function fetchJobs() {
            try {
                const queryPromise = supabase
                    .from('jobs')
                    .select('*, proposals(status), target_programmer:target_programmer_id(name, avatar_url)')
                    .eq('cliente_id', targetId)
                    .order('created_at', { ascending: false })

                const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
                    setTimeout(() => resolve({ data: null, error: new Error('Pedidos query timeout') }), 2500)
                )

                const { data: jobsData } = await Promise.race([queryPromise, timeoutPromise])

                if (jobsData && isMounted) {
                    const enriched = jobsData.map((job: any) => {
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
                    setJobs(enriched)
                    setCached('pedidos_jobs', enriched, 120000)
                }
            } catch (err) {
                console.error('Erro ao buscar pedidos:', err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        fetchJobs()

        return () => {
            isMounted = false
            clearTimeout(authSafetyTimer)
        }
    }, [profileId, authLoading])

    return (
        <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-indigo-400">Matrizes que Encomendei</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Acompanhe o status dos seus pedidos
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex p-1 bg-[#1A1D23] rounded-lg border border-indigo-500/20">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'all'
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilter('aberto')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'aberto'
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Aguardando
                        </button>
                        <button
                            onClick={() => setFilter('em_progresso')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'em_progresso'
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Em Produção
                        </button>
                    </div>

                    <Link
                        href="/jobs/new"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all font-bold shadow-lg shadow-indigo-500/20 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Pedido
                    </Link>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 gap-6">
                    <PedidoCardSkeleton />
                    <PedidoCardSkeleton />
                </div>
            ) : jobs.length === 0 ? (
                <div className="bg-[#1A1D23] border border-[#FFAE00]/20 rounded-xl p-12 text-center">
                    <div className="bg-[#FFAE00]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Inbox className="w-10 h-10 text-[#FFAE00]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#F3F4F6] mb-2">
                        Nenhum pedido ainda
                    </h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Você ainda não criou nenhum pedido de matriz. Comece agora e receba propostas de programadores profissionais!
                    </p>
                    <Link
                        href="/jobs/new"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFAE00] text-[#0F1115] rounded-lg hover:bg-[#D97706] transition-all font-bold shadow-lg shadow-[#FFAE00]/20"
                    >
                        <Plus className="w-5 h-5" />
                        Criar Primeiro Pedido
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {jobs.filter(j => filter === 'all' ? true : j.status === filter).length === 0 ? (
                         <div className="text-center py-20 bg-[#1A1D23] rounded-xl border border-indigo-500/10">
                            <p className="text-gray-400 text-lg">Nenhum pedido encontrado nesta categoria.</p>
                         </div>
                    ) : (
                        jobs.filter(j => filter === 'all' ? true : j.status === filter).map((job) => (
                            <div key={job.id} className="space-y-0">
                                {/* Direct Request Banner */}
                                {job.target_programmer_id && (
                                    <div className="flex items-center gap-2 bg-purple-900/40 border border-purple-500/40 border-b-0 rounded-t-xl px-4 py-2">
                                        <span className="text-purple-300 text-xs font-bold uppercase tracking-wider">🎯 Solicitação Direta</span>
                                        <span className="text-purple-400 text-xs">→</span>
                                        <span className="text-white text-sm font-semibold">
                                            {job.target_programmer?.name ?? `Programador (ID: ${String(job.target_programmer_id).slice(0, 8)}...)`}
                                        </span>
                                    </div>
                                )}
                                <div className={job.target_programmer_id ? 'rounded-t-none overflow-hidden' : ''}>
                                    <JobCard
                                        job={job}
                                        hasNegotiation={job.proposals?.some((p: { status: string }) => p.status === 'contraproposta')}
                                        viewerRole="client"
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
