'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'
import Link from 'next/link'
import { Plus, Inbox } from 'lucide-react'

export default function ClientDashboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                    .select('*, proposals(status)')
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-[#F3F4F6]">Meus Pedidos</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Acompanhe o status dos seus pedidos de matrizes
                    </p>
                </div>
                <Link
                    href="/jobs/new"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FFAE00] text-[#0F1115] rounded-lg hover:bg-[#D97706] transition-all font-bold shadow-lg shadow-[#FFAE00]/20"
                >
                    <Plus className="w-5 h-5" />
                    Novo Pedido
                </Link>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Carregando pedidos...</p>
                    </div>
                </div>
            ) : jobs.length === 0 ? (
                <div className="bg-[#1A1D23] border border-[#FFAE00]/20 rounded-xl p-12 text-center">
                    <div className="bg-[#FFAE00]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Inbox className="w-10 h-10 text-[#FFAE00]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#F3F4F6] mb-2">
                        Nenhum pedido ainda
                    </h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Você ainda não criou nenhum pedido de matriz. Comece agora e receba propostas de programadores profissionais!
                    </p>
                    <Link
                        href="/jobs/new"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFAE00] text-[#0F1115] rounded-lg hover:bg-[#D97706] transition-all font-bold shadow-lg shadow-[#FFAE00]/20"
                    >
                        <Plus className="w-5 h-5" />
                        Criar Primeiro Pedido
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {jobs.map((job) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            hasNegotiation={job.proposals?.some((p: any) => p.status === 'contraproposta')}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
