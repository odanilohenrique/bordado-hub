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
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Todos os Jobs</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('aberto')}
                        className={`px-4 py-2 rounded-md ${filter === 'aberto' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
                    >
                        Abertos
                    </button>
                    <button
                        onClick={() => setFilter('em_progresso')}
                        className={`px-4 py-2 rounded-md ${filter === 'em_progresso' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
                    >
                        Em Progresso
                    </button>
                </div>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : jobs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Nenhum job encontrado.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {jobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                    ))}
                </div>
            )}
        </div>
    )
}
