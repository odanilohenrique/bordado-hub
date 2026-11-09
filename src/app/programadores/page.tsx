'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { Star, Target, UserCircle, Search, Zap, Users as UsersIcon, RefreshCw, AlertCircle, X } from 'lucide-react'
import { getCached, setCached } from '@/lib/clientCache'

interface Programmer {
    id: string
    name: string
    avatar_url: string | null
    bio: string | null
    skills: string[] | null
    rating: number
    reviews_count: number
    portfolio_urls: string[] | null
}

function ProgrammerCardSkeleton() {
    return (
        <div className="bg-[#12151C] border border-white/[0.07] rounded-2xl p-6 animate-pulse flex flex-col justify-between h-72">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 shrink-0" />
                <div className="space-y-2 flex-1">
                    <div className="h-5 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
            </div>
            <div className="space-y-2 my-4">
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-4/5" />
            </div>
            <div className="h-10 bg-white/5 rounded-xl w-full" />
        </div>
    )
}

export default function ProgrammersDirectory() {
    const { profileId } = useAuth()
    const [programmers, setProgrammers] = useState<Programmer[]>([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [hiredIds, setHiredIds] = useState<string[]>([])

    // 1. Busca os programadores imediatamente via API dedicada (sem travar por autenticação)
    const loadProgrammers = useCallback(async (isRefresh = false) => {
        if (!isRefresh) {
            const cached = getCached<Programmer[]>('programmers_list')
            if (cached && cached.length > 0) {
                setProgrammers(cached)
                setLoading(false)
            }
        }

        try {
            setFetchError(false)
            const res = await fetch('/api/programadores', { cache: 'no-store' })
            if (!res.ok) {
                throw new Error(`Status ${res.status}`)
            }

            const data = await res.json()
            if (Array.isArray(data.programmers)) {
                setProgrammers(data.programmers)
                setCached('programmers_list', data.programmers, 120000)
            }
        } catch (err) {
            console.error('Erro ao carregar lista de programadores:', err)
            // Se já tínhamos dados em tela (ou no cache), não mostra tela de erro brusca
            setProgrammers((prev) => {
                if (prev.length === 0) setFetchError(true)
                return prev
            })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadProgrammers()
    }, [loadProgrammers])

    // 2. Histórico de contratações do usuário logado (busca silenciosa e independente)
    useEffect(() => {
        if (!profileId) return

        let isMounted = true
        async function fetchHiredHistory() {
            try {
                const { data: myHires } = await supabase
                    .from('jobs')
                    .select('target_programmer_id, proposals(criador_id, status)')
                    .eq('cliente_id', profileId)

                if (!isMounted || !myHires) return

                const ids: string[] = []
                myHires.forEach((job) => {
                    if (job.target_programmer_id) ids.push(job.target_programmer_id)
                    if (job.proposals) {
                        // @ts-ignore
                        job.proposals.forEach((p: any) => {
                            if (p.status === 'aceita' || p.status === 'finalizado') {
                                ids.push(p.criador_id)
                            }
                        })
                    }
                })

                setHiredIds([...new Set(ids)])
            } catch (e) {
                console.warn('Erro ao verificar histórico de contratações:', e)
            }
        }

        fetchHiredHistory()
        return () => {
            isMounted = false
        }
    }, [profileId])

    const filteredProgrammers = programmers.filter((p) => {
        const query = searchTerm.toLowerCase().trim()
        if (!query) return true
        const nameMatch = (p.name || '').toLowerCase().includes(query)
        const skillsMatch = p.skills && Array.isArray(p.skills) && p.skills.some((s) => (s || '').toLowerCase().includes(query))
        return nameMatch || skillsMatch
    })

    return (
        <div className="min-h-screen text-slate-100">
            {/* Header Content */}
            <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
                        Encontrar Programadores
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base max-w-2xl leading-relaxed">
                        Descubra profissionais qualificados para criar sua matriz de bordado personalizada.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou software..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-9 py-2.5 border border-white/[0.07] rounded-xl text-sm bg-[#12151C] text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#F5A623] focus:border-[#F5A623] transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Error Banner with Retry (se falhar e não tiver nada em cache) */}
            {fetchError && programmers.length === 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-2xl mx-auto mb-8">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Instabilidade temporária de conexão</h3>
                    <p className="text-gray-400 text-sm mb-5">
                        Não foi possível carregar a lista de programadores neste instante.
                    </p>
                    <button
                        onClick={() => {
                            setLoading(true)
                            loadProgrammers(true)
                        }}
                        className="inline-flex items-center gap-2 bg-[#F5A623] hover:bg-[#FFAE00] text-black font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#F5A623]/10"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Novamente
                    </button>
                </div>
            )}

            {/* Content Array */}
            {loading && programmers.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ProgrammerCardSkeleton />
                    <ProgrammerCardSkeleton />
                    <ProgrammerCardSkeleton />
                    <ProgrammerCardSkeleton />
                    <ProgrammerCardSkeleton />
                    <ProgrammerCardSkeleton />
                </div>
            ) : filteredProgrammers.length === 0 ? (
                <div className="bg-[#12151C] border border-white/[0.07] rounded-2xl p-16 text-center max-w-2xl mx-auto">
                    <UsersIcon className="w-14 h-14 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-200 mb-2">Nenhum programador encontrado</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        {searchTerm
                            ? `Nenhum profissional corresponde à busca "${searchTerm}".`
                            : 'Ainda não há programadores com perfil público cadastrado.'}
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="inline-flex items-center gap-1.5 text-xs text-[#F5A623] hover:underline font-bold"
                        >
                            Limpar busca
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProgrammers.map((programmer) => (
                        <div
                            key={programmer.id}
                            className="bg-[#12151C] border border-white/[0.07] hover:border-[#F5A623]/40 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-[#F5A623]/5 group flex flex-col h-full relative overflow-hidden"
                        >
                            {/* Top Badges Area */}
                            <div className="absolute top-0 right-0 p-0 flex flex-col items-end z-10">
                                {programmer.rating >= 4.8 && programmer.reviews_count > 0 && (
                                    <div className="bg-[#181C26] border-l border-b border-[#F5A623]/30 text-[#F5A623] text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                                        <Zap className="w-3 h-3 fill-current" /> Top Rated
                                    </div>
                                )}
                                {hiredIds.includes(programmer.id) && (
                                    <div className="bg-emerald-500/10 border-l border-b border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current" /> Já Contratado
                                    </div>
                                )}
                            </div>

                            {/* Header: Avatar & Name */}
                            <div className="flex gap-4 items-center mb-4">
                                <div className="relative shrink-0">
                                    {programmer.avatar_url ? (
                                        <img
                                            src={programmer.avatar_url}
                                            alt={programmer.name}
                                            className="w-14 h-14 rounded-full object-cover border border-white/10 group-hover:border-[#F5A623] transition-colors"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-[#181C26] flex items-center justify-center border border-white/10 group-hover:border-[#F5A623] transition-colors">
                                            <UserCircle className="w-8 h-8 text-gray-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-bold text-white truncate pr-6 group-hover:text-[#F5A623] transition-colors">
                                        {programmer.name}
                                    </h2>
                                    {programmer.reviews_count && programmer.reviews_count > 0 && programmer.rating ? (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Star className="w-3.5 h-3.5 text-[#F5A623] fill-[#F5A623]" />
                                            <span className="text-[#F5A623] font-bold text-xs">
                                                {programmer.rating.toFixed(1)}
                                            </span>
                                            <span className="text-gray-500 text-xs ml-0.5">
                                                ({programmer.reviews_count}{' '}
                                                {programmer.reviews_count === 1 ? 'avaliação' : 'avaliações'})
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-xs text-gray-500 font-medium">Novo programador</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bio */}
                            <div className="flex-1 mb-6">
                                <p className="text-gray-400 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                                    {programmer.bio ||
                                        'Criador de matrizes na plataforma BordadoHUB. Solicite um orçamento direto e veja o resultado de perto.'}
                                </p>
                            </div>

                            {/* Skills */}
                            {programmer.skills && programmer.skills.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Especialidades
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {programmer.skills.slice(0, 4).map((skill, i) => (
                                            <span
                                                key={i}
                                                className="bg-[#0B0D11] border border-white/[0.07] text-gray-300 text-xs px-2.5 py-1 rounded-md"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                        {programmer.skills.length > 4 && (
                                            <span className="bg-[#0B0D11] border border-white/[0.07] text-gray-500 text-xs px-2 py-1 rounded-md">
                                                +{programmer.skills.length - 4}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-auto pt-4 border-t border-white/[0.07] flex items-center gap-2">
                                <Link
                                    href={`/profile/${programmer.id}`}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold py-2.5 px-3 rounded-xl transition-all text-xs border border-white/[0.07]"
                                >
                                    Ver Perfil
                                </Link>
                                <Link
                                    href={`/jobs/new?programmer_id=${programmer.id}`}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 text-black font-extrabold py-2.5 px-3 rounded-xl transition-all shadow-md shadow-[#FFB703]/10 text-xs active:scale-95"
                                >
                                    <Target className="w-3.5 h-3.5" />
                                    Contratar
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
