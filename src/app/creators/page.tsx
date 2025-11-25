'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function CreatorsPage() {
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
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Criadores de Matrizes</h1>

            {loading ? (
                <p>Carregando...</p>
            ) : creators.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Nenhum criador cadastrado ainda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {creators.map((creator) => (
                        <div key={creator.id} className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    {creator.name}
                                </h3>
                                {creator.bio && (
                                    <p className="mt-2 text-sm text-gray-500 line-clamp-3">
                                        {creator.bio}
                                    </p>
                                )}
                                <div className="mt-4">
                                    <Link
                                        href={`/creators/${creator.id}`}
                                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                    >
                                        Ver Perfil &rarr;
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
