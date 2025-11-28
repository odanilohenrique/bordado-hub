'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/helpers'
import Link from 'next/link'

interface Job {
    id: string
    title: string
    description: string
    image_urls: string[]
    formats: string[]
    fabric_type: string
    urgency: string
    status: string
    created_at: string
}

interface Proposal {
    id: string
    amount: number
    message: string
    deadline_text: string
    status: string
    created_at: string
    criador_id: string
}

import { useParams } from 'next/navigation'

export default function JobDetail() {
    const params = useParams()
    const id = params?.id as string

    if (!id) return <div>Carregando...</div>

    return <JobDetailClient jobId={id} />
}

function JobDetailClient({ jobId }: { jobId: string }) {
    const [job, setJob] = useState<Job | null>(null)
    const [proposals, setProposals] = useState<Proposal[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [isCreator, setIsCreator] = useState(false)
    const [loading, setLoading] = useState(true)

    // Proposal form
    const [amount, setAmount] = useState('')
    const [message, setMessage] = useState('')
    const [deadline, setDeadline] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const router = useRouter()

    useEffect(() => {
        async function loadData() {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Get user profile
            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('supabase_user_id', user.id)
                .single()

            setCurrentUser(profile)
            setIsCreator(profile?.role === 'criador')

            // Get job details
            const { data: jobData } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', jobId)
                .single()

            setJob(jobData)

            // Get proposals
            const { data: proposalsData } = await supabase
                .from('proposals')
                .select('*')
                .eq('job_id', jobId)
                .order('created_at', { ascending: false })

            setProposals(proposalsData || [])
            setLoading(false)
        }

        loadData()
    }, [jobId, router])

    const handleSubmitProposal = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const { error } = await supabase
                .from('proposals')
                .insert([{
                    job_id: jobId,
                    criador_id: currentUser.id,
                    amount: parseFloat(amount),
                    message,
                    deadline_text: deadline,
                    status: 'pendente'
                }])

            if (error) throw error

            alert('Proposta enviada com sucesso!')
            router.refresh()
            window.location.reload()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            alert('Erro ao enviar proposta: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleAcceptProposal = async (proposalId: string) => {
        if (!confirm('Aceitar esta proposta e ir para o pagamento?')) return

        try {
            // Update proposal status
            await supabase
                .from('proposals')
                .update({ status: 'aceita' })
                .eq('id', proposalId)

            // Update job status
            await supabase
                .from('jobs')
                .update({ status: 'em_progresso' })
                .eq('id', jobId)

            router.push(`/checkout/${proposalId}`)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            alert('Erro: ' + err.message)
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>
    if (!job) return <div className="p-8">Job não encontrado</div>

    const urgencyLabels: Record<string, string> = {
        'urgente': '🔥 Urgente',
        'prazo_curto': '⏱️ Prazo Curto',
        'sem_pressa': '✅ Sem Pressa'
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Link href="/dashboard" className="text-indigo-600 hover:underline mb-4 inline-block">
                ← Voltar
            </Link>

            <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold mb-4">{job.title}</h1>

                <div className="flex gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {urgencyLabels[job.urgency] || job.urgency}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                        {job.status}
                    </span>
                </div>

                {/* Image Gallery */}
                {job.image_urls && job.image_urls.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-semibold mb-2">Imagens de Referência:</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {job.image_urls.map((url, idx) => (
                                <img
                                    key={idx}
                                    src={url}
                                    alt={`Ref ${idx + 1}`}
                                    className="w-full h-48 object-cover rounded-lg border"
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold">Descrição:</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                    </div>

                    {job.formats && job.formats.length > 0 && (
                        <div>
                            <h3 className="font-semibold">Formatos Desejados:</h3>
                            <div className="flex gap-2 flex-wrap">
                                {job.formats.map((fmt, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-sm">
                                        {fmt}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {job.fabric_type && (
                        <div>
                            <h3 className="font-semibold">Tipo de Tecido:</h3>
                            <p className="text-gray-700">{job.fabric_type}</p>
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold">Criado em:</h3>
                        <p className="text-gray-700">{formatDate(job.created_at)}</p>
                    </div>
                </div>
            </div>

            {/* Proposals Section */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Propostas</h2>

                {isCreator && job.status === 'aberto' && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4">Enviar Proposta</h3>
                        <form onSubmit={handleSubmitProposal} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                    placeholder="150.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Prazo de Entrega</label>
                                <input
                                    type="text"
                                    required
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                    placeholder="Ex: 3 dias úteis"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mensagem</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                    placeholder="Descreva sua experiência e como vai realizar o trabalho..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {submitting ? 'Enviando...' : 'Enviar Proposta'}
                            </button>
                        </form>
                    </div>
                )}

                {/* List of Proposals */}
                <div className="space-y-4">
                    {proposals.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                            Nenhuma proposta ainda
                        </div>
                    ) : (
                        proposals.map(proposal => (
                            <div key={proposal.id} className="bg-white rounded-lg shadow p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-2xl font-bold text-indigo-600">
                                            R$ {proposal.amount.toFixed(2)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Prazo: {proposal.deadline_text}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm ${proposal.status === 'aceita'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {proposal.status}
                                    </span>
                                </div>

                                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{proposal.message}</p>

                                {!isCreator && proposal.status === 'pendente' && (
                                    <button
                                        onClick={() => handleAcceptProposal(proposal.id)}
                                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                                    >
                                        Fechado 🤝
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
