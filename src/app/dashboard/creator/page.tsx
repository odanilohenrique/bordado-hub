'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import JobCard from '@/components/JobCard'
import { Search, Briefcase, Target, Zap } from 'lucide-react'

export default function CreatorDashboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [publicJobs, setPublicJobs] = useState<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [directRequests, setDirectRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            // Get current user's profile ID
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }

            const { data: profile } = await supabase
                .from('users')
                .select('id')
                .eq('supabase_user_id', user.id)
                .single()

            if (profile) {
                setCurrentUserId(profile.id)

                // Fetch Direct Requests (jobs targeting this programmer)
                const { data: directData } = await supabase
                    .from('jobs')
                    .select('*, users (name, avatar_url)')
                    .eq('direct_to_programmer_id', profile.id)
                    .eq('status', 'aberto')
                    .order('created_at', { ascending: false })

                setDirectRequests(directData || [])
            }

            // Fetch Public Open Jobs (not direct requests)
            const { data: publicData } = await supabase
                .from('jobs')
                .select('*, users (name, avatar_url)')
                .eq('status', 'aberto')
                .is('direct_to_programmer_id', null)
                .order('created_at', { ascending: false })

            setPublicJobs(publicData || [])
            setLoading(false)
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Buscando jobs disponíveis...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-10">
            {/* Direct Requests Section */}
            {directRequests.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-purple-500/20 p-2 rounded-lg">
                            <Target className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
                                Solicitações Diretas
                                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                                    {directRequests.length} {directRequests.length === 1 ? 'nova' : 'novas'}
                                </span>
                            </h2>
                            <p className="text-gray-500 text-sm">
                                Clientes que escolheram você especificamente
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {directRequests.map((job) => (
                            <div key={job.id} className="relative">
                                <div className="absolute -left-3 top-4 bottom-4 w-1 bg-purple-500 rounded-full"></div>
                                <JobCard job={job} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Public Jobs Section */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-[#FFAE00]/20 p-2 rounded-lg">
                        <Briefcase className="w-6 h-6 text-[#FFAE00]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#F3F4F6]">
                            Mural Público
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Jobs abertos para todos os programadores
                        </p>
                    </div>
                </div>

                {publicJobs.length === 0 ? (
                    <div className="bg-[#1A1D23] border border-[#FFAE00]/20 rounded-xl p-12 text-center">
                        <div className="bg-[#FFAE00]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-[#FFAE00]" />
                        </div>
                        <h3 className="text-xl font-bold text-[#F3F4F6] mb-2">
                            Nenhum job público disponível
                        </h3>
                        <p className="text-gray-400 mb-6 max-w-md mx-auto">
                            Não há jobs abertos no mural público no momento.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {publicJobs.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
