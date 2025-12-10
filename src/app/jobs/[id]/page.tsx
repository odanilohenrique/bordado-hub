'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter }
import 'next/navigation'
import { formatDate } from '@/lib/helpers'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, MessageSquare, AlertCircle, CheckCircle, Package, Zap } from 'lucide-react'
import { useParams } from 'next/navigation'

interface Job {
    id: string
    cliente_id: string // Added for owner check
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

export default function JobDetail() {
    const params = useParams()
    const id = params?.id as string

    if (!id) return (
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
        </div>
    )

    return <JobDetailClient jobId={id} />
}

function JobDetailClient({ jobId }: { jobId: string }) {
    const [job, setJob] = useState<Job | null>(null)
    const [proposals, setProposals] = useState<Proposal[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentUser, setCurrentUser] = useState<any>(null)
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

            // Get job details
            const { data: jobData } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', jobId)
                .single()

            setJob(jobData)
            setCurrentUser(profile)

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

    if (loading) return (
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
        </div>
    )

    if (!job) return (
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center text-[#F3F4F6]">
            Job não encontrado
        </div>
    )

    const isOwner = currentUser?.id === job.cliente_id
    const showProposalForm = !isOwner && job.status === 'aberto'

    const urgencyLabels: Record<string, string> = {
        'urgente': '🔥 Urgente',
        'prazo_curto': '⏱️ Prazo Curto',
        'sem_pressa': '✅ Sem Pressa'
    }

    return (
        <div className="min-h-screen bg-[#0F1115] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-[#FFAE00] mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para Dashboard
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Job Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[#1A1D23] border border-[#FFAE00]/20 rounded-xl p-6 shadow-xl">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <h1 className="text-3xl font-bold text-[#F3F4F6]">{job.title}</h1>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="px-3 py-1 bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/20 rounded-full text-sm font-medium">
                                        {job.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                    {isOwner && (
                                        <span className="text-xs text-gray-500 bg-black/30 px-2 py-1 rounded">
                                            Você é o dono deste pedido
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex gap-3 mb-6">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F1115] border border-gray-700 rounded-lg text-sm text-gray-300">
                                    <Clock className="w-4 h-4 text-[#FFAE00]" />
                                    {urgencyLabels[job.urgency] || job.urgency}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F1115] border border-gray-700 rounded-lg text-sm text-gray-300">
                                    <Package className="w-4 h-4 text-[#FFAE00]" />
                                    {job.fabric_type || 'Tecido não especificado'}
                                </span>
                            </div>

                            {/* Description */}
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Descrição</h3>
                                <div className="bg-[#0F1115] rounded-lg p-4 border border-gray-800">
                                    <p className="text-[#F3F4F6] whitespace-pre-wrap leading-relaxed">
                                        {job.description}
                                    </p>
                                </div>
                            </div>

                            {/* Formats */}
                            {job.formats && job.formats.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Formatos</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {job.formats.map((fmt, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-[#0F1115] border border-[#FFAE00]/20 text-[#FFAE00] rounded-lg text-sm font-medium">
                                                {fmt}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Images */}
                            {job.image_urls && job.image_urls.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Referências Visuais</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {job.image_urls.map((url, idx) => (
                                            <div key={idx} className="relative aspect-video group rounded-lg overflow-hidden border border-gray-800">
                                                <img
                                                    src={url}
                                                    alt={`Ref ${idx + 1}`}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-gray-800 flex items-center gap-2 text-sm text-gray-500">
                                <Calendar className="w-4 h-4" />
                                Criado em {formatDate(job.created_at)}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Proposals */}
                    <div className="space-y-6">
                        <div className="bg-[#1A1D23] border border-[#FFAE00]/20 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-[#F3F4F6] mb-6 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-[#FFAE00]" />
                                Propostas
                            </h2>

                            {showProposalForm && (
                                <div className="mb-8 bg-[#0F1115] p-4 rounded-lg border border-gray-800">
                                    <h3 className="text-sm font-medium text-[#F3F4F6] mb-4">Enviar Nova Proposta</h3>
                                    <form onSubmit={handleSubmitProposal} className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Valor (R$)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={amount}
                                                onChange={e => setAmount(e.target.value)}
                                                className="w-full bg-[#1A1D23] border border-[#FFAE00]/20 rounded-lg px-3 py-2 text-[#F3F4F6] focus:ring-1 focus:ring-[#FFAE00] outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Prazo</label>
                                            <input
                                                type="text"
                                                required
                                                value={deadline}
                                                onChange={e => setDeadline(e.target.value)}
                                                className="w-full bg-[#1A1D23] border border-[#FFAE00]/20 rounded-lg px-3 py-2 text-[#F3F4F6] focus:ring-1 focus:ring-[#FFAE00] outline-none"
                                                placeholder="Ex: 2 dias"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Mensagem</label>
                                            <textarea
                                                required
                                                rows={3}
                                                value={message}
                                                onChange={e => setMessage(e.target.value)}
                                                className="w-full bg-[#1A1D23] border border-[#FFAE00]/20 rounded-lg px-3 py-2 text-[#F3F4F6] focus:ring-1 focus:ring-[#FFAE00] outline-none text-sm"
                                                placeholder="Detalhes da proposta..."
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full bg-[#FFAE00] text-[#0F1115] font-bold py-2.5 rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-50"
                                        >
                                            {submitting ? 'Enviando...' : 'Enviar Proposta'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div className="space-y-4">
                                {proposals.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Nenhuma proposta ainda</p>
                                    </div>
                                ) : (
                                    proposals.map(proposal => (
                                        <div key={proposal.id} className="bg-[#0F1115] rounded-lg border border-gray-800 p-4 hover:border-[#FFAE00]/30 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-xl font-bold text-[#FFAE00]">
                                                        R$ {proposal.amount.toFixed(2)}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        Prazo: {proposal.deadline_text}
                                                    </p>
                                                </div>
                                                {proposal.status === 'aceita' && (
                                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Aceita
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-gray-300 mb-4 whitespace-pre-wrap border-l-2 border-gray-700 pl-3">
                                                {proposal.message}
                                            </p>

                                            {isOwner && proposal.status === 'pendente' && (
                                                <button
                                                    onClick={() => handleAcceptProposal(proposal.id)}
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Zap className="w-4 h-4" />
                                                    Aceitar & Pagar
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
