'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'
import { Search, Plus } from 'lucide-react'
import Link from 'next/link'

export default function JobsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        async function fetchJobs() {
            // Get current user profile id
            const { data: { user } } = await supabase.auth.getUser()
            let myProfileId: string | null = null
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('supabase_user_id', user.id)
                    .single()
                if (profile) {
                    myProfileId = profile.id
                    setCurrentUserId(profile.id)
                }
            }

            // Fetch my sent proposals if logged in
            const myProposalsMap: Record<string, string> = {}
            if (myProfileId) {
                const { data: myProps } = await supabase
                    .from('proposals')
                    .select('job_id, status')
                    .eq('criador_id', myProfileId)
                if (myProps) {
                    myProps.forEach(p => {
                        myProposalsMap[p.job_id] = p.status
                    })
                }
            }

            // Fetch jobs with proposals (status + producer)
            let query = supabase
                .from('jobs')
                .select('*, users!jobs_cliente_id_fkey(name, avatar_url), proposals(status, users:criador_id(name))')
                .is('target_programmer_id', null)
                .order('created_at', { ascending: false })

            if (filter === 'aberto') {
                query = query.eq('status', 'aberto')
            } else if (filter === 'em_progresso') {
                query = query.eq('status', 'em_progresso')
            } else {
                // "all" = aberto + em_progresso (hide entregue/finalizado)
                query = query.in('status', ['aberto', 'em_progresso'])
            }

            const { data } = await query
            
            // Extract proposal count, ownership and sent proposal status
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const enriched = (data || []).map((job: any) => {
                const proposals = job.proposals || []
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            setLoading(false)
        }

        fetchJobs()
    }, [filter])

    // Check if the current user sent a proposal to a job that is now em_progresso (lost the bid)
    // We'll fetch this separately for the logged-in user
    const [lostBids, setLostBids] = useState<Set<string>>(new Set())

    useEffect(() => {
        async function fetchLostBids() {
            if (!currentUserId) return
            
            // Get proposals I sent that were rejected, or proposals I sent on jobs that went to someone else
            const { data } = await supabase
                .from('proposals')
                .select('job_id, status')
                .eq('criador_id', currentUserId)
                .in('status', ['recusada', 'pendente'])
            
            if (data) {
                const jobIds = new Set(data
                    .filter(p => p.status === 'recusada' || p.status === 'pendente')
                    .map(p => p.job_id))
                setLostBids(jobIds)
            }
        }
        fetchLostBids()
    }, [currentUserId])

    return (
        <div className="min-h-screen bg-[#0F1115] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#F3F4F6]">Feed Público</h1>
                        <p className="text-gray-400 mt-1">Encontre projetos de bordado e envie sua proposta</p>
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
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'em_progresso'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-lg shadow-[#FFAE00]/20 font-bold'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                🤝 Match Feito
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
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
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
