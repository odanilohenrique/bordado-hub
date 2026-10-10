'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Star, Package, ArrowRight, User } from 'lucide-react'

export default function CreatorsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [creators, setCreators] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchCreators() {
            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'criador')
                .order('created_at', { ascending: false })

            setCreators(data || [])
            setLoading(false)
        }

        fetchCreators()
    }, [])

    return (
        <div className="min-h-screen bg-[#0B0D11] py-12 px-4 sm:px-6 lg:px-8 text-slate-100">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
                        Encontrar Programadores
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
                        Profissionais qualificados prontos para transformar sua arte em matrizes perfeitas.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-[#F5A623]/30 border-t-[#F5A623] rounded-full animate-spin" />
                    </div>
                ) : creators.length === 0 ? (
                    <div className="text-center py-20 bg-[#12151C] rounded-2xl border border-white/[0.07]">
                        <p className="text-gray-400 text-sm">Nenhum programador encontrado.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {creators.map((creator) => (
                            <div key={creator.id} className="group bg-[#12151C] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-[#F5A623]/40 hover:shadow-xl hover:shadow-[#F5A623]/5 transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="relative shrink-0">
                                            {creator.avatar_url ? (
                                                <img
                                                    src={creator.avatar_url}
                                                    alt={creator.name}
                                                    className="w-14 h-14 rounded-full object-cover border border-white/10 group-hover:border-[#F5A623] transition-colors"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-[#181C26] border border-white/10 flex items-center justify-center text-gray-400">
                                                    <User className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-lg font-bold text-white group-hover:text-[#F5A623] transition-colors truncate">
                                                {creator.name}
                                            </h3>
                                            <p className="text-xs text-gray-400">Programador de Matrizes</p>
                                        </div>
                                    </div>

                                    {creator.bio && (
                                        <p className="text-gray-400 text-xs sm:text-sm mb-6 line-clamp-3 leading-relaxed">
                                            {creator.bio}
                                        </p>
                                    )}

                                    <div className="pt-4 border-t border-white/[0.07] flex items-center justify-between">
                                        <div className="flex gap-4 text-xs text-gray-400">
                                            {creator.reviews_count && creator.reviews_count > 0 && creator.rating ? (
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-3.5 h-3.5 text-[#F5A623] fill-[#F5A623]" />
                                                    <span className="text-white font-bold">{creator.rating.toFixed(1)}</span>
                                                    <span className="text-gray-500 text-[10px]">({creator.reviews_count})</span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-gray-500 font-medium">Novo programador</span>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <Package className="w-3.5 h-3.5 text-gray-500" />
                                                <span>{creator.matrices_count || 0} matrizes</span>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/profile/${creator.id}`}
                                            className="text-[#F5A623] text-xs font-bold hover:underline inline-flex items-center gap-1"
                                        >
                                            Ver Perfil
                                            <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
