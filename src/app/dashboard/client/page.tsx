'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function ClientDashboard() {
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchJobs() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('users')
                .select('id')
                .eq('supabase_user_id', user.id)
                .single()

            if (profile) {
                const { data: jobsData } = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('cliente_id', profile.id)
                    .order('created_at', { ascending: false })

                setJobs(jobsData || [])
            }
            setLoading(false)
        }

        fetchJobs()
    }, [])

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Meus Pedidos</h1>
                <Link
                    href="/jobs/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Novo Pedido
                </Link>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : jobs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Você ainda não tem nenhum pedido.</p>
                    <Link href="/jobs/new" className="text-indigo-600 hover:text-indigo-500 mt-2 inline-block">
                        Criar meu primeiro pedido
                    </Link>
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
