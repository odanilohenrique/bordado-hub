'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'

export default function CreatorDashboard() {
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchJobs() {
            // Fetch all open jobs
            const { data: jobsData } = await supabase
                .from('jobs')
                .select('*')
                .eq('status', 'aberto')
                .order('created_at', { ascending: false })

            setJobs(jobsData || [])
            setLoading(false)
        }

        fetchJobs()
    }, [])

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Jobs Disponíveis</h1>

            {loading ? (
                <p>Carregando...</p>
            ) : jobs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Não há jobs abertos no momento.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {jobs.map((job) => (
                        <JobCard key={job.id} job={job} isCreator />
                    ))}
                </div>
            )}
        </div>
    )
}
