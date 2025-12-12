'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'

export default function JobsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')

    useEffect(() => {
        async function fetchJobs() {
            let query = supabase.from('jobs').select('*').order('created_at', { ascending: false })

            if (filter !== 'all') {
                query = query.eq('status', filter)
            }

            const { data } = await query
            setJobs(data || [])
            setLoading(false)
        }

        fetchJobs()
    }, [filter])

    return (
        <div className="min-h-screen bg-[#0F1115] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#F3F4F6]">Mural de Pedidos</h1>
                        <p className="text-gray-400 mt-1">Encontre projetos de bordado para trabalhar</p>
                    </div>

                    <div className="flex p-1 bg-[#1A1D23] rounded-lg border border-[#FFAE00]/20">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'all'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-lg shadow-[#FFAE00]/20'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilter('aberto')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'aberto'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-lg shadow-[#FFAE00]/20'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Abertos
                        </button>
                        <button
                            onClick={() => setFilter('em_progresso')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'em_progresso'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-lg shadow-[#FFAE00]/20'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Em Progresso
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-20 bg-[#1A1D23] rounded-xl border border-[#FFAE00]/10">
                        <p className="text-gray-400 text-lg">Nenhum job encontrado com este filtro.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {jobs.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
