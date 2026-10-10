'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'
import { Search, Plus, Handshake } from 'lucide-react'
import Link from 'next/link'
import { getCached, setCached } from '@/lib/clientCache'
import { useAuth } from '@/contexts/AuthContext'

function JobCardSkeleton() {
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

export default function JobsPage() {
    const { profileId } = useAuth()
    const [filter, setFilter] = useState<string>('all')
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [currentUserId, setCurrentUserId] = useState<string | null>(profileId || null)
    const [lostBids, setLostBids] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (profileId) {
            setCurrentUserId(profileId)
        }
    }, [profileId])

    useEffect(() => {
        // If cached for this filter, display instantly without spinner
        const cached = getCached<any[]>(`jobs_${filter}`)
        if (cached) {
            setJobs(cached)
            setLoading(false)
        }

        async function fetchJobs() {
            try {
                // 1. Build jobs query
                let query = supabase
                    .from('jobs')
                    .select('*, users!jobs_cliente_id_fkey(name, avatar_url), proposals(status, users:criador_id(name))')
                    .is('target_programmer_id', null)
                    .order('created_at', { ascending: false })
                    .limit(30)

                if (filter === 'aberto') {
                    query = query.eq('status', 'aberto')
                } else if (filter === 'em_progresso') {
                    query = query.eq('status', 'em_progresso')
                } else {
                    query = query.in('status', ['aberto', 'em_progresso'])
                }

                // 2. Fetch proposals if user is logged in
                const fetchProposals = async () => {
                    const myProposalsMap: Record<string, string> = {}
                    if (!profileId) return myProposalsMap

                    try {
                        const { data: myProps } = await supabase
                            .from('proposals')
                            .select('job_id, status')
                            .eq('criador_id', profileId)

                        if (myProps) {
                            myProps.forEach((p: any) => {
                                myProposalsMap[p.job_id] = p.status
                            })
                            const lostSet = new Set<string>(
                                myProps
                                    .filter((p: any) => p.status === 'recusada' || p.status === 'pendente')
                                    .map((p: any) => p.job_id)
                            )
                            setLostBids(lostSet)
                        }
                    } catch (pErr) {
                        console.warn('Erro ao carregar propostas do usuário:', pErr)
                    }
                    return myProposalsMap
                }

                // Timeout promise to guarantee the page NEVER hangs forever (6s safety net)
                const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
                    setTimeout(() => resolve({ data: null, error: new Error('Jobs query timeout') }), 6000)
                )

                // Execute jobs query and proposals in parallel with timeout safety net
                const [{ data: rawJobs }, myProposalsMap] = await Promise.all([
                    Promise.race([query, timeoutPromise]),
                    fetchProposals()
                ])

                if (rawJobs) {
                    // Extract proposal count, ownership and sent proposal status
                    const enriched = rawJobs.map((job: any) => {
                        const proposals = job.proposals || []
                        const acceptedProposal = proposals.find((p: any) => p.status === 'aceita')
                        const myProposalStatus = myProposalsMap[job.id] || null
                        const isOwner = !!(profileId && job.cliente_id === profileId)

                        return {
                            ...job,
                            proposalCount: proposals.length,
                            hasAcceptedProposal: !!acceptedProposal,
                            matchedProducerName: acceptedProposal?.users?.name || null,
                            my_proposal_status: myProposalStatus,
                            isOwner: isOwner,
                        }
                    })

                    setJobs(enriched)
                    setCached(`jobs_${filter}`, enriched, 60000)
                }
            } catch (err) {
                console.error('Erro ao buscar jobs:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchJobs()
    }, [filter, profileId])

    return (
        <div className="min-h-screen bg-[#0B0D11] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">Pedidos de Clientes</h1>
                        <p className="text-gray-400 mt-1 text-sm">Mural de solicitações de novas matrizes de bordado para você orçar e produzir com pagamento garantido</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex p-1 bg-[#12151C] rounded-2xl border border-white/[0.07]">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${filter === 'all'
                                    ? 'bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-black font-extrabold shadow-md shadow-[#F5A623]/20'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilter('aberto')}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${filter === 'aberto'
                                    ? 'bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-black font-extrabold shadow-md shadow-[#F5A623]/20'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Abertos
                            </button>
                            <button
                                onClick={() => setFilter('em_progresso')}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all inline-flex items-center gap-1.5 ${filter === 'em_progresso'
                                    ? 'bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-black font-extrabold shadow-md shadow-[#F5A623]/20'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Handshake className="w-4 h-4" /> Negócio Fechado
                            </button>
                        </div>

                        <Link
                            href="/jobs/new"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 text-black px-5 py-2.5 rounded-2xl font-extrabold text-sm transition-all shadow-md shadow-[#F5A623]/20 hover:scale-[1.02] active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            Criar Pedido
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 gap-6">
                        <JobCardSkeleton />
                        <JobCardSkeleton />
                        <JobCardSkeleton />
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-20 bg-[#12151C] rounded-2xl border border-white/[0.07] px-4">
                        <Search className="w-10 h-10 text-gray-500 mx-auto mb-4 opacity-50" />
                        <p className="text-gray-300 font-bold text-base">Nenhum pedido encontrado com este filtro.</p>
                        <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">Assim que os clientes publicarem novas solicitações de matrizes, elas aparecerão aqui instantaneamente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {jobs.map((job) => {
                            // Determine feed badge
                            let feedBadge: 'accepting' | 'matched' | undefined
                            if (job.status === 'em_progresso' || job.status === 'finalizado' || job.status === 'entregue' || job.hasAcceptedProposal) {
                                feedBadge = 'matched'
                            } else if (job.status === 'aberto') {
                                feedBadge = 'accepting'
                            }

                            // Check if user lost this bid
                            const userLostBid = (job.status === 'em_progresso' || job.hasAcceptedProposal) && lostBids.has(job.id)

                            return (
                                <JobCard 
                                    key={job.id} 
                                    job={job} 
                                    proposalCount={job.proposalCount}
                                    feedBadge={feedBadge}
                                    userLostBid={userLostBid}
                                    matchedProducerName={job.matchedProducerName}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
