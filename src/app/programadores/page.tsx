'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Star, Code, Target, UserCircle, Search, Zap, Users as UsersIcon } from 'lucide-react'
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
        <div className="bg-[#1A1D23] border border-gray-800 rounded-2xl p-6 animate-pulse flex flex-col justify-between h-72">
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
    // Instant mount from cache if available (0ms delay!)
    const [programmers, setProgrammers] = useState<Programmer[]>(() => getCached<Programmer[]>('programmers_list') || [])
    const [loading, setLoading] = useState(() => !getCached<Programmer[]>('programmers_list'))
    const [searchTerm, setSearchTerm] = useState('')
    const [hiredIds, setHiredIds] = useState<string[]>([])
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            // 1. Fetch creators query promise
            const creatorsPromise = supabase
                .from('users')
                .select('*')
                .or('role.eq.criador,skills.not.is.null')
                .order('rating', { ascending: false })

            // 2. Fetch current user and hired history promise
            const hiredPromise = async () => {
                const { data: { session } } = await supabase.auth.getSession()
                if (!session?.user) return { myId: null, ids: [] as string[] }

                let myId = getCached<string>('current_user_profile_id')
                if (!myId) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('id')
                        .eq('supabase_user_id', session.user.id)
                        .maybeSingle()
                    if (profile) {
                        myId = profile.id
                        setCached('current_user_profile_id', profile.id, 300000)
                    }
                }

                if (!myId) return { myId: null, ids: [] as string[] }

                const { data: myHires } = await supabase
                    .from('jobs')
                    .select('target_programmer_id, proposals(criador_id, status)')
                    .eq('cliente_id', myId)

                const ids: string[] = []
                if (myHires) {
                    myHires.forEach(job => {
                        if (job.target_programmer_id) ids.push(job.target_programmer_id)
                        if (job.proposals) {
                            // @ts-ignore
                            job.proposals.forEach(p => {
                                if (p.status === 'aceita' || p.status === 'finalizado') {
                                    ids.push(p.criador_id)
                                }
                            })
                        }
                    })
                }
                return { myId, ids: [...new Set(ids)] }
            }

            // Run creators query and user history IN PARALLEL!
            const [{ data: creators }, { myId, ids }] = await Promise.all([
                creatorsPromise,
                hiredPromise(),
            ])

            if (creators) {
                setProgrammers(creators)
                setCached('programmers_list', creators, 120000) // cache for 2 mins
            }
            if (myId) setCurrentUserId(myId)
            if (ids) setHiredIds(ids)

            setLoading(false)
        }

        fetchData()
    }, [])

    const filteredProgrammers = programmers.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.skills && p.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
    )

    return (
        <div className="min-h-screen">
            {/* Header Content */}
            <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FFAE00] to-yellow-300 mb-2">
                        Encontrar Programadores
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl">
                        Descubra os melhores profissionais para criar sua matriz de bordado.
                        Contrate diretamente clicando no perfil.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou software..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-[#FFAE00]/20 rounded-xl leading-5 bg-[#1A1D23] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-[#FFAE00] sm:text-sm transition-all shadow-inner"
                    />
                </div>
            </div>

            {/* Content Array */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ProgrammerCardSkeleton />
                    <ProgrammerCardSkeleton />
                    <ProgrammerCardSkeleton />
                    <ProgrammerCardSkeleton />
                    <ProgrammerCardSkeleton />
                    <ProgrammerCardSkeleton />
                </div>
            ) : filteredProgrammers.length === 0 ? (
                <div className="bg-[#1A1D23] border border-[#FFAE00]/20 rounded-2xl p-16 text-center max-w-3xl mx-auto shadow-2xl">
                    <UsersIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-300 mb-2">Nenhum programador encontrado</h3>
                    <p className="text-gray-500">
                        {searchTerm ? 'Tente buscar por um software ou nome diferente.' : 'Ainda não há programadores com perfil público cadastradado.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProgrammers.map((programmer) => (
                        <div key={programmer.id} className="bg-[#1A1D23] border border-gray-800 hover:border-[#FFAE00]/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,174,0,0.1)] group flex flex-col h-full relative overflow-hidden">
                            {/* Top Badges Area */}
                            <div className="absolute top-0 right-0 p-0 flex flex-col items-end">
                                {programmer.rating >= 4.8 && (
                                    <div className="bg-gradient-to-r from-[#FFAE00] to-yellow-400 text-[#0F1115] text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> Top Rated
                                    </div>
                                )}
                                {hiredIds.includes(programmer.id) && (
                                    <div className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1 shadow-lg">
                                        <Star className="w-3 h-3 fill-current" /> Já Contratado
                                    </div>
                                )}
                            </div>

                            {/* Header: Avatar & Name */}
                            <div className="flex gap-4 items-center mb-4">
                                <div className="relative">
                                    {programmer.avatar_url ? (
                                        <img src={programmer.avatar_url} alt={programmer.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#1A1D23] group-hover:border-[#FFAE00] transition-colors shadow-lg" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center border-2 border-transparent group-hover:border-[#FFAE00] transition-colors">
                                            <UserCircle className="w-10 h-10 text-gray-500" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[#F3F4F6] truncate pr-8">{programmer.name}</h2>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <Star className="w-4 h-4 text-[#FFAE00] fill-[#FFAE00]" />
                                        <span className="text-[#FFAE00] font-bold">{programmer.rating.toFixed(1)}</span>
                                        <span className="text-gray-500 text-xs ml-1">({programmer.reviews_count} avaliações)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bio */}
                            <div className="flex-1 mb-6">
                                <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
                                    {programmer.bio || 'Criador de matrizes na plataforma BordadoHub. Solicite um orçamento direto e veja o resultado de perto.'}
                                </p>
                            </div>

                            {/* Skills */}
                            {programmer.skills && programmer.skills.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Especialidades</p>
                                    <div className="flex flex-wrap gap-2">
                                        {programmer.skills.slice(0, 4).map((skill, i) => (
                                            <span key={i} className="bg-[#0F1115] border border-gray-700 text-gray-300 text-xs px-2.5 py-1 rounded-md">
                                                {skill}
                                            </span>
                                        ))}
                                        {programmer.skills.length > 4 && (
                                            <span className="bg-[#0F1115] border border-gray-800 text-gray-500 text-xs px-2 py-1 rounded-md">
                                                +{programmer.skills.length - 4}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action */}
                            <div className="mt-auto pt-4 border-t border-gray-800">
                                <Link
                                    href={`/jobs/new?programmer_id=${programmer.id}`}
                                    className="flex w-full items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    <Target className="w-4 h-4" />
                                    Contratar Diretamente
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
