'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { getCached, setCached } from '@/lib/clientCache'
import JobCard from '@/components/JobCard'
import Link from 'next/link'
import { Briefcase, Target, Clock, CheckCircle, Wrench, AlertCircle, Package, Award, Wallet } from 'lucide-react'

export default function CreatorDashboard() {
    const { profileId, loading: authLoading } = useAuth()
    const cachedData = getCached<any>('producao_data')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [inRevision, setInRevision] = useState<any[]>(() => cachedData?.inRevision || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [inProduction, setInProduction] = useState<any[]>(() => cachedData?.inProduction || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [delivered, setDelivered] = useState<any[]>(() => cachedData?.delivered || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [completed, setCompleted] = useState<any[]>(() => cachedData?.completed || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingProposals, setPendingProposals] = useState<any[]>(() => cachedData?.pendingProposals || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [directRequests, setDirectRequests] = useState<any[]>(() => cachedData?.directRequests || [])
    const [loading, setLoading] = useState(() => !cachedData)

    useEffect(() => {
        if (authLoading) return
        async function fetchData() {
            if (!profileId) {
                setLoading(false)
                return
            }
            try {
                const [{ data: directData }, { data: myProposalsData }] = await Promise.all([
                    supabase
                        .from('jobs')
                        .select('*, users!jobs_cliente_id_fkey(name, avatar_url)')
                        .eq('target_programmer_id', profileId)
                        .eq('status', 'aberto')
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('proposals')
                        .select('status, jobs(*, users!jobs_cliente_id_fkey(name, avatar_url))')
                        .eq('criador_id', profileId)
                        .order('created_at', { ascending: false })
                ])

                setDirectRequests(directData || [])

                if (myProposalsData) {
                    const mapped = myProposalsData.map(p => {
                        const jobData = Array.isArray(p.jobs) ? p.jobs[0] : p.jobs
                        return { ...jobData, my_proposal_status: p.status }
                    }).filter(Boolean)

                    const rev = mapped.filter(j => j.my_proposal_status === 'aceita' && j.status === 'em_revisao')
                    const prod = mapped.filter(j => j.my_proposal_status === 'aceita' && (j.status === 'em_progresso' || !j.status))
                    const deliv = mapped.filter(j => j.my_proposal_status === 'aceita' && j.status === 'entregue')
                    const comp = mapped.filter(j => j.my_proposal_status === 'aceita' && j.status === 'finalizado')
                    const pend = mapped.filter(j => j.my_proposal_status === 'pendente' || j.my_proposal_status === 'contraproposta')

                    setInRevision(rev)
                    setInProduction(prod)
                    setDelivered(deliv)
                    setCompleted(comp)
                    setPendingProposals(pend)

                    setCached('producao_data', {
                        directRequests: directData || [],
                        inRevision: rev, inProduction: prod, delivered: deliv,
                        completed: comp, pendingProposals: pend
                    }, 120000)
                }
            } catch (err) {
                console.error('Erro ao buscar producao:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [profileId, authLoading])

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

    const totalActive = inRevision.length + inProduction.length + delivered.length + completed.length + pendingProposals.length + directRequests.length

    return (
        <div className="space-y-8">
            {/* Dashboard Header */}
            <div className="bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-green-500/20 p-3 rounded-xl shrink-0">
                            <Briefcase className="w-7 h-7 text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white">Minha Produção</h1>
                            <p className="text-gray-400 text-sm mt-0.5">Gerencie suas matrizes e acompanhe cada etapa do trabalho</p>
                        </div>
                    </div>

                    {totalActive > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {inRevision.length > 0 && (
                                <span className="flex items-center gap-1.5 text-xs font-bold bg-yellow-500/10 text-yellow-400 px-3 py-1.5 rounded-full border border-yellow-500/30 animate-pulse">
                                    <Wrench className="w-3.5 h-3.5" /> {inRevision.length} em revisão
                                </span>
                            )}
                            {inProduction.length > 0 && (
                                <span className="flex items-center gap-1.5 text-xs font-bold bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/30">
                                    <Clock className="w-3.5 h-3.5" /> {inProduction.length} em produção
                                </span>
                            )}
                            {delivered.length > 0 && (
                                <span className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30">
                                    <Package className="w-3.5 h-3.5" /> {delivered.length} entregue{delivered.length > 1 ? 's' : ''}
                                </span>
                            )}
                            {completed.length > 0 && (
                                <span className="flex items-center gap-1.5 text-xs font-bold bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full border border-white/10">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-400" /> {completed.length} finalizada{completed.length > 1 ? 's' : ''}
                                </span>
                            )}
                            <Link
                                href="/financeiro"
                                className="inline-flex items-center gap-2 bg-[#FFAE00]/10 hover:bg-[#FFAE00]/20 text-[#FFAE00] border border-[#FFAE00]/30 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ml-auto"
                            >
                                <Wallet className="w-3.5 h-3.5" />
                                Painel Financeiro
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {totalActive === 0 && (
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

            {/* SEÇÃO 1: REVISÃO SOLICITADA (Prioridade Máxima) */}
            {inRevision.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-yellow-500/20 p-2.5 rounded-xl border border-yellow-500/30">
                            <Wrench className="w-5 h-5 text-yellow-400 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Revisão Solicitada pelo Cliente
                                <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{inRevision.length}</span>
                            </h2>
                            <p className="text-yellow-400/80 text-xs">O comprador testou a matriz e solicitou ajustes. Envie a versão corrigida.</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {inRevision.map((job) => (
                            <div key={`rev-${job.id}`} className="relative border border-yellow-500/40 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.12)]">
                                <div className="absolute -left-3 top-4 bottom-4 w-1 bg-yellow-500 rounded-full z-10 animate-pulse"></div>
                                <JobCard job={job} viewerRole="programmer" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* SEÇÃO 2: EM PRODUÇÃO */}
            {inProduction.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30">
                            <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Em Produção
                                <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{inProduction.length}</span>
                            </h2>
                            <p className="text-gray-400 text-xs">Matrizes que você está digitalizando e precisa entregar</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {inProduction.map((job) => (
                            <div key={`prod-${job.id}`} className="relative border border-blue-500/30 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.08)]">
                                <div className="absolute -left-3 top-4 bottom-4 w-1 bg-blue-500 rounded-full z-10"></div>
                                <JobCard job={job} viewerRole="programmer" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* SEÇÃO 3: MATRIZES ENTREGUES (Aguardando Aprovação) */}
            {delivered.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/30">
                            <Package className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Matrizes Entregues
                                <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{delivered.length}</span>
                            </h2>
                            <p className="text-gray-400 text-xs">Arquivos enviados. Aguardando o cliente testar e aprovar para liberação do PIX</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {delivered.map((job) => (
                            <div key={`deliv-${job.id}`} className="relative border border-emerald-500/20 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                                <div className="absolute -left-3 top-4 bottom-4 w-1 bg-emerald-500 rounded-full z-10"></div>
                                <JobCard job={job} viewerRole="programmer" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* SEÇÃO 4: CONCLUÍDAS & PAGAS */}
            {completed.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-green-500/20 p-2.5 rounded-xl border border-green-500/30">
                            <Award className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Concluídas & Pagas
                                <span className="bg-gray-700 text-gray-200 text-[10px] px-2 py-0.5 rounded-full font-bold">{completed.length}</span>
                            </h2>
                            <p className="text-gray-400 text-xs">Matrizes aprovadas pelo cliente com pagamento transferido</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {completed.map((job) => (
                            <div key={`comp-${job.id}`} className="relative border border-gray-800 rounded-xl overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                                <div className="absolute -left-3 top-4 bottom-4 w-1 bg-gray-600 rounded-full z-10"></div>
                                <JobCard job={job} viewerRole="programmer" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* SEÇÃO 5: PROPOSTAS ENVIADAS */}
            {pendingProposals.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-yellow-500/20 p-2.5 rounded-xl border border-yellow-500/30">
                            <Clock className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Propostas Enviadas
                                <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-black">{pendingProposals.length}</span>
                            </h2>
                            <p className="text-gray-400 text-xs">Aguardando resposta do cliente no mural de pedidos</p>
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

            {/* SEÇÃO 6: SOLICITAÇÕES DIRETAS */}
            {directRequests.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-purple-500/20 p-2.5 rounded-xl border border-purple-500/30">
                            <Target className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Solicitações Diretas
                                <span className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{directRequests.length}</span>
                            </h2>
                            <p className="text-gray-400 text-xs">Clientes que escolheram você especificamente para o trabalho</p>
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
