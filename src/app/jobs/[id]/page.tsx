'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/helpers'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, MessageSquare, AlertCircle, CheckCircle, Package, Zap, User, X, Star, PenTool, Download, Upload, Send, Sparkles } from 'lucide-react'
import { useParams } from 'next/navigation'
import NegotiationChat from '@/components/NegotiationChat'

interface Job {
    id: string
    cliente_id: string
    title: string
    description: string
    image_urls: string[]
    formats: string[]
    fabric_type: string
    urgency: string
    status: string
    created_at: string
    delivery_url?: string
    delivery_notes?: string
    delivered_at?: string
}

interface Proposal {
    id: string
    amount: number
    message: string
    deadline_text: string
    status: string
    created_at: string
    criador_id: string
    counter_amount?: number
    counter_message?: string
    users?: {
        id: string
        name: string
        avatar_url: string
        rating: number
    }
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

    // Negotiation state
    const [negotiatingProposalId, setNegotiatingProposalId] = useState<string | null>(null)
    const [counterAmount, setCounterAmount] = useState('')
    const [counterMessage, setCounterMessage] = useState('')

    // Delivery & Review form state
    const [deliveryNotes, setDeliveryNotes] = useState('')
    const [delivering, setDelivering] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    const [ratingMatrix, setRatingMatrix] = useState(5)
    const [ratingService, setRatingService] = useState(5)
    const [reviewComment, setReviewComment] = useState('')

    const router = useRouter()

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('supabase_user_id', user.id)
                .single()

            const { data: jobData } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', jobId)
                .single()

            setJob(jobData)
            setCurrentUser(profile)

            const { data: proposalsData, error: proposalsError } = await supabase
                .from('proposals')
                .select(`
                    *,
                    users:criador_id (
                        id,
                        name,
                        avatar_url,
                        rating
                    )
                `)
                .eq('job_id', jobId)
                .order('created_at', { ascending: false })

            if (proposalsError) {
                console.error('Error loading proposals:', proposalsError)
            }

            setProposals(proposalsData || [])
            setLoading(false)
        }

        loadData()
    }, [jobId, router])

    const acceptedProposal = proposals.find((p: any) => p.status === 'aceita')

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
        } catch (err: any) {
            alert('Erro ao enviar proposta: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmitDelivery = async () => {
        if (!selectedFile) return
        setDelivering(true)
        try {
            const fileExt = selectedFile.name.split('.').pop()
            const fileName = `${jobId}_${Math.random()}.${fileExt}`
            const filePath = `deliveries/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('job-deliveries')
                .upload(filePath, selectedFile)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('job-deliveries')
                .getPublicUrl(filePath)

            await handleDeliverMatrix(deliveryNotes, publicUrl)
        } catch (err: any) {
            alert('Erro no upload: ' + err.message)
            setDelivering(false)
        }
    }

    const handleDeliverMatrix = async (deliveryNotes: string, fileUrl: string) => {
        try {
            const { error } = await supabase
                .from('jobs')
                .update({
                    status: 'entregue',
                    delivery_url: fileUrl,
                    delivery_notes: deliveryNotes,
                    delivered_at: new Date().toISOString()
                })
                .eq('id', jobId)

            if (error) throw error
            setShowSuccessModal(true)
        } catch (err: any) {
            alert('Erro ao entregar: ' + err.message)
            setDelivering(false)
        }
    }

    const handleSubmitReview = async (mRating: number, sRating: number, comment: string) => {
        if (!acceptedProposal) return

        try {
            const { error: reviewError } = await supabase
                .from('reviews')
                .insert([{
                    job_id: jobId,
                    reviewer_id: currentUser.id,
                    reviewee_id: acceptedProposal.criador_id,
                    rating_matrix: mRating,
                    rating_service: sRating,
                    comment,
                    rating: Math.round((mRating + sRating) / 2)
                }])

            if (reviewError) throw reviewError

            const { error: jobError } = await supabase
                .from('jobs')
                .update({ status: 'finalizado' })
                .eq('id', jobId)

            if (jobError) throw jobError

            alert('Avaliação enviada! Projeto finalizado.')
            window.location.reload()
        } catch (err: any) {
            alert('Erro ao avaliar: ' + err.message)
        }
    }

    const handleNegotiate = (proposalId: string) => {
        if (negotiatingProposalId === proposalId) {
            setNegotiatingProposalId(null)
        } else {
            setNegotiatingProposalId(proposalId)
        }
    }

    const submitCounterProposal = async () => {
        if (!negotiatingProposalId) return

        try {
            const { error } = await supabase
                .from('proposals')
                .update({
                    status: 'contraproposta',
                    counter_amount: parseFloat(counterAmount),
                    counter_message: counterMessage
                })
                .eq('id', negotiatingProposalId)

            if (error) throw error

            alert('Contraproposta enviada!')
            setNegotiatingProposalId(null)
            router.refresh()
            window.location.reload()
        } catch (err: any) {
            alert('Erro: ' + err.message)
        }
    }

    const handleProgrammerResponse = async (proposalId: string, action: 'accept_counter' | 'reject_counter', proposal: Proposal) => {
        try {
            if (action === 'accept_counter') {
                const { error } = await supabase
                    .from('proposals')
                    .update({
                        amount: proposal.counter_amount,
                        message: `${proposal.message}\n\n[Atualização: Aceitei sua oferta de R$ ${proposal.counter_amount}]`,
                        status: 'pendente',
                        counter_amount: null,
                        counter_message: null
                    })
                    .eq('id', proposalId)

                if (error) throw error
                alert('Oferta aceita! O valor foi atualizado. Aguarde o pagamento do cliente.')
            } else {
                const { error } = await supabase
                    .from('proposals')
                    .update({
                        status: 'pendente',
                        counter_amount: null,
                        counter_message: null
                    })
                    .eq('id', proposalId)

                if (error) throw error
                alert('Contraproposta recusada.')
            }
            router.refresh()
            window.location.reload()
        } catch (err: any) {
            alert('Erro: ' + err.message)
        }
    }

    const handleAcceptProposal = async (proposalId: string) => {
        if (!confirm('Aceitar esta proposta e ir para o pagamento?')) return

        try {
            await supabase
                .from('proposals')
                .update({ status: 'aceita' })
                .eq('id', proposalId)

            await supabase
                .from('jobs')
                .update({ status: 'em_progresso' })
                .eq('id', jobId)

            router.push(`/checkout/${proposalId}`)
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
        <div className="min-h-screen bg-[#0F1115] py-4 px-4 sm:px-6 lg:px-8 text-gray-100">
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <Link
                    href="/pedidos"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-[#FFAE00] transition-colors text-xs font-bold uppercase tracking-wider"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Voltar
                </Link>

                {/* 1. TOP SECTION: Job Detail */}
                <div className="bg-[#1A1D23] border border-white/5 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex flex-col md:flex-row">
                        {/* Image Left */}
                        {job.image_urls && job.image_urls.length > 0 && (
                            <div className="w-full md:w-1/3 min-h-[200px] bg-black/40 border-r border-white/5 relative">
                                {job.image_urls[0].toLowerCase().includes('.pdf') ? (
                                    <iframe src={`${job.image_urls[0]}#toolbar=0&navpanes=0&scrollbar=0`} className="absolute inset-0 w-full h-full" />
                                ) : (
                                    <img src={job.image_urls[0]} alt="Referência" className="absolute inset-0 w-full h-full object-contain p-4" />
                                )}
                            </div>
                        )}
                        {/* Info Right */}
                        <div className="w-full md:flex-1 p-6 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h1 className="text-2xl font-bold text-[#F3F4F6]">{job.title}</h1>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/20 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                            {job.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 mb-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0F1115] border border-gray-800 rounded-md text-xs text-gray-300">
                                        <Clock className="w-3 h-3 text-[#FFAE00]" />
                                        {urgencyLabels[job.urgency] || job.urgency}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0F1115] border border-gray-800 rounded-md text-xs text-gray-300">
                                        <Package className="w-3 h-3 text-[#FFAE00]" />
                                        {job.fabric_type || 'N/A'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed mb-4">
                                    {job.description}
                                </p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-800/50">
                                <div className="flex gap-2 flex-wrap">
                                    {job.formats?.map((fmt, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-[#0F1115] border border-[#FFAE00]/20 text-[#FFAE00] rounded text-[10px] uppercase font-bold">
                                            {fmt}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-[10px] text-gray-500 flex items-center gap-1 uppercase tracking-wider font-bold">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(job.created_at)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. MIDDLE SECTION: Proposals OR Production Hero OR Delivery */}
                {job.status === 'em_progresso' && acceptedProposal ? (
                    <div className="bg-[#1A1D23] border border-[#FFAE00]/30 rounded-xl p-8 shadow-[0_0_40px_rgba(255,174,0,0.15)] relative overflow-hidden flex flex-col items-center justify-center min-h-[320px] text-center mb-8">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#FFAE00]/5 rounded-full blur-3xl"></div>
                        
                        <div className="relative z-10 mb-6 mt-2">
                            <div className="w-28 h-28 relative flex items-center justify-center mx-auto">
                                <svg className="absolute inset-0 w-full h-full text-[#FFAE00] animate-[spin_12s_linear_infinite] opacity-30" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" strokeLinecap="round" />
                                </svg>
                                <div className="bg-[#0F1115] w-14 h-14 rounded-full border border-[#FFAE00]/40 z-10 shadow-[0_0_25px_rgba(255,174,0,0.25)] flex items-center justify-center">
                                    <PenTool className="w-6 h-6 text-[#FFAE00] animate-pulse" style={{ animationDuration: '2.5s' }} />
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 max-w-lg mx-auto">
                            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Matriz em Produção</h2>
                            <p className="text-gray-400 text-sm leading-relaxed px-4">
                                Aguarde... O profissional <strong className="text-[#FFAE00] text-base">{acceptedProposal.users?.name || 'Parceiro'}</strong> está criando sua matriz da melhor maneira possível.
                            </p>
                            <div className="mt-6 flex items-center justify-center gap-4">
                                <span className="inline-flex items-center gap-2 bg-[#FFAE00]/10 text-[#FFAE00] px-4 py-2 rounded-full text-xs font-bold border border-[#FFAE00]/20">
                                    <span className="w-2 h-2 bg-[#FFAE00] rounded-full animate-pulse"></span>
                                    TRABALHO EM ANDAMENTO
                                </span>
                                
                                <button 
                                    onClick={() => handleNegotiate(acceptedProposal.id)}
                                    className="inline-flex items-center gap-2 bg-[#1A1D23] hover:bg-white/5 text-gray-300 px-4 py-2 rounded-full text-xs font-bold border border-white/10 transition-colors"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {negotiatingProposalId === acceptedProposal.id ? 'Fechar Chat' : 'Chat / Histórico'}
                                </button>
                            </div>

                            {/* DELIVERY SECTION (Programmer Only) */}
                            {!isOwner && currentUser?.id === acceptedProposal.criador_id && (
                                <div className="mt-8 pt-8 border-t border-white/10 w-full max-w-lg mx-auto text-left relative z-10">
                                    <div className="bg-[#0F1115] p-6 rounded-xl border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="bg-green-500/20 p-2 rounded-lg">
                                                <Package className="w-5 h-5 text-green-400" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white">Entregar Matriz</h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notas da Entrega</label>
                                                <textarea 
                                                    value={deliveryNotes}
                                                    onChange={e => setDeliveryNotes(e.target.value)}
                                                    placeholder="Ex: Segue a matriz nos formatos solicitados. Ajustei o ponto para o tecido mencionado."
                                                    className="w-full bg-[#1A1D23] border border-white/10 rounded-lg p-3 text-sm text-gray-300 focus:border-green-500/50 transition-colors min-h-[100px]"
                                                />
                                            </div>
                                            
                                            <div className="relative">
                                                <input 
                                                    type="file" 
                                                    id="matrix-upload"
                                                    className="hidden" 
                                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                    disabled={delivering}
                                                />
                                                <label 
                                                    htmlFor="matrix-upload"
                                                    className={`flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-8 cursor-pointer hover:border-green-500/50 hover:bg-green-500/5 transition-all ${delivering ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {selectedFile ? (
                                                        <>
                                                            <Upload className="w-8 h-8 text-green-400 mb-2" />
                                                            <p className="text-sm text-green-400 font-bold text-center">Arquivo selecionado:</p>
                                                            <p className="text-xs text-gray-300 mt-1 truncate max-w-[250px]">{selectedFile.name}</p>
                                                            <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-bold">Clique para alterar</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-8 h-8 text-green-400 mb-2" />
                                                            <p className="text-sm text-gray-300 font-bold text-center">Clique para selecionar a matriz finalizada</p>
                                                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">Todos os formatos serão aceitos</p>
                                                        </>
                                                    )}
                                                </label>
                                            </div>

                                            {selectedFile && (
                                                <div className="mt-4 flex justify-end">
                                                    <button 
                                                        onClick={handleSubmitDelivery}
                                                        disabled={delivering}
                                                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                                                    >
                                                        {delivering ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                Enviando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Send className="w-4 h-4" />
                                                                Enviar Matriz
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : job.status === 'entregue' ? (
                    <div className="bg-[#1A1D23] border border-green-500/30 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.1)] mb-8">
                        <div className="flex flex-col lg:flex-row">
                            <div className="flex-1 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-white/5">
                                <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                                    <CheckCircle className="w-3 h-3" /> Matriz Entregue
                                </div>
                                <h2 className="text-3xl font-black text-white mb-4">Sua matriz está pronta! 🚀</h2>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    O programador <strong className="text-white">{acceptedProposal?.users?.name}</strong> finalizou o trabalho. Baixe os arquivos abaixo e, se estiver tudo certo, faça a avaliação para liberar o projeto.
                                </p>
                                
                                {job.delivery_notes && (
                                    <div className="bg-[#0F1115] p-4 rounded-xl border border-white/5 mb-6 italic text-sm text-gray-400">
                                        "{job.delivery_notes}"
                                    </div>
                                )}

                                <a 
                                    href={job.delivery_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95"
                                >
                                    <Download className="w-5 h-5" />
                                    Baixar Matriz Finalizada
                                </a>
                            </div>

                            {isOwner && (
                                <div className="w-full lg:w-[450px] bg-green-500/5 p-8 lg:p-10 flex flex-col justify-center">
                                    <h3 className="text-xl font-bold text-white mb-6">Avalie o Trabalho</h3>
                                    
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Qualidade da Matriz</p>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button key={star} onClick={() => setRatingMatrix(star)} className="transition-transform active:scale-90">
                                                        <Star className={`w-8 h-8 ${star <= ratingMatrix ? 'fill-[#FFAE00] text-[#FFAE00]' : 'text-gray-700'}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Atendimento / Prazo</p>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button key={star} onClick={() => setRatingService(star)} className="transition-transform active:scale-90">
                                                        <Star className={`w-8 h-8 ${star <= ratingService ? 'fill-[#FFAE00] text-[#FFAE00]' : 'text-gray-700'}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <textarea 
                                            value={reviewComment}
                                            onChange={e => setReviewComment(e.target.value)}
                                            placeholder="Deixe um elogio ou comentário sobre o trabalho..."
                                            className="w-full bg-[#1A1D23] border border-white/10 rounded-xl p-4 text-sm text-gray-300 min-h-[120px] focus:border-green-500/50"
                                        />

                                        <button 
                                            onClick={() => handleSubmitReview(ratingMatrix, ratingService, reviewComment)}
                                            className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest text-sm"
                                        >
                                            Enviar Avaliação & Finalizar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!isOwner && currentUser?.id === acceptedProposal?.criador_id && (
                                <div className="w-full lg:w-[450px] bg-white/5 p-8 lg:p-10 flex flex-col items-center justify-center text-center">
                                    <h3 className="text-xl font-bold text-white mb-8 text-center">Acompanhamento do Pagamento</h3>
                                    
                                    <div className="relative pl-6 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10 w-full max-w-sm">
                                        {/* Etapa 1: Concluída */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-[24px] h-[24px] bg-green-500 rounded-full border-4 border-[#1A1D23] flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.5)] z-10">
                                                <CheckCircle className="w-3 h-3 text-white" />
                                            </div>
                                            <h4 className="text-sm font-bold text-green-400 mb-1 leading-none pt-0.5">Matriz Entregue</h4>
                                            <p className="text-xs text-gray-500">Seu arquivo foi enviado com sucesso.</p>
                                        </div>

                                        {/* Etapa 2: Aguardando (Pendente) */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-[24px] h-[24px] bg-[#FFAE00] rounded-full border-4 border-[#1A1D23] flex items-center justify-center shadow-[0_0_10px_rgba(255,174,0,0.5)] animate-pulse z-10">
                                                <Clock className="w-3 h-3 text-black" />
                                            </div>
                                            <h4 className="text-sm font-bold text-[#FFAE00] mb-1 leading-none pt-0.5">Avaliação do Cliente (Opcional)</h4>
                                            <p className="text-xs text-gray-500 leading-relaxed text-left">
                                                O cliente tem a opção de avaliar a qualidade do trabalho. <br/>
                                                <span className="text-gray-400 italic">Dica: Mande uma mensagem pedindo para o cliente avaliar (isso aumenta a sua reputação)</span>
                                            </p>
                                        </div>

                                        {/* Etapa 3: Futura */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-[24px] h-[24px] bg-gray-800 rounded-full border-4 border-[#1A1D23] z-10"></div>
                                            <h4 className="text-sm font-bold text-gray-600 mb-1 leading-none pt-0.5">Pagamento Liberado</h4>
                                            <p className="text-xs text-gray-600 text-left">
                                                Será liberado na sua carteira automaticamente em 12 horas após a entrega
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#1A1D23] border border-white/5 rounded-xl p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-[#F3F4F6] flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-[#FFAE00]" />
                                Propostas Privadas ({proposals.length})
                            </h2>
                        </div>

                        {showProposalForm && (
                            <div className="mb-6 bg-[#0F1115] p-4 rounded-xl border border-white/5">
                                <form onSubmit={handleSubmitProposal} className="flex gap-3 items-end">
                                    <div className="flex-[1.5]">
                                        <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-[#1A1D23] border border-transparent focus:border-[#FFAE00]/30 rounded-lg px-3 py-2 text-sm text-white" placeholder="Valor (R$)" />
                                    </div>
                                    <div className="flex-[1.5]">
                                        <input type="text" required value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-[#1A1D23] border border-transparent focus:border-[#FFAE00]/30 rounded-lg px-3 py-2 text-sm text-white" placeholder="Prazo (ex: 2 dias)" />
                                    </div>
                                    <div className="flex-[5]">
                                        <input type="text" required value={message} onChange={e => setMessage(e.target.value)} className="w-full bg-[#1A1D23] border border-transparent focus:border-[#FFAE00]/30 rounded-lg px-3 py-2 text-sm text-white" placeholder="Mensagem / Diferencial..." />
                                    </div>
                                    <div className="flex-[2]">
                                        <button type="submit" disabled={submitting} className="w-full bg-[#FFAE00] text-black font-bold px-6 py-2 rounded-lg text-sm hover:scale-105 transition-transform disabled:opacity-50">
                                            Enviar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="flex gap-4 overflow-x-auto pb-2 snap-x custom-scrollbar">
                            {proposals.length === 0 ? (
                                <div className="w-full text-center py-6 text-gray-500 text-sm">Nenhuma proposta enviada.</div>
                            ) : (
                                proposals.map((proposal: any) => (
                                    <div key={proposal.id} className={`min-w-[280px] max-w-[320px] shrink-0 bg-[#0F1115] rounded-xl border p-4 snap-start transition-all ${negotiatingProposalId === proposal.id ? 'border-[#FFAE00] shadow-[0_0_15px_rgba(255,174,0,0.1)]' : 'border-white/5 hover:border-white/10'}`}>
                                        <div className="flex flex-col mb-3 bg-[#1A1D23] p-3 rounded-xl border border-white/5 relative shadow-inner">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 overflow-hidden relative shadow-sm">
                                                    {proposal.users?.avatar_url ? (
                                                        <img src={proposal.users.avatar_url} className="w-full h-full object-cover" alt=""/>
                                                    ) : <User className="w-5 h-5 m-auto text-gray-500 mt-2.5"/>}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="text-sm font-bold text-white leading-tight truncate">
                                                        {proposal.users?.name || 'Profissional'} 
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star 
                                                                key={i} 
                                                                className={`w-2.5 h-2.5 ${i < (proposal.users?.rating || 0) ? 'fill-[#FFAE00] text-[#FFAE00]' : 'text-gray-700'}`} 
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-0.5">#{proposal.id.split('-')[0]}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center bg-[#0F1115] p-2.5 rounded-lg border border-black/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                                                <p className="text-lg font-black text-[#FFAE00] leading-none tracking-tight">R$ {proposal.amount.toFixed(2)}</p>
                                                <p className="text-[10px] text-gray-400 flex items-center gap-1 font-medium bg-[#1A1D23] px-2 py-1 rounded-md border border-white/5"><Clock className="w-3 h-3 text-[#FFAE00]"/> {proposal.deadline_text}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 line-clamp-2 mt-4 mb-4 h-8 bg-black/20 p-2 rounded border border-white/5 italic">"{proposal.message}"</p>
                                        
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                {isOwner && proposal.status === 'pendente' && (
                                                    <>
                                                        <button onClick={() => handleAcceptProposal(proposal.id)} className="flex-1 bg-[#FFAE00] text-black text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 hover:brightness-110"><Zap className="w-3 h-3"/> Pagar</button>
                                                        <button onClick={() => handleNegotiate(proposal.id)} className={`flex-1 border text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${negotiatingProposalId === proposal.id ? 'bg-white/10 text-white border-white/20' : 'border-white/10 text-gray-400 hover:text-white'}`}><MessageSquare className="w-3 h-3"/> {negotiatingProposalId === proposal.id ? 'Ocultar' : 'Chat'}</button>
                                                    </>
                                                )}
                                                {!isOwner && currentUser?.id === proposal.criador_id && (
                                                    <button onClick={() => handleNegotiate(proposal.id)} className={`w-full border text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${negotiatingProposalId === proposal.id ? 'bg-[#FFAE00]/10 text-[#FFAE00] border-[#FFAE00]/30' : 'border-white/10 text-gray-400 hover:text-[#FFAE00]'}`}><MessageSquare className="w-3 h-3"/> {negotiatingProposalId === proposal.id ? 'Fechar Chat' : 'Abrir Chat'}</button>
                                                )}
                                            </div>
                                            {proposal.status === 'aceita' && <div className="w-full text-center py-2 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg border border-green-500/20 uppercase tracking-wider">Aceita</div>}

                                            {!isOwner && proposal.status === 'contraproposta' && (
                                                <div className="p-3 bg-[#FFAE00]/10 border border-[#FFAE00]/30 rounded-lg">
                                                    <p className="text-xs font-bold text-[#FFAE00] mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Oferta do Cliente: R$ {proposal.counter_amount}</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleProgrammerResponse(proposal.id, 'accept_counter', proposal)} className="flex-1 bg-[#FFAE00] text-black text-[10px] font-bold py-1.5 rounded">Aceitar</button>
                                                        <button onClick={() => handleProgrammerResponse(proposal.id, 'reject_counter', proposal)} className="flex-1 border border-gray-600 text-gray-300 text-[10px] py-1.5 rounded hover:bg-white/5">Recusar</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* 3. BOTTOM SECTION: Chat */}
                {negotiatingProposalId && (
                    <div className="bg-[#1A1D23] border border-[#FFAE00]/30 rounded-xl overflow-hidden shadow-2xl mt-2 mb-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
                        <div className="bg-[#FFAE00]/10 border-b border-[#FFAE00]/20 px-4 py-3 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-[#FFAE00] flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> 
                                Negociação Privada (Proposta #{negotiatingProposalId.split('-')[0]})
                            </h3>
                            <button onClick={() => setNegotiatingProposalId(null)} className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="h-[400px]">
                            <NegotiationChat
                                proposalId={negotiatingProposalId}
                                currentUserId={currentUser?.id}
                                isOwner={isOwner}
                                senderName={currentUser?.name || 'Usuário'}
                                jobId={jobId}
                                initialAmount={proposals.find(p => p.id === negotiatingProposalId)?.amount || 0}
                            />
                        </div>
                    </div>
                )}

                {/* SUCCESS MODAL */}
                {showSuccessModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="bg-[#1A1D23] border border-green-500/30 p-8 rounded-2xl w-full max-w-md text-center shadow-[0_0_50px_rgba(34,197,94,0.15)] animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                <CheckCircle className="w-10 h-10 text-green-400" />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-2">Matriz Enviada! 🎉</h3>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                Mandou muito bem! O cliente já foi notificado.<br/><br/>
                                <strong className="text-white">O pagamento será liberado</strong> na sua carteira automaticamente em <strong>12 horas</strong>, ou imediatamente a avaliação do cliente (que é opcional).
                            </p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="w-full bg-green-500 text-white font-bold py-4 rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                            >
                                Entendi, fechar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
