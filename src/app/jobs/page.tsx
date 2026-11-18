'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'
import { Search, Plus, Handshake, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { getCached, setCached } from '@/lib/clientCache'
import { useAuth } from '@/contexts/AuthContext'
import PushNotificationBanner from '@/components/PushNotificationBanner'

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
    const { profileId, profile } = useAuth()
    const [filter, setFilter] = useState<string>('all')
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [retryTick, setRetryTick] = useState<number>(0)
    const [lostBids, setLostBids] = useState<Set<string>>(new Set())

    const jobsRef = useRef<any[]>([])
    const profileIdRef = useRef<string | null>(profileId)
    profileIdRef.current = profileId

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

        // Hydrate cache inside useEffect for SSR safety and 0ms perceived latency
        const cached = getCached<any[]>(`jobs_${filter}`)
        if (cached && cached.length > 0) {
            jobsRef.current = cached
            setJobs(cached)
            setLoading(false)
            setFetchError(null)
        } else if (jobsRef.current.length === 0) {
            setLoading(true)
        }

        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 8500)

        async function fetchJobs() {
            try {
                // 1. Build jobs query
                const buildQuery = () => {
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
                    return query
                }

                // 2. Fetch proposals if user is logged in
                const fetchProposals = async () => {
                    const myProposalsMap: Record<string, string> = {}
                    const activeProfileId = profileIdRef.current || getCached<string>('current_user_profile_id')
                    if (!activeProfileId) return myProposalsMap

                    try {
                        const { data: myProps } = await supabase
                            .from('proposals')
                            .select('job_id, status')
                            .eq('criador_id', activeProfileId)

                        if (myProps && isMounted) {
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

                let rawJobsResult: any[] | null = null
                let proposalsMapResult: Record<string, string> = {}
                let lastJobsError: any = null

                for (let attempt = 0; attempt < 2; attempt++) {
                    if (!isMounted) return
                    const query = buildQuery()

                    const timeoutPromise = new Promise<[{ data: any; error: any }, Record<string, string>]>((resolve) =>
                        setTimeout(() => resolve([{ data: null, error: new Error('Jobs query timeout') }, {}]), 7500)
                    )

                    const [{ data: rawJobs, error: jobsError }, myProposalsMap] = await Promise.race([
                        Promise.all([query, fetchProposals()]),
                        timeoutPromise
                    ])

                    if (!isMounted) return

                    if (!jobsError && Array.isArray(rawJobs)) {
                        rawJobsResult = rawJobs
                        proposalsMapResult = myProposalsMap
                        lastJobsError = null
                        break
                    }

                    lastJobsError = jobsError || new Error('Falha ao carregar pedidos')
                    if (attempt === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 350))
                    }
                }

                if (!isMounted) return

                if (Array.isArray(rawJobsResult)) {
                    const activeProfileId = profileIdRef.current || getCached<string>('current_user_profile_id')
                    // Extract proposal count, ownership and sent proposal status
                    const enriched = rawJobsResult.map((job: any) => {
                        const proposals = job.proposals || []
                        const acceptedProposal = proposals.find((p: any) => p.status === 'aceita')
                        const myProposalStatus = proposalsMapResult[job.id] || null
                        const isOwner = !!(activeProfileId && job.cliente_id === activeProfileId)

                        return {
                            ...job,
                            proposalCount: proposals.length,
                            hasAcceptedProposal: !!acceptedProposal,
                            matchedProducerName: acceptedProposal?.users?.name || null,
                            my_proposal_status: myProposalStatus,
                            isOwner: isOwner,
                        }
                    })

                    jobsRef.current = enriched
                    setJobs(enriched)
                    setFetchError(null)
                    setCached(`jobs_${filter}`, enriched, 60000)
                } else {
                    if (lastJobsError) {
                        console.warn('Erro ao buscar jobs:', lastJobsError)
                    }
                    if (jobsRef.current.length === 0) {
                        setFetchError('Não foi possível carregar os pedidos no momento. Verifique sua conexão e tente novamente.')
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar jobs:', err)
                if (isMounted && jobsRef.current.length === 0) {
                    setFetchError('Não foi possível carregar os pedidos no momento. Verifique sua conexão e tente novamente.')
                }
            } finally {
                clearTimeout(safetyTimer)
                if (isMounted) setLoading(false)
            }
        }

        fetchJobs()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [filter, retryTick])

    // Enrich already-loaded public jobs when profileId arrives without aborting/restarting main jobs fetch
    useEffect(() => {
        if (!profileId) {
            setLostBids(new Set())
            return
        }

        let isMounted = true
        async function enrichUserProposals() {
            try {
                const { data: myProps, error } = await supabase
                    .from('proposals')
                    .select('job_id, status')
                    .eq('criador_id', profileId)

                if (!isMounted || error) return

                const myProposalsMap: Record<string, string> = {}
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

                if (jobsRef.current.length > 0) {
                    const updated = jobsRef.current.map((job: any) => ({
                        ...job,
                        my_proposal_status: myProposalsMap[job.id] ?? job.my_proposal_status ?? null,
                        isOwner: !!(profileId && job.cliente_id === profileId),
                    }))
                    jobsRef.current = updated
                    setJobs(updated)
                    setCached(`jobs_${filter}`, updated, 60000)
                }
            } catch (err) {
                console.warn('Erro ao enriquecer propostas do feed:', err)
            }
        }

        enrichUserProposals()

        return () => {
            isMounted = false
        }
    }, [profileId, filter])

    return (
        <div className="min-h-screen bg-[#0B0D11] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Banner de Push Notifications — aparece apenas para programadores não inscritos */}
                <PushNotificationBanner userId={profileId} role={profile?.role} />
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
                ) : fetchError && jobs.length === 0 ? (
                    <div className="text-center py-16 bg-[#12151C] rounded-2xl border border-red-500/20 px-4">
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4 opacity-80" />
                        <p className="text-gray-200 font-bold text-base">{fetchError}</p>
                        <button
                            type="button"
                            onClick={() => setRetryTick((t) => t + 1)}
                            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 text-black font-extrabold text-sm rounded-xl transition-all shadow-md"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Tentar novamente
                        </button>
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
