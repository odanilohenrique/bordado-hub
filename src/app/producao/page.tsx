'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'
import { Briefcase, Target, Clock, CheckCircle } from 'lucide-react'

export default function CreatorDashboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [inProduction, setInProduction] = useState<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingProposals, setPendingProposals] = useState<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [directRequests, setDirectRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }

            const { data: profile } = await supabase
                .from('users')
                .select('id')
                .eq('supabase_user_id', user.id)
                .single()

            if (!profile) { setLoading(false); return }

            // Fetch Direct Requests (jobs targeting this programmer)
            const { data: directData } = await supabase
                .from('jobs')
                .select('*, users!jobs_cliente_id_fkey(name, avatar_url)')
                .eq('target_programmer_id', profile.id)
                .eq('status', 'aberto')
                .order('created_at', { ascending: false })

            setDirectRequests(directData || [])

            // Fetch My Proposals with their jobs
            const { data: myProposalsData } = await supabase
                .from('proposals')
                .select('status, jobs(*, users!jobs_cliente_id_fkey(name, avatar_url))')
                .eq('criador_id', profile.id)
                .order('created_at', { ascending: false })
            
            if (myProposalsData) {
                const mapped = myProposalsData.map(p => {
                    const jobData = Array.isArray(p.jobs) ? p.jobs[0] : p.jobs
                    return { ...jobData, my_proposal_status: p.status }
                }).filter(Boolean)

                setInProduction(mapped.filter(j => j.my_proposal_status === 'aceita'))
                setPendingProposals(mapped.filter(j => j.my_proposal_status === 'pendente' || j.my_proposal_status === 'contraproposta'))
            }

            setLoading(false)
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Carregando sua produção...</p>
                </div>
            </div>
        )
    }

    const totalItems = inProduction.length + pendingProposals.length + directRequests.length

    return (
        <div className="space-y-8">
            {/* Dashboard Header */}
            <div className="bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 rounded-xl p-6">
                <div className="flex items-center gap-4">
                    <div className="bg-green-500/20 p-3 rounded-xl">
                        <Briefcase className="w-7 h-7 text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">Minha Produção</h1>
                        <p className="text-gray-400 text-sm mt-0.5">Gerencie suas matrizes e acompanhe seus trabalhos</p>
                    </div>
                    {totalItems > 0 && (
                        <div className="ml-auto hidden md:flex items-center gap-3">
                            {inProduction.length > 0 && (
                                <span className="flex items-center gap-1.5 text-xs font-bold bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full border border-green-500/20">
                                    <CheckCircle className="w-3 h-3" /> {inProduction.length} em produção
                                </span>
                            )}
                            {pendingProposals.length > 0 && (
                                <span className="flex items-center gap-1.5 text-xs font-bold bg-yellow-500/10 text-yellow-400 px-3 py-1.5 rounded-full border border-yellow-500/20">
                                    <Clock className="w-3 h-3" /> {pendingProposals.length} aguardando
                                </span>
                            )}
                            {directRequests.length > 0 && (
                                <span className="flex items-center gap-1.5 text-xs font-bold bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-full border border-purple-500/20">
                                    <Target className="w-3 h-3" /> {directRequests.length} diretas
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {totalItems === 0 && (
                <div className="bg-[#1A1D23] border border-green-500/10 rounded-xl p-12 text-center">
                    <div className="bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Briefcase className="w-10 h-10 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-[#F3F4F6] mb-2">Nenhum trabalho ainda</h3>
                    <p className="text-gray-400 mb-2 max-w-md mx-auto">
                        Você não tem matrizes em produção nem propostas enviadas. Explore o <strong className="text-[#FFAE00]">Feed Público</strong> para encontrar oportunidades!
                    </p>
                </div>
            )}

            {/* Section 1: Em Produção (Green) */}
            {inProduction.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-green-500/20 p-2 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Em Produção
                                <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{inProduction.length}</span>
                            </h2>
                            <p className="text-gray-500 text-xs">Matrizes aceitas que você está produzindo agora</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {inProduction.map((job) => (
                            <div key={`prod-${job.id}`} className="relative border border-green-500/20 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(34,197,94,0.05)]">
                                <div className="absolute -left-3 top-4 bottom-4 w-1 bg-green-500 rounded-full z-10"></div>
                                <JobCard job={job} viewerRole="programmer" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Section 2: Propostas Enviadas (Yellow) */}
            {pendingProposals.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-yellow-500/20 p-2 rounded-lg">
                            <Clock className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Propostas Enviadas
                                <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-black">{pendingProposals.length}</span>
                            </h2>
                            <p className="text-gray-500 text-xs">Aguardando resposta do cliente</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {pendingProposals.map((job) => (
                            <div key={`pending-${job.id}`} className="relative border border-yellow-500/20 rounded-xl overflow-hidden">
                                <div className="absolute -left-3 top-4 bottom-4 w-1 bg-yellow-500 rounded-full z-10"></div>
                                <JobCard job={job} viewerRole="programmer" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Section 3: Solicitações Diretas (Purple) */}
            {directRequests.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-purple-500/20 p-2 rounded-lg">
                            <Target className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Solicitações Diretas
                                <span className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{directRequests.length}</span>
                            </h2>
                            <p className="text-gray-500 text-xs">Clientes que escolheram você especificamente</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {directRequests.map((job) => (
                            <div key={`direct-${job.id}`} className="relative border border-purple-500/20 rounded-xl overflow-hidden">
                                <div className="absolute -left-3 top-4 bottom-4 w-1 bg-purple-500 rounded-full z-10"></div>
                                <JobCard job={job} viewerRole="programmer" />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
