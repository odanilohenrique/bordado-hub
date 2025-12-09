'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'
import { Search, Briefcase } from 'lucide-react'

export default function CreatorDashboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#F3F4F6]">Jobs Disponíveis</h2>
                <p className="text-gray-400 text-sm mt-1">
                    Encontre oportunidades e faça propostas para clientes
                </p>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Buscando jobs disponíveis...</p>
                    </div>
                </div>
            ) : jobs.length === 0 ? (
                <div className="bg-[#1A1D23] border border-[#FFAE00]/20 rounded-xl p-12 text-center">
                    <div className="bg-[#FFAE00]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-[#FFAE00]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#F3F4F6] mb-2">
                        Nenhum job disponível no momento
                    </h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Não há jobs abertos no momento. Volte em breve para encontrar novas oportunidades!
                    </p>
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                        <Briefcase className="w-4 h-4" />
                        <span>Novos jobs aparecem aqui automaticamente</span>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {jobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                    ))}
                </div>
            )}
        </div>
    )
}
