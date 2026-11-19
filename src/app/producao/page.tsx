'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { getCached, setCached, getScopedCached, setScopedCached, hasNonEmptyCacheData } from '@/lib/clientCache'
import JobCard from '@/components/JobCard'
import Link from 'next/link'
import { Briefcase, Target, Clock, CheckCircle, Wrench, AlertCircle, Package, Award, Wallet, RefreshCw } from 'lucide-react'

export default function CreatorDashboard() {
    const { user: authUser, profileId, loading: authLoading, profileLoading } = useAuth()
    const authUserId = authUser?.id || null

    const [inRevision, setInRevision] = useState<any[]>([])
    const [inProduction, setInProduction] = useState<any[]>([])
    const [delivered, setDelivered] = useState<any[]>([])
    const [completed, setCompleted] = useState<any[]>([])
    const [pendingProposals, setPendingProposals] = useState<any[]>([])
    const [directRequests, setDirectRequests] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [retryTick, setRetryTick] = useState<number>(0)

    const hasDataRef = useRef<boolean>(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const handleReload = () => setRetryTick((t) => t + 1)
        const handleVisibility = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                setRetryTick((t) => t + 1)
            }
        }
        window.addEventListener('bordadohub_reload_job', handleReload)
        document.addEventListener('visibilitychange', handleVisibility)
        return () => {
            window.removeEventListener('bordadohub_reload_job', handleReload)
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [])

    useEffect(() => {
        let isMounted = true
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

        const cachedData =
            getScopedCached<any>('producao_data', targetId, { requireNonEmpty: true }) ||
            getCached<any>(`producao_data_${targetId}`)

        if (cachedData && hasNonEmptyCacheData(cachedData)) {
            setInRevision(cachedData.inRevision || [])
            setInProduction(cachedData.inProduction || [])
            setDelivered(cachedData.delivered || [])
            setCompleted(cachedData.completed || [])
            setPendingProposals(cachedData.pendingProposals || [])
            setDirectRequests(cachedData.directRequests || [])
            hasDataRef.current = true
            setFetchError(null)
            setLoading(false)
        } else if (!hasDataRef.current) {
            setLoading(true)
        }

        async function fetchData() {
            try {
                let directResult: any[] | null = null
                let proposalsResult: any[] | null = null
                let lastError: any = null

                for (let attempt = 0; attempt < 2; attempt++) {
                    if (!isMounted) return

                    const fetchPromise = Promise.all([
                        supabase
                            .from('jobs')
                            .select('*, users!jobs_cliente_id_fkey(name, avatar_url)')
                            .eq('target_programmer_id', targetId)
                            .eq('status', 'aberto')
                            .order('created_at', { ascending: false }),
                        supabase
                            .from('proposals')
                            .select('status, jobs(*, users!jobs_cliente_id_fkey(name, avatar_url))')
                            .eq('criador_id', targetId)
                            .order('created_at', { ascending: false })
                    ])

                    const timeoutPromise = new Promise<[{ data: any; error: any }, { data: any; error: any }]>((resolve) =>
                        setTimeout(
                            () =>
                                resolve([
                                    { data: null, error: new Error('Direct requests timeout') },
                                    { data: null, error: new Error('Proposals timeout') },
                                ]),
                            7500
                        )
                    )

                    const [{ data: directData, error: directError }, { data: myProposalsData, error: proposalsError }] =
                        await Promise.race([fetchPromise, timeoutPromise])

                    if (!isMounted) return

                    if (!directError && !proposalsError && (Array.isArray(directData) || Array.isArray(myProposalsData))) {
                        directResult = Array.isArray(directData) ? directData : []
                        proposalsResult = Array.isArray(myProposalsData) ? myProposalsData : []
                        lastError = null
                        break
                    }

                    lastError = directError || proposalsError || new Error('Falha ao sincronizar produção')
                    if (attempt === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 350))
                    }
                }

                if (!isMounted) return

                if (lastError && !directResult && !proposalsResult) {
                    console.warn('Erro ao sincronizar produção:', lastError)
                    if (!hasDataRef.current) {
                        setFetchError('Não foi possível sincronizar sua produção. Tente novamente.')
                    }
                    return
                }

                const nextDirect = directResult || []
                const mapped = (proposalsResult || [])
                    .map((p: any) => {
                        const jobData = Array.isArray(p.jobs) ? p.jobs[0] : p.jobs
                        return jobData ? { ...jobData, my_proposal_status: p.status } : null
                    })
                    .filter(Boolean)

                const rev = mapped.filter((j: any) => j.my_proposal_status === 'aceita' && j.status === 'em_revisao')
                const prod = mapped.filter((j: any) => j.my_proposal_status === 'aceita' && (j.status === 'em_progresso' || !j.status))
                const deliv = mapped.filter((j: any) => j.my_proposal_status === 'aceita' && j.status === 'entregue')
                const comp = mapped.filter((j: any) => j.my_proposal_status === 'aceita' && (j.status === 'finalizado' || j.status === 'concluido'))
                const pend = mapped.filter((j: any) => j.my_proposal_status === 'pendente' || j.my_proposal_status === 'contraproposta')

                setDirectRequests(nextDirect)
                setInRevision(rev)
                setInProduction(prod)
                setDelivered(deliv)
                setCompleted(comp)
                setPendingProposals(pend)
                setFetchError(null)
                hasDataRef.current = hasNonEmptyCacheData({
                    directRequests: nextDirect,
                    inRevision: rev,
                    inProduction: prod,
                    delivered: deliv,
                    completed: comp,
                    pendingProposals: pend,
                })

                const payload = {
                    directRequests: nextDirect,
                    inRevision: rev,
                    inProduction: prod,
                    delivered: deliv,
                    completed: comp,
                    pendingProposals: pend,
                }
                setScopedCached('producao_data', targetId, payload, 120000)
                setCached(`producao_data_${targetId}`, payload, 120000)
                setCached('producao_data', payload, 120000)
            } catch (err) {
                console.error('Erro ao buscar producao:', err)
                if (isMounted && !hasDataRef.current) {
                    setFetchError('Não foi possível sincronizar sua produção. Tente novamente.')
                }
            } finally {
                clearTimeout(safetyTimer)
                if (isMounted) setLoading(false)
            }
        }
        fetchData()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [profileId, authLoading, profileLoading, authUserId, retryTick])

    const totalActive = inRevision.length + inProduction.length + delivered.length + completed.length + pendingProposals.length + directRequests.length

    return (
        <div className="space-y-8">
            {/* Dashboard Header */}
            <div className="bg-gradient-to-r from-[#2563EB]/10 to-transparent border border-[#2563EB]/25 dark:border-[#3B82F6]/25 rounded-xl p-5 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#2563EB]/15 p-3 rounded-xl shrink-0">
                            <Briefcase className="w-7 h-7 text-[#2563EB] dark:text-[#60A5FA]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Minha Produção</h1>
                            <p className="text-[var(--text-secondary)] text-sm mt-0.5">Gerencie suas matrizes e acompanhe cada etapa do trabalho</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {inRevision.length > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-bold bg-[#DC2626]/10 text-[#DC2626] dark:text-[#F87171] px-3 py-1.5 rounded-full border border-[#DC2626]/25">
                                <Wrench className="w-3.5 h-3.5" /> {inRevision.length} em revisão
                            </span>
                        )}
                        {inProduction.length > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-bold bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 text-[#1D4ED8] dark:text-[#60A5FA] px-3 py-1.5 rounded-full border border-[#2563EB]/25 dark:border-[#3B82F6]/30">
                                <Clock className="w-3.5 h-3.5" /> {inProduction.length} em produção
                            </span>
                        )}
                        {delivered.length > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-bold bg-[#0D9488]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6] px-3 py-1.5 rounded-full border border-[#0D9488]/25 dark:border-[#14B8A6]/30">
                                <Package className="w-3.5 h-3.5" /> {delivered.length} entregue{delivered.length > 1 ? 's' : ''}
                            </span>
                        )}
                        {completed.length > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-bold bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] px-3 py-1.5 rounded-full border border-[var(--border-hairline)]">
                                <CheckCircle className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" /> {completed.length} finalizada{completed.length > 1 ? 's' : ''}
                            </span>
                        )}
                        <Link
                            href="/financeiro"
                            className="min-h-[44px] inline-flex items-center gap-2 bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 hover:bg-[#2563EB]/20 dark:hover:bg-[#3B82F6]/25 text-[#1D4ED8] dark:text-[#60A5FA] border border-[#2563EB]/25 dark:border-[#3B82F6]/30 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ml-auto"
                        >
                            <Wallet className="w-3.5 h-3.5" />
                            Painel Financeiro
                        </Link>
                    </div>
                </div>
            </div>

            {loading && totalActive === 0 ? (
                <div className="space-y-4">
                    <div className="h-28 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl animate-pulse" />
                    <div className="h-28 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl animate-pulse" />
                </div>
            ) : fetchError && totalActive === 0 ? (
                <div className="bg-[var(--bg-surface)] border border-[#DC2626]/25 rounded-2xl p-10 text-center">
                    <div className="bg-[#DC2626]/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#DC2626]/25">
                        <AlertCircle className="w-8 h-8 text-[#DC2626] dark:text-[#F87171]" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{fetchError}</h3>
                    <button
                        type="button"
                        onClick={() => setRetryTick((t) => t + 1)}
                        className="mt-4 min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] font-semibold text-sm rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tentar novamente
                    </button>
                </div>
            ) : totalActive === 0 && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-12 text-center">
                    <div className="bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#2563EB]/25 dark:border-[#3B82F6]/30">
                        <Briefcase className="w-10 h-10 text-[#1D4ED8] dark:text-[#60A5FA]" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Nenhum trabalho em andamento</h3>
                    <p className="text-[var(--text-secondary)] text-sm mb-2 max-w-md mx-auto">
                        Você não tem matrizes em produção no momento. Explore as oportunidades no feed de pedidos para enviar propostas!
                    </p>
                </div>
            )}

            {/* SEÇÃO 1: REVISÃO SOLICITADA (Prioridade Máxima) */}
            {inRevision.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-[#DC2626]/10 p-2.5 rounded-xl border border-[#DC2626]/25">
                            <Wrench className="w-5 h-5 text-[#DC2626] dark:text-[#F87171]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                Revisão Solicitada pelo Cliente
                                <span className="bg-[#DC2626] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{inRevision.length}</span>
                            </h2>
                            <p className="text-[#DC2626] dark:text-[#F87171] text-xs">O comprador testou a matriz e solicitou ajustes. Envie a versão corrigida.</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {inRevision.map((job) => (
                            <div key={`rev-${job.id}`} className="relative border border-[#DC2626]/35 rounded-xl overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#DC2626] z-10"></div>
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
                        <div className="bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 p-2.5 rounded-xl border border-[#2563EB]/25 dark:border-[#3B82F6]/30">
                            <Clock className="w-5 h-5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                Em Produção
                                <span className="bg-[#2563EB] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{inProduction.length}</span>
                            </h2>
                            <p className="text-[var(--text-secondary)] text-xs">Matrizes que você está digitalizando e precisa entregar</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {inProduction.map((job) => (
                            <div key={`prod-${job.id}`} className="relative border border-[#2563EB]/30 dark:border-[#3B82F6]/30 rounded-xl overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2563EB] dark:bg-[#3B82F6] z-10"></div>
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
                        <div className="bg-[#0D9488]/10 dark:bg-[#14B8A6]/15 p-2.5 rounded-xl border border-[#0D9488]/25 dark:border-[#14B8A6]/30">
                            <Package className="w-5 h-5 text-[#0F766E] dark:text-[#14B8A6]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                Matrizes Entregues
                                <span className="bg-[#0D9488] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{delivered.length}</span>
                            </h2>
                            <p className="text-[var(--text-secondary)] text-xs">Arquivos enviados. Aguardando o cliente testar e aprovar para liberação do PIX</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {delivered.map((job) => (
                            <div key={`deliv-${job.id}`} className="relative border border-[#0D9488]/30 dark:border-[#14B8A6]/30 rounded-xl overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0D9488] dark:bg-[#14B8A6] z-10"></div>
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
                        <div className="bg-[#0D9488]/10 dark:bg-[#14B8A6]/15 p-2.5 rounded-xl border border-[#0D9488]/25 dark:border-[#14B8A6]/30">
                            <Award className="w-5 h-5 text-[#0F766E] dark:text-[#14B8A6]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                Concluídas & Pagas
                                <span className="bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-hairline)] text-[10px] px-2 py-0.5 rounded-full font-bold">{completed.length}</span>
                            </h2>
                            <p className="text-[var(--text-secondary)] text-xs">Matrizes aprovadas pelo cliente com pagamento transferido</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {completed.map((job) => (
                            <div key={`comp-${job.id}`} className="relative border border-[var(--border-hairline)] rounded-xl overflow-hidden opacity-95 hover:opacity-100 transition-opacity">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#64748B] z-10"></div>
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
                        <div className="bg-[var(--bg-surface-elevated)] p-2.5 rounded-xl border border-[var(--border-hairline)]">
                            <Clock className="w-5 h-5 text-[var(--cobalt-text)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                Propostas Enviadas
                                <span className="bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingProposals.length}</span>
                            </h2>
                            <p className="text-[var(--text-secondary)] text-xs">Aguardando resposta do cliente no mural de pedidos</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {pendingProposals.map((job) => (
                            <div key={`pending-${job.id}`} className="relative border border-[var(--border-hairline)] rounded-xl overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3B82F6]/60 z-10"></div>
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
                        <div className="bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 p-2.5 rounded-xl border border-[#2563EB]/25 dark:border-[#3B82F6]/30">
                            <Target className="w-5 h-5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                Solicitações Diretas
                                <span className="bg-[#2563EB] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{directRequests.length}</span>
                            </h2>
                            <p className="text-[var(--text-secondary)] text-xs">Clientes que escolheram você especificamente para o trabalho</p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {directRequests.map((job) => (
                            <div key={`direct-${job.id}`} className="relative border border-[#2563EB]/35 dark:border-[#3B82F6]/35 rounded-xl overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2563EB] z-10"></div>
                                <JobCard job={job} viewerRole="programmer" />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
