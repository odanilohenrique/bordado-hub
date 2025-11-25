'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/helpers'

export default function JobDetails({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use() or await in async component. 
    // Since this is a client component, we can use `use(params)` if React 19, or just await it?
    // In Next 15 client components, params is a promise.
    // But `use` hook is available in React 19.
    // Let's try to handle it safely.
    const [jobId, setJobId] = useState<string | null>(null)

    useEffect(() => {
        params.then(p => setJobId(p.id))
    }, [params])

    const [job, setJob] = useState<any>(null)
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [proposals, setProposals] = useState<any[]>([])
    const [myProposal, setMyProposal] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [proposalAmount, setProposalAmount] = useState('')
    const [proposalMessage, setProposalMessage] = useState('')
    const router = useRouter()

    useEffect(() => {
        if (!jobId) return

        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { data: prof } = await supabase.from('users').select('*').eq('supabase_user_id', user.id).single()
                setProfile(prof)
            }

            const { data: jobData } = await supabase.from('jobs').select('*, users(name)').eq('id', jobId).single()
            setJob(jobData)

            if (jobData) {
                // Fetch proposals
                const { data: props } = await supabase.from('proposals').select('*, users(name)').eq('job_id', jobId)
                setProposals(props || [])

                if (user) {
                    const myProp = props?.find((p: any) => p.users?.supabase_user_id === user.id || p.criador_id === (profile?.id))
                    // Wait, profile might not be set yet in this closure.
                    // Better to filter by criador_id if we have profile, or fetch specifically.
                }
            }
            setLoading(false)
        }

        fetchData()
    }, [jobId]) // We should also depend on profile but it's set inside.

    // Effect to find my proposal once profile and proposals are loaded
    useEffect(() => {
        if (profile && proposals.length > 0) {
            const my = proposals.find(p => p.criador_id === profile.id)
            setMyProposal(my)
        }
    }, [profile, proposals])

    const handleSendProposal = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile || profile.role !== 'criador') return

        const { error } = await supabase.from('proposals').insert([
            {
                job_id: jobId,
                criador_id: profile.id,
                amount: parseFloat(proposalAmount),
                message: proposalMessage,
            }
        ])

        if (error) {
            alert('Erro ao enviar proposta')
        } else {
            alert('Proposta enviada!')
            window.location.reload()
        }
    }

    const handleAcceptProposal = async (proposalId: string, amount: number) => {
        // Create transaction and redirect to payment
        // For MVP, we just create transaction and redirect to a payment page
        const { data: transaction, error } = await supabase.from('transactions').insert([
            {
                job_id: jobId,
                cliente_id: profile.id,
                criador_id: proposals.find(p => p.id === proposalId).criador_id,
                amount: amount,
                status: 'pendente'
            }
        ]).select().single()

        if (error) {
            alert('Erro ao iniciar transação: ' + error.message)
            return
        }

        // Update proposal status
        await supabase.from('proposals').update({ status: 'aceita' }).eq('id', proposalId)
        // Update job status
        await supabase.from('jobs').update({ status: 'em_progresso' }).eq('id', jobId)

        router.push(`/checkout/${transaction.id}`)
    }

    if (loading || !jobId) return <div className="p-8">Carregando...</div>
    if (!job) return <div className="p-8">Job não encontrado</div>

    return (
        <div className="max-w-4xl mx-auto bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {job.title}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Postado por {job.users?.name} em {formatDate(job.created_at)}
                </p>
                <span className="inline-flex mt-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {job.status}
                </span>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Descrição</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            {job.description}
                        </dd>
                    </div>
                    {job.deadline && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Prazo</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {formatDate(job.deadline)}
                            </dd>
                        </div>
                    )}
                </dl>
            </div>

            {/* Proposals Section */}
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Propostas</h4>

                {/* If Client */}
                {profile?.role === 'cliente' && profile.id === job.cliente_id && (
                    <div className="space-y-4">
                        {proposals.length === 0 ? (
                            <p className="text-gray-500">Nenhuma proposta recebida ainda.</p>
                        ) : (
                            proposals.map(prop => (
                                <div key={prop.id} className="border rounded-md p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{prop.users?.name}</p>
                                        <p className="text-gray-600">{prop.message}</p>
                                        <p className="text-indigo-600 font-bold">{formatCurrency(prop.amount)}</p>
                                    </div>
                                    {job.status === 'aberto' && (
                                        <button
                                            onClick={() => handleAcceptProposal(prop.id, prop.amount)}
                                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                        >
                                            Aceitar
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* If Creator */}
                {profile?.role === 'criador' && (
                    <div>
                        {myProposal ? (
                            <div className="bg-gray-50 p-4 rounded-md">
                                <p className="font-medium">Sua Proposta:</p>
                                <p>{myProposal.message}</p>
                                <p className="font-bold">{formatCurrency(myProposal.amount)}</p>
                                <p className="text-sm text-gray-500 mt-2">Status: {myProposal.status}</p>
                            </div>
                        ) : job.status === 'aberto' ? (
                            <form onSubmit={handleSendProposal} className="space-y-4 bg-gray-50 p-4 rounded-md">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={proposalAmount}
                                        onChange={e => setProposalAmount(e.target.value)}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mensagem</label>
                                    <textarea
                                        required
                                        value={proposalMessage}
                                        onChange={e => setProposalMessage(e.target.value)}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                                    />
                                </div>
                                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                                    Enviar Proposta
                                </button>
                            </form>
                        ) : (
                            <p className="text-gray-500">Este job não está mais aceitando propostas.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
