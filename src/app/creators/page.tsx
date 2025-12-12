'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

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
        <div className="min-h-screen bg-[#0F1115] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-[#F3F4F6] mb-4">
                        Encontrar Programadores
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Explore nosso time de elite. Profissionais qualificados prontos para transformar sua arte em matrizes perfeitas.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
                    </div>
                ) : creators.length === 0 ? (
                    <div className="text-center py-20 bg-[#1A1D23] rounded-xl border border-[#FFAE00]/10">
                        <p className="text-gray-400 text-lg">Nenhum programador encontrado.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {creators.map((creator) => (
                            <div key={creator.id} className="group bg-[#1A1D23] border border-[#FFAE00]/10 rounded-xl overflow-hidden hover:border-[#FFAE00]/50 hover:shadow-lg hover:shadow-[#FFAE00]/10 transition-all duration-300 transform hover:-translate-y-1">
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="relative">
                                            {/* Avatar Area */}
                                            {creator.avatar_url ? (
                                                <img
                                                    src={creator.avatar_url}
                                                    alt={creator.name}
                                                    className="w-16 h-16 rounded-full object-cover border-2 border-[#FFAE00]/20 group-hover:border-[#FFAE00]"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-[#0F1115] border-2 border-[#FFAE00]/20 flex items-center justify-center text-[#FFAE00] font-bold text-xl group-hover:border-[#FFAE00]">
                                                    {creator.name?.charAt(0) || 'P'}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[#F3F4F6] group-hover:text-[#FFAE00] transition-colors">
                                                {creator.name}
                                            </h3>
                                            <p className="text-sm text-gray-500">Programador</p>
                                        </div>
                                    </div>

                                    {creator.bio && (
                                        <p className="text-gray-400 text-sm mb-6 line-clamp-3">
                                            {creator.bio}
                                        </p>
                                    )}

                                    <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
                                        <div className="flex gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[#FFAE00]">★</span>
                                                <span className="text-[#F3F4F6] font-medium">{creator.rating?.toFixed(1) || '5.0'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span>📦</span>
                                                <span>{creator.matrices_count || 0} matrizes</span>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/profile/${creator.id}`}
                                            className="text-[#FFAE00] text-sm font-bold hover:underline flex items-center gap-1"
                                        >
                                            Ver Perfil
                                            <span className="text-lg">→</span>
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
