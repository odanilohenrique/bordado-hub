'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'
import { Search, Plus, Handshake } from 'lucide-react'
import Link from 'next/link'
import { getCached, setCached } from '@/lib/clientCache'

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
    const [filter, setFilter] = useState<string>('all')
    // Instant mount from client cache if available (0ms delay!)
    const [jobs, setJobs] = useState<any[]>(() => getCached<any[]>('jobs_all') || [])
    const [loading, setLoading] = useState<boolean>(() => !getCached<any[]>('jobs_all'))
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [lostBids, setLostBids] = useState<Set<string>>(new Set())

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

                // 2. Fetch user profile + proposals concurrently
                const fetchUserData = async () => {
                    const { data: { session } } = await supabase.auth.getSession()
                    const user = session?.user ?? null
                    let myProfileId: string | null = null
                    const myProposalsMap: Record<string, string> = {}

                    if (user) {
                        const { data: profile } = await supabase
                            .from('users')
                            .select('id')
                            .eq('supabase_user_id', user.id)
                            .maybeSingle()

                        if (profile?.id) {
                            myProfileId = profile.id
                            setCurrentUserId(myProfileId)
                            const { data: myProps } = await supabase
                                .from('proposals')
                                .select('job_id, status')
                                .eq('criador_id', myProfileId)
                            if (myProps) {
                                myProps.forEach(p => {
                                    myProposalsMap[p.job_id] = p.status
                                })
                                const lostSet = new Set(
                                    myProps
                                        .filter(p => p.status === 'recusada' || p.status === 'pendente')
                                        .map(p => p.job_id)
                                )
                                setLostBids(lostSet)
                            }
                        }
                    }
                    return { myProfileId, myProposalsMap }
                }

                // Execute jobs query and user data fetch IN PARALLEL!
                const [{ data: rawJobs }, { myProfileId, myProposalsMap }] = await Promise.all([
                    query,
                    fetchUserData(),
                ])

                // Extract proposal count, ownership and sent proposal status
                const enriched = (rawJobs || []).map((job: any) => {
                    const proposals = job.proposals || []
                    const acceptedProposal = proposals.find((p: any) => p.status === 'aceita')
                    const myProposalStatus = myProposalsMap[job.id] || null
                    const isOwner = !!(myProfileId && job.cliente_id === myProfileId)

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
            } catch (err) {
                console.error('Erro ao buscar jobs:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchJobs()
    }, [filter])

    return (
        <div className="min-h-screen bg-[#0F1115] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#F3F4F6]">Pedidos de Clientes</h1>
                        <p className="text-gray-400 mt-1">Mural público onde os clientes solicitam novas matrizes de bordado para você orçar e produzir</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex p-1 bg-[#1A1D23] rounded-xl border border-[#FFAE00]/20">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-lg shadow-[#FFAE00]/20 font-bold'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilter('aberto')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'aberto'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-lg shadow-[#FFAE00]/20 font-bold'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Abertos
                            </button>
                            <button
                                onClick={() => setFilter('em_progresso')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-1.5 ${filter === 'em_progresso'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-lg shadow-[#FFAE00]/20 font-bold'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Handshake className="w-4 h-4" /> Match Feito
                            </button>
                        </div>

                        <Link
                            href="/jobs/new"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FFAE00] to-[#FF9100] hover:from-[#FFB92E] hover:to-[#FFAE00] text-[#0F1115] px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all shadow-lg shadow-[#FFAE00]/20 hover:scale-105 active:scale-95 whitespace-nowrap"
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
                    <div className="text-center py-20 bg-[#1A1D23] rounded-xl border border-[#FFAE00]/10">
                        <Search className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">Nenhum projeto encontrado com este filtro.</p>
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
