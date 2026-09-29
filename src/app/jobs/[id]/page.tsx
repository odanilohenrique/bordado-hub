'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/helpers'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, MessageSquare, AlertCircle, CheckCircle, Package, Zap, User, X, Star, PenTool, Download, Upload, Send, Sparkles, DollarSign, Wrench, Camera, RotateCcw, Ruler, Maximize2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import NegotiationChat from '@/components/NegotiationChat'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface Job {
    id: string
    cliente_id: string
    title: string
    description: string
    dimensions?: string
    order_type?: string
    items_count?: number
    image_urls: string[]
    formats: string[]
    fabric_type: string
    urgency: string
    status: string
    created_at: string
    delivery_url?: string
    delivery_notes?: string
    delivered_at?: string
    revision_notes?: string
    revision_image_url?: string
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
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
    const [confirmAcceptModal, setConfirmAcceptModal] = useState<string | null>(null)

    // Delivery & Review form state
    const [deliveryNotes, setDeliveryNotes] = useState('')
    const [delivering, setDelivering] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    const [ratingMatrix, setRatingMatrix] = useState(5)
    const [ratingService, setRatingService] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [jobReview, setJobReview] = useState<any>(null)
    const [jobTransaction, setJobTransaction] = useState<any>(null)

    // Revision state
    const [showRevisionModal, setShowRevisionModal] = useState(false)
    const [revisionNotes, setRevisionNotes] = useState('')
    const [revisionPhoto, setRevisionPhoto] = useState<File | null>(null)
    const [submittingRevision, setSubmittingRevision] = useState(false)

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

            if (jobData?.status === 'finalizado') {
                const { data: rev } = await supabase
                    .from('reviews')
                    .select('*')
                    .eq('job_id', jobId)
                    .maybeSingle()
                if (rev) setJobReview(rev)

                // Fetch transaction to determine payment method
                const { data: txData } = await supabase
                    .from('transactions')
                    .select('metodo, status')
                    .eq('job_id', jobId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
                if (txData) setJobTransaction(txData)
            }

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
                toast.error('Erro ao carregar propostas: ' + proposalsError.message)
            }

            setProposals(proposalsData || [])

            if (proposalsData && proposalsData.length > 0) {
                // Fetch unread messages count
                const { data: messages } = await supabase
                    .from('proposal_messages')
                    .select('proposal_id, sender_id, read')
                    .eq('read', false)
                
                if (messages) {
                    const counts: Record<string, number> = {}
                    messages.forEach(msg => {
                        if (msg.sender_id !== profile.id) {
                            counts[msg.proposal_id] = (counts[msg.proposal_id] || 0) + 1
                        }
                    })
                    setUnreadCounts(counts)
                }
            }

            setLoading(false)
        }

        loadData()

        // Listen for new proposals and messages
        const channel = supabase
            .channel(`job_updates_${jobId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'proposal_messages',
            }, (payload) => {
                const newMsg = payload.new as any
                setUnreadCounts(prev => {
                    // Only increment if not sent by us, and not currently negotiating this one
                    if (newMsg.sender_id !== currentUser?.id) {
                        return {
                            ...prev,
                            [newMsg.proposal_id]: (prev[newMsg.proposal_id] || 0) + 1
                        }
                    }
                    return prev
                })
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'proposals',
                filter: `job_id=eq.${jobId}`
            }, () => {
                loadData() // Reload proposals on changes
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [jobId, router, currentUser?.id])

    const acceptedProposal = proposals.find((p: any) => p.status === 'aceita')

    const handleNegotiate = (propId: string) => {
        if (negotiatingProposalId === propId) {
            setNegotiatingProposalId(null)
        } else {
            setNegotiatingProposalId(propId)
            // Mark as read immediately in UI
            setUnreadCounts(prev => ({ ...prev, [propId]: 0 }))
            // Mark as read in DB
            supabase.from('proposal_messages')
                .update({ read: true })
                .eq('proposal_id', propId)
                .neq('sender_id', currentUser?.id)
                .then()
        }
    }

    const handleOpenChatForAdjustment = async () => {
        if (!acceptedProposal) return
        setNegotiatingProposalId(acceptedProposal.id)
        setUnreadCounts(prev => ({ ...prev, [acceptedProposal.id]: 0 }))
        
        setTimeout(() => {
            const chatSection = document.getElementById('negotiation-chat-section')
            chatSection?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            const inputEl = document.getElementById('chat-message-input') as HTMLInputElement | null
            if (inputEl) {
                inputEl.focus()
            }
        }, 150)

        // If job was finalized, re-open for revision and alert the programmer
        if (job?.status === 'finalizado') {
            try {
                await fetch('/api/jobs/revision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jobId,
                        clientId: currentUser?.id,
                        notes: 'O cliente acionou a garantia pós-teste e abriu o chat para solicitar ajustes na matriz.'
                    })
                })
                setJob((prev: any) => ({ ...prev, status: 'em_revisao' }))
                toast.info('Garantia acionada: o programador foi notificado com prioridade alta!')
            } catch (err) {
                console.error('Adjustment trigger error:', err)
            }
        }
    }

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

            toast.success('Proposta enviada com sucesso!')
            router.refresh()
            window.location.reload()
        } catch (err: any) {
            toast.error('Erro ao enviar proposta: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmitDelivery = async () => {
        if (selectedFiles.length === 0) return
        setDelivering(true)
        try {
            const publicUrls: string[] = []

            for (const file of selectedFiles) {
                // Sanitize file name to avoid weird characters in URLs
                const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
                const fileName = `${jobId}_${safeName}`
                const filePath = `deliveries/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('job-deliveries')
                    .upload(filePath, file, { upsert: true })

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('job-deliveries')
                    .getPublicUrl(filePath)
                
                publicUrls.push(publicUrl)
            }

            await handleDeliverMatrix(deliveryNotes, publicUrls.join(','))
        } catch (err: any) {
            toast.error('Erro no upload: ' + err.message)
            setDelivering(false)
        }
    }

    const handleDeliverMatrix = async (deliveryNotes: string, fileUrls: string) => {
        try {
            const response = await fetch('/api/jobs/deliver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId,
                    deliveryUrls: fileUrls,
                    deliveryNotes
                })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Erro na entrega')

            setShowSuccessModal(true)
        } catch (err: any) {
            toast.error('Erro ao entregar: ' + err.message)
            setDelivering(false)
        }
    }

    const handleSubmitReview = async (mRating: number, sRating: number, comment: string) => {
        if (!acceptedProposal) return

        try {
            const response = await fetch('/api/jobs/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId,
                    reviewerId: currentUser.id,
                    revieweeId: acceptedProposal.criador_id,
                    ratingMatrix: mRating,
                    ratingService: sRating,
                    comment
                })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Erro na avaliação')

            toast.success('Avaliação enviada! Projeto finalizado e pagamento liberado.')
            setTimeout(() => {
                window.location.reload()
            }, 2000)
        } catch (err: any) {
            toast.error('Erro ao avaliar: ' + err.message)
        }
    }

    const handleRequestRevision = async () => {
        if (!revisionNotes.trim()) {
            toast.error('Por favor, descreva o que precisa ser ajustado.')
            return
        }
        setSubmittingRevision(true)
        try {
            const formData = new FormData()
            formData.append('jobId', jobId)
            if (currentUser?.id) formData.append('clientId', currentUser.id)
            formData.append('notes', revisionNotes.trim())
            if (revisionPhoto) {
                formData.append('photo', revisionPhoto)
            }

            const res = await fetch('/api/jobs/revision', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao solicitar revisão')

            toast.success('Solicitação de ajuste enviada ao programador!')
            setShowRevisionModal(false)
            setJob((prev: any) => ({
                ...prev,
                status: 'em_revisao',
                revision_notes: revisionNotes,
                revision_image_url: data.imageUrl || null
            }))
        } catch (err: any) {
            toast.error(err.message || 'Erro ao enviar solicitação de ajuste')
        } finally {
            setSubmittingRevision(false)
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

            // Automatically send a message in chat
            await supabase.from('proposal_messages').insert({
                proposal_id: negotiatingProposalId,
                sender_id: currentUser.id,
                content: `⚡ Fiz uma contraproposta oficial de **R$ ${counterAmount}**. Veja os detalhes e aceite para fecharmos!`
            })

            toast.success('Contraproposta enviada!')
            setNegotiatingProposalId(null)
            router.refresh()
            window.location.reload()
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
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
                toast.success('Oferta aceita! O valor foi atualizado. Aguarde o pagamento do cliente.')
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
                toast.success('Contraproposta recusada.')
            }
            router.refresh()
            window.location.reload()
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
        }
    }

    const handleAcceptProposal = async (proposalId: string) => {
        setConfirmAcceptModal(null)
        try {
            await supabase
                .from('proposals')
                .update({ status: 'aceita' })
                .eq('id', proposalId)

            router.push(`/checkout/${proposalId}`)
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
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
    const myExistingProposal = proposals.find((p: any) => p.criador_id === currentUser?.id)
    const hasAlreadySentProposal = !!myExistingProposal
    const showProposalForm = !isOwner && job.status === 'aberto' && !hasAlreadySentProposal

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
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h1 className="text-2xl font-bold text-[#F3F4F6]">{job.title}</h1>
                                        {(job.order_type === 'kit' || (job.items_count && job.items_count > 1) || job.title?.startsWith('[Kit')) && (
                                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFAE00] bg-[#FFAE00]/10 border border-[#FFAE00]/30 px-3 py-1 rounded-full mt-2 shadow-sm">
                                                <Package className="w-3.5 h-3.5" />
                                                Kit com {job.items_count || (job.title?.match(/\[Kit\s*(\d+)/i)?.[1] ? Number(job.title.match(/\[Kit\s*(\d+)/i)?.[1]) : 2)} Matrizes
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/20 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                            {job.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 mb-4 flex-wrap items-center">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0F1115] border border-gray-800 rounded-md text-xs text-gray-300">
                                        <Clock className="w-3 h-3 text-[#FFAE00]" />
                                        {urgencyLabels[job.urgency] || job.urgency}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0F1115] border border-gray-800 rounded-md text-xs text-gray-300">
                                        <Package className="w-3 h-3 text-[#FFAE00]" />
                                        Tecido: {job.fabric_type || 'N/A'}
                                    </span>
                                    {job.dimensions && (
                                        job.dimensions.includes('|') ? (
                                            job.dimensions.split('|').map((part, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFAE00]/10 border border-[#FFAE00]/30 rounded-md text-xs text-[#FFAE00] font-bold">
                                                    <Ruler className="w-3 h-3 text-[#FFAE00]" />
                                                    {part.trim()}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0F1115] border border-[#FFAE00]/20 rounded-md text-xs text-[#FFAE00] font-bold">
                                                <Ruler className="w-3 h-3 text-[#FFAE00]" />
                                                {job.dimensions}
                                            </span>
                                        )
                                    )}
                                </div>
                                {(job.order_type === 'kit' || (job.items_count && job.items_count > 1) || job.title?.startsWith('[Kit')) && (
                                    <div className="bg-amber-500/10 border-l-4 border-[#FFAE00] p-3 rounded-r-lg mb-4 text-xs text-amber-200/90">
                                        <span className="font-bold text-[#FFAE00] flex items-center gap-1.5 mb-0.5">
                                            <Sparkles className="w-3.5 h-3.5" /> Pacote de Matrizes (Kit de Uniforme):
                                        </span>
                                        Este pedido contempla a criação de todas as matrizes especificadas acima. Ao enviar uma proposta, considere o valor total para digitalizar todo o conjunto.
                                    </div>
                                )}
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

                    {/* Galeria Detalhada das Matrizes de Referência */}
                    {job.image_urls && job.image_urls.length > 1 && (
                        <div className="p-5 bg-[#0F1115]/60 border-t border-white/5">
                            <h3 className="text-xs font-bold text-[#FFAE00] uppercase tracking-wider flex items-center gap-2 mb-3">
                                <Package className="w-3.5 h-3.5 text-[#FFAE00]" />
                                Imagens de Referência por Matriz ({job.image_urls.length} arquivos):
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {job.image_urls.map((url, idx) => {
                                    const isPdf = url.toLowerCase().includes('.pdf')
                                    const dimParts = job.dimensions?.split('|') || []
                                    const label = dimParts[idx] ? dimParts[idx].trim() : `Arte ${idx + 1}`

                                    return (
                                        <div key={idx} className="bg-[#1A1D23] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between group hover:border-[#FFAE00]/50 transition-all shadow">
                                            <div className="h-28 w-full bg-black/40 rounded flex items-center justify-center overflow-hidden relative mb-2">
                                                {isPdf ? (
                                                    <iframe src={`${url}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full pointer-events-none" />
                                                ) : (
                                                    <img src={url} alt={label} className="max-h-full max-w-full object-contain p-1 group-hover:scale-105 transition-transform" />
                                                )}
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold text-white gap-1"
                                                >
                                                    <Maximize2 className="w-3.5 h-3.5 text-[#FFAE00]" /> Ver Ampliado
                                                </a>
                                            </div>
                                            <div className="text-center">
                                                <span className="text-[11px] font-bold text-gray-200 block truncate" title={label}>
                                                    {label}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. MIDDLE SECTION: Proposals OR Production/Revision Hero OR Delivery OR Finalized */}
                {(job.status === 'em_progresso' || job.status === 'em_revisao') && acceptedProposal ? (
                    <div className="bg-[#1A1D23] border border-[#FFAE00]/30 rounded-xl p-8 shadow-[0_0_40px_rgba(255,174,0,0.15)] relative overflow-hidden flex flex-col items-center justify-center min-h-[320px] text-center mb-8">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#FFAE00]/5 rounded-full blur-3xl"></div>
                        
                        <div className="relative z-10 mb-6 mt-2">
                            <div className="w-28 h-28 relative flex items-center justify-center mx-auto">
                                <svg className="absolute inset-0 w-full h-full text-[#FFAE00] animate-[spin_12s_linear_infinite] opacity-30" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" strokeLinecap="round" />
                                </svg>
                                <div className="bg-[#0F1115] w-14 h-14 rounded-full border border-[#FFAE00]/40 z-10 shadow-[0_0_25px_rgba(255,174,0,0.25)] flex items-center justify-center">
                                    {job.status === 'em_revisao' ? (
                                        <Wrench className="w-6 h-6 text-yellow-400 animate-pulse" />
                                    ) : (
                                        <PenTool className="w-6 h-6 text-[#FFAE00] animate-pulse" style={{ animationDuration: '2.5s' }} />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 max-w-lg mx-auto">
                            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                                {job.status === 'em_revisao' ? 'Matriz em Revisão' : 'Matriz em Produção'}
                            </h2>
                            <p className="text-gray-400 text-sm leading-relaxed px-4">
                                {job.status === 'em_revisao' ? (
                                    isOwner ? (
                                        <>Você solicitou um ajuste na matriz. O profissional <strong className="text-[#FFAE00] text-base">{acceptedProposal.users?.name || 'Parceiro'}</strong> já foi notificado e está trabalhando na correção.</>
                                    ) : (
                                        <>O comprador testou o bordado e solicitou um ajuste. Veja os detalhes abaixo e envie a matriz corrigida.</>
                                    )
                                ) : (
                                    <>Aguarde... O profissional <strong className="text-[#FFAE00] text-base">{acceptedProposal.users?.name || 'Parceiro'}</strong> está criando sua matriz da melhor maneira possível.</>
                                )}
                            </p>

                            <div className="mt-6 flex items-center justify-center gap-4">
                                <span className={`inline-flex items-center gap-2 ${job.status === 'em_revisao' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-[#FFAE00]/10 text-[#FFAE00] border-[#FFAE00]/20'} px-4 py-2 rounded-full text-xs font-bold border`}>
                                    <span className={`w-2 h-2 ${job.status === 'em_revisao' ? 'bg-yellow-400' : 'bg-[#FFAE00]'} rounded-full animate-pulse`}></span>
                                    {job.status === 'em_revisao' ? 'AJUSTES EM ANDAMENTO' : 'TRABALHO EM ANDAMENTO'}
                                </span>
                                
                                <button 
                                    onClick={() => handleNegotiate(acceptedProposal.id)}
                                    className="inline-flex items-center gap-2 bg-[#1A1D23] hover:bg-white/5 text-gray-300 px-4 py-2 rounded-full text-xs font-bold border border-white/10 transition-colors"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {negotiatingProposalId === acceptedProposal.id ? 'Fechar Chat' : 'Chat / Histórico'}
                                </button>
                            </div>

                            {/* REVISION DETAILS CARD (IF IN REVISION) */}
                            {job.status === 'em_revisao' && (job.revision_notes || job.revision_image_url) && (
                                <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 text-left">
                                    <p className="text-xs font-bold text-yellow-400 flex items-center gap-2 uppercase tracking-wider mb-2">
                                        <Wrench className="w-4 h-4" /> Detalhes do Ajuste Solicitado pelo Cliente:
                                    </p>
                                    {job.revision_notes && (
                                        <div className="bg-[#0F1115] p-3.5 rounded-lg border border-white/5 text-sm text-gray-200 mb-3 whitespace-pre-wrap">
                                            &quot;{job.revision_notes}&quot;
                                        </div>
                                    )}
                                    {job.revision_image_url && (
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Foto do Teste / Defeito no Bordado:</p>
                                            <a href={job.revision_image_url} target="_blank" rel="noopener noreferrer" className="inline-block relative rounded-lg overflow-hidden border border-white/10 hover:border-yellow-500/50 transition-colors">
                                                <img src={job.revision_image_url} alt="Foto do bordado com defeito" className="max-h-48 rounded-lg object-cover" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DELIVERY SECTION (Programmer Only) */}
                            {!isOwner && currentUser?.id === acceptedProposal.criador_id && (
                                <div className="mt-8 pt-8 border-t border-white/10 w-full max-w-lg mx-auto text-left relative z-10">
                                    <div className="bg-[#0F1115] p-6 rounded-xl border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="bg-green-500/20 p-2 rounded-lg">
                                                <Package className="w-5 h-5 text-green-400" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white">
                                                {job.status === 'em_revisao' ? 'Enviar Matriz Corrigida' : 'Entregar Matriz'}
                                            </h3>
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
                                                    multiple
                                                    accept=".pdf,.jpg,.jpeg,.png,.pxf,.emb,.dst,.jef,.pes,.xxx,.vp3,.hus,.vip,.shv,.exp,.pec"
                                                    className="hidden" 
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || [])
                                                        if (files.length > 10) {
                                                            toast.error('Você pode enviar no máximo 10 arquivos por vez.')
                                                            return
                                                        }
                                                        setSelectedFiles(files)
                                                    }}
                                                    disabled={delivering}
                                                />
                                                <label 
                                                    htmlFor="matrix-upload"
                                                    className={`flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-8 cursor-pointer hover:border-green-500/50 hover:bg-green-500/5 transition-all ${delivering ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {selectedFiles.length > 0 ? (
                                                        <>
                                                            <Upload className="w-8 h-8 text-green-400 mb-2" />
                                                            <p className="text-sm text-green-400 font-bold text-center">{selectedFiles.length} arquivo(s) selecionado(s):</p>
                                                            <div className="flex flex-wrap justify-center gap-2 mt-3">
                                                                {selectedFiles.map((f, i) => (
                                                                    <div key={i} className="bg-[#1A1D23] px-3 py-1 rounded text-xs text-gray-300 border border-white/10 truncate max-w-[150px]">
                                                                        {f.name}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 mt-4 uppercase tracking-widest font-bold">Clique para alterar a seleção</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-8 h-8 text-green-400 mb-2" />
                                                            <p className="text-sm text-gray-300 font-bold text-center">Clique para selecionar os arquivos (até 10)</p>
                                                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold text-center">Apenas formatos de bordado (.pxf, .emb, .dst, .pes, etc) e imagens/pdf</p>
                                                        </>
                                                    )}
                                                </label>
                                            </div>

                                            {selectedFiles.length > 0 && (
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
                                                                {job.status === 'em_revisao' ? 'Enviar Matriz Corrigida' : 'Enviar Matriz'}
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
                            {/* Left Side: Owner gets test/download/revision; Programmer gets confirmation + file list */}
                            <div className="flex-1 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-white/5">
                                {isOwner ? (
                                    <>
                                        <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                                            <CheckCircle className="w-3 h-3" /> Matriz Pronta para Teste
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4">Sua matriz está pronta! 🚀</h2>
                                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                            O programador <strong className="text-white">{acceptedProposal?.users?.name}</strong> finalizou o trabalho. Baixe os arquivos abaixo e faça um teste na sua máquina. Se estiver tudo perfeito, envie a avaliação para liberar o pagamento!
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                                            <Package className="w-3 h-3" /> Matriz Entregue com Sucesso
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4">Matriz Enviada para o Cliente! 🚀</h2>
                                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                            Você já enviou os arquivos da matriz. O cliente foi notificado para testar o bordado na máquina e realizar a aprovação do projeto.
                                        </p>
                                    </>
                                )}
                                
                                {job.delivery_notes && (
                                    <div className="bg-[#0F1115] p-4 rounded-xl border border-white/5 mb-6 italic text-sm text-gray-400">
                                        &quot;{job.delivery_notes}&quot;
                                    </div>
                                )}

                                {job.delivery_url && (() => {
                                    const urls = job.delivery_url.split(',')
                                    const getFileName = (url: string) => {
                                        const decoded = decodeURIComponent(url.split('/').pop() || 'arquivo')
                                        const parts = decoded.split('_')
                                        return parts.length > 1 ? parts.slice(1).join('_') : decoded
                                    }

                                    const handleDownloadAll = async () => {
                                        toast.info('Compactando arquivos... aguarde.')
                                        try {
                                            const zip = new JSZip()
                                            for (const url of urls) {
                                                const res = await fetch(url)
                                                const blob = await res.blob()
                                                zip.file(getFileName(url), blob)
                                            }
                                            const content = await zip.generateAsync({ type: 'blob' })
                                            saveAs(content, `${job.title || 'matrizes'}.zip`)
                                            toast.success('Download concluído!')
                                        } catch (err) {
                                            toast.error('Erro ao compactar arquivos.')
                                        }
                                    }

                                    return (
                                        <div className="flex flex-col gap-4">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                {isOwner ? `Arquivos para Download (${urls.length})` : `Arquivos Entregues (${urls.length})`}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {urls.map((url, i) => (
                                                    <a 
                                                        key={i}
                                                        href={url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 bg-[#0F1115] hover:bg-green-500/20 border border-white/10 hover:border-green-500/50 text-gray-300 hover:text-green-400 px-4 py-2 rounded-lg transition-all text-xs"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        {getFileName(url)}
                                                    </a>
                                                ))}
                                            </div>
                                            {urls.length > 1 && (
                                                <button
                                                    onClick={handleDownloadAll}
                                                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 w-fit"
                                                >
                                                    <Download className="w-5 h-5" />
                                                    Baixar Tudo (.zip)
                                                </button>
                                            )}
                                        </div>
                                    )
                                })()}

                                {/* REVISION TRIGGER BUTTON FOR BUYER */}
                                {isOwner && (
                                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-yellow-500/[0.04] p-4 rounded-xl border border-yellow-500/20">
                                        <div>
                                            <p className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                                                <AlertCircle className="w-4 h-4" /> Testou o bordado e precisa de algum ajuste ou correção?
                                            </p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                Você pode solicitar uma correção de ponto, tamanho ou formato com foto.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowRevisionModal(true)}
                                            className="inline-flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 shrink-0"
                                        >
                                            <Wrench className="w-3.5 h-3.5" />
                                            Pedir Ajuste / Revisão
                                        </button>
                                    </div>
                                )}

                                {/* QUICK CHAT BUTTON FOR PROGRAMMER */}
                                {!isOwner && acceptedProposal && (
                                    <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                                        <p className="text-xs text-gray-500">Dúvidas com o cliente sobre o bordado?</p>
                                        <button
                                            onClick={() => handleNegotiate(acceptedProposal.id)}
                                            className="inline-flex items-center gap-2 bg-[#1A1D23] hover:bg-white/5 text-gray-300 px-4 py-2 rounded-xl text-xs font-bold border border-white/10 transition-colors"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Abrir Chat com Cliente
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Review Form for Owner, Timeline for Programmer */}
                            {isOwner && (
                                <div className="w-full lg:w-[450px] bg-green-500/5 p-8 lg:p-10 flex flex-col justify-center">
                                    <h3 className="text-xl font-bold text-white mb-4">Tudo Certo? Avalie o Trabalho</h3>

                                    {/* Dica amigável antes de avaliar */}
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 flex items-start gap-2.5 mb-5">
                                        <Sparkles className="w-4 h-4 text-[#FFAE00] flex-shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-white">💡 Já testou o bordado?</p>
                                            <p className="text-gray-300 leading-relaxed text-[11px]">
                                                Recomendamos fazer um teste no tecido antes de avaliar. Se precisar de ajustes agora, use o botão <strong>Pedir Ajuste / Revisão</strong> ao lado.
                                            </p>
                                            <p className="text-[10px] text-amber-400 font-semibold">
                                                🛡️ Fique tranquilo: mesmo após aprovar, você terá 7 dias de garantia para solicitar correções na matriz!
                                            </p>
                                        </div>
                                    </div>
                                    
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
                                            className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            Enviar Avaliação & Liberar Pagamento
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
                                            <p className="text-xs text-gray-500 text-left">Seu arquivo foi enviado com sucesso.</p>
                                        </div>

                                        {/* Etapa 2: Aguardando (Pendente) */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-[24px] h-[24px] bg-[#FFAE00] rounded-full border-4 border-[#1A1D23] flex items-center justify-center shadow-[0_0_10px_rgba(255,174,0,0.5)] animate-pulse z-10">
                                                <Clock className="w-3 h-3 text-black" />
                                            </div>
                                            <h4 className="text-sm font-bold text-[#FFAE00] mb-1 leading-none pt-0.5">Avaliação do Cliente</h4>
                                            <p className="text-xs text-gray-500 leading-relaxed text-left">
                                                O comprador está testando o bordado na máquina e fará a aprovação.
                                            </p>
                                        </div>

                                        {/* Etapa 3: Futura */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-[24px] h-[24px] bg-gray-800 rounded-full border-4 border-[#1A1D23] z-10"></div>
                                            <h4 className="text-sm font-bold text-gray-600 mb-1 leading-none pt-0.5">Pagamento Liberado</h4>
                                            <p className="text-xs text-gray-600 text-left">
                                                Será transferido via PIX automaticamente para sua conta assim que o cliente aprovar.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : job.status === 'finalizado' ? (
                    <div className="bg-[#1A1D23] border border-green-500/30 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.1)] mb-8">
                        <div className="flex flex-col lg:flex-row">
                            {/* Left Side: Always accessible downloads */}
                            <div className="flex-1 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-white/5">
                                <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                                    <CheckCircle className="w-3 h-3" /> Pedido Concluído & Pago
                                </div>
                                <h2 className="text-3xl font-black text-white mb-2">Matriz Aprovada e Concluída! 🏆</h2>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    Este pedido foi 100% finalizado. Os arquivos ficam salvos permanentemente na sua conta e você pode baixá-los a qualquer momento.
                                </p>
                                
                                {job.delivery_url && (() => {
                                    const urls = job.delivery_url.split(',')
                                    const getFileName = (url: string) => {
                                        const decoded = decodeURIComponent(url.split('/').pop() || 'arquivo')
                                        const parts = decoded.split('_')
                                        return parts.length > 1 ? parts.slice(1).join('_') : decoded
                                    }

                                    const handleDownloadAll = async () => {
                                        toast.info('Compactando arquivos... aguarde.')
                                        try {
                                            const zip = new JSZip()
                                            for (const url of urls) {
                                                const res = await fetch(url)
                                                const blob = await res.blob()
                                                zip.file(getFileName(url), blob)
                                            }
                                            const content = await zip.generateAsync({ type: 'blob' })
                                            saveAs(content, `${job.title || 'matrizes'}.zip`)
                                            toast.success('Download concluído!')
                                        } catch (err) {
                                            toast.error('Erro ao compactar arquivos.')
                                        }
                                    }

                                    return (
                                        <div className="flex flex-col gap-4">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                Arquivos da Matriz ({urls.length})
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {urls.map((url, i) => (
                                                    <a 
                                                        key={i}
                                                        href={url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 bg-[#0F1115] hover:bg-green-500/20 border border-white/10 hover:border-green-500/50 text-gray-300 hover:text-green-400 px-4 py-2 rounded-lg transition-all text-xs"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        {getFileName(url)}
                                                    </a>
                                                ))}
                                            </div>
                                            {urls.length > 1 && (
                                                <button
                                                    onClick={handleDownloadAll}
                                                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 w-fit"
                                                >
                                                    <Download className="w-5 h-5" />
                                                    Baixar Tudo (.zip)
                                                </button>
                                            )}
                                        </div>
                                    )
                                })()}

                                {/* GARANTIA DE AJUSTE OU CORREÇÃO (PÓS-AVALIAÇÃO) */}
                                {isOwner && (
                                    <div className="mt-6 p-4 bg-yellow-500/[0.05] border border-yellow-500/25 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                                                <p className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                                                    <Wrench className="w-3.5 h-3.5" /> Garantia de Ajuste ou Correção (7 dias)
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                                Bordou a peça e precisa de alteração de pontos, tamanho ou compensação na matriz?
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleOpenChatForAdjustment}
                                            className="inline-flex items-center gap-2 bg-[#FFAE00] hover:bg-yellow-400 text-black px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shrink-0 shadow-lg shadow-[#FFAE00]/10"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Solicitar Ajuste no Chat
                                        </button>
                                    </div>
                                )}

                                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">Histórico de mensagens e suporte preservados.</p>
                                    {!isOwner && acceptedProposal && (
                                        <button
                                            onClick={() => handleNegotiate(acceptedProposal.id)}
                                            className="inline-flex items-center gap-2 bg-[#1A1D23] hover:bg-white/5 text-gray-300 px-4 py-2 rounded-xl text-xs font-bold border border-white/10 transition-colors"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Abrir Chat com Cliente
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Right Side: Review Summary */}
                            <div className="w-full lg:w-[450px] bg-green-500/5 p-8 lg:p-10 flex flex-col justify-center">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <Star className="w-5 h-5 text-[#FFAE00] fill-[#FFAE00]" />
                                    Avaliação do Projeto
                                </h3>

                                {jobReview ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Qualidade da Matriz</p>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`w-5 h-5 ${s <= jobReview.rating_matrix ? 'fill-[#FFAE00] text-[#FFAE00]' : 'text-gray-700'}`} />
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Atendimento / Prazo</p>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`w-5 h-5 ${s <= jobReview.rating_service ? 'fill-[#FFAE00] text-[#FFAE00]' : 'text-gray-700'}`} />
                                                ))}
                                            </div>
                                        </div>

                                        {jobReview.comment && (
                                            <div className="bg-[#0F1115] p-3 rounded-xl border border-white/5 text-sm text-gray-300 italic">
                                                &quot;{jobReview.comment}&quot;
                                            </div>
                                        )}

                                        <div className="pt-2">
                                            <span className="inline-flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20 font-bold">
                                                <CheckCircle className="w-3.5 h-3.5" /> Pagamento {jobTransaction?.metodo === 'asaas_cartao' ? 'via Cartão' : 'PIX'} Confirmado
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-300 font-bold">Trabalho concluído com sucesso!</p>
                                        <p className="text-xs text-gray-500 mt-1">O valor foi liberado para o programador.</p>
                                    </div>
                                )}
                            </div>
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

                        {!isOwner && hasAlreadySentProposal && myExistingProposal && (
                            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                            Você já enviou uma proposta para este pedido
                                        </p>
                                        <p className="text-xs text-gray-300 mt-0.5">
                                            Valor oferecido: <strong className="text-yellow-400">R$ {myExistingProposal.amount?.toFixed(2)}</strong> • Prazo: <strong>{myExistingProposal.deadline_text || 'A combinar'}</strong>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleNegotiate(myExistingProposal.id)}
                                    className="inline-flex items-center gap-2 bg-[#FFAE00] hover:bg-yellow-400 text-black px-4 py-2 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shrink-0 shadow-md"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Abrir Chat da Sua Proposta
                                </button>
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
                                            <div className="flex gap-2 relative">
                                                {isOwner && proposal.status === 'pendente' && (
                                                    <>
                                                        <button onClick={() => setConfirmAcceptModal(proposal.id)} className="flex-1 bg-[#FFAE00] text-black text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 hover:brightness-110"><Zap className="w-3 h-3"/> Pagar</button>
                                                        <button onClick={() => handleNegotiate(proposal.id)} className={`flex-1 border text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 relative ${negotiatingProposalId === proposal.id ? 'bg-white/10 text-white border-white/20' : 'border-white/10 text-gray-400 hover:text-white'}`}>
                                                            <MessageSquare className="w-3 h-3"/> {negotiatingProposalId === proposal.id ? 'Ocultar' : 'Chat'}
                                                            {unreadCounts[proposal.id] > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-lg animate-bounce">{unreadCounts[proposal.id]}</span>}
                                                        </button>
                                                    </>
                                                )}
                                                {!isOwner && currentUser?.id === proposal.criador_id && (
                                                    <button onClick={() => handleNegotiate(proposal.id)} className={`w-full border text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 relative ${negotiatingProposalId === proposal.id ? 'bg-[#FFAE00]/10 text-[#FFAE00] border-[#FFAE00]/30' : 'border-white/10 text-gray-400 hover:text-[#FFAE00]'}`}>
                                                        <MessageSquare className="w-3 h-3"/> {negotiatingProposalId === proposal.id ? 'Fechar Chat' : 'Abrir Chat'}
                                                        {unreadCounts[proposal.id] > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-lg animate-bounce">{unreadCounts[proposal.id]}</span>}
                                                    </button>
                                                )}
                                            </div>
                                            {proposal.status === 'aceita' && (
                                                <div className="flex flex-col gap-2">
                                                    <div className="w-full text-center py-2 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg border border-green-500/20 uppercase tracking-wider">Aceita</div>
                                                    {isOwner && job.status === 'aberto' && (
                                                        <button onClick={() => router.push(`/checkout/${proposal.id}`)} className="w-full bg-[#FFAE00] text-black text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 hover:brightness-110">
                                                            <DollarSign className="w-3 h-3"/> Continuar Pagamento
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {!isOwner && proposal.status === 'contraproposta' && (
                                                <div className="p-3 bg-[#FFAE00]/10 border border-[#FFAE00]/30 rounded-lg">
                                                    <p className="text-xs font-bold text-[#FFAE00] mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Oferta do Cliente: R$ {proposal.counter_amount}</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleProgrammerResponse(proposal.id, 'accept_counter', proposal)} className="flex-1 bg-[#FFAE00] text-black text-[10px] font-bold py-1.5 rounded">Aceitar</button>
                                                        <button onClick={() => handleProgrammerResponse(proposal.id, 'reject_counter', proposal)} className="flex-1 border border-gray-600 text-gray-300 text-[10px] py-1.5 rounded hover:bg-white/5">Recusar</button>
                                                    </div>
                                                </div>
                                            )}

                                            {isOwner && proposal.status === 'contraproposta' && (
                                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                                                    <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider mb-1"><Clock className="w-3 h-3 inline mr-1"/> Aguardando Resposta</p>
                                                    <p className="text-xs text-gray-300">Você ofereceu <strong>R$ {proposal.counter_amount}</strong></p>
                                                </div>
                                            )}

                                            {isOwner && negotiatingProposalId === proposal.id && proposal.status === 'pendente' && (
                                                <div className="mt-2 p-3 bg-[#1A1D23] border border-white/5 rounded-lg flex flex-col gap-2 shadow-inner">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Zap className="w-3 h-3 text-[#FFAE00]"/> Fazer Contraproposta</p>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="number" 
                                                            placeholder="Novo Valor (R$)" 
                                                            className="flex-1 bg-[#0F1115] border border-white/10 text-xs p-2 rounded text-white focus:border-[#FFAE00] outline-none" 
                                                            value={counterAmount}
                                                            onChange={(e) => setCounterAmount(e.target.value)}
                                                        />
                                                        <button onClick={submitCounterProposal} disabled={!counterAmount} className="bg-[#FFAE00] text-black text-xs font-bold px-3 py-1.5 rounded hover:brightness-110 disabled:opacity-50 transition-all">Enviar</button>
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
                    <div id="negotiation-chat-section" className="bg-[#1A1D23] border border-[#FFAE00]/30 rounded-xl overflow-hidden shadow-2xl mt-2 mb-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
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

                {/* CONFIRM ACCEPT MODAL */}
                {confirmAcceptModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                        <div className="bg-[#1A1D23] border border-[#FFAE00]/30 p-6 md:p-8 rounded-2xl w-full max-w-md text-center shadow-[0_0_50px_rgba(255,174,0,0.15)] animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-[#FFAE00]/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,174,0,0.3)]">
                                <DollarSign className="w-8 h-8 text-[#FFAE00]" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">Ir para o Pagamento?</h3>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                Você está prestes a fechar negócio com este programador. O valor ficará retido com segurança até que a matriz seja entregue e aprovada por você.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setConfirmAcceptModal(null)}
                                    className="flex-1 bg-white/5 border border-white/10 text-white font-bold py-3.5 rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={() => handleAcceptProposal(confirmAcceptModal)}
                                    className="flex-1 bg-[#FFAE00] text-black font-black py-3.5 rounded-xl hover:brightness-110 transition-colors shadow-lg shadow-[#FFAE00]/20 flex items-center justify-center gap-2"
                                >
                                    Pagar Agora <Zap className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* REVISION REQUEST MODAL */}
                {showRevisionModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                        <div className="bg-[#1A1D23] border border-yellow-500/30 p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(234,179,8,0.15)] relative">
                            <button
                                onClick={() => setShowRevisionModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl border border-yellow-500/30 flex items-center justify-center shrink-0">
                                    <Wrench className="w-6 h-6 text-yellow-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">Solicitar Ajuste na Matriz</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Descreva o que aconteceu no teste para o programador corrigir.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        O que precisa ser ajustado? *
                                    </label>
                                    <textarea
                                        value={revisionNotes}
                                        onChange={e => setRevisionNotes(e.target.value)}
                                        placeholder="Ex: No teste em tecido piquet, o ponto da letra ficou muito denso e repuxou. Precisa reduzir um pouco os pontos e aumentar o contorno em 2mm..."
                                        className="w-full bg-[#0F1115] border border-white/10 rounded-xl p-3.5 text-sm text-gray-200 focus:border-yellow-500/50 min-h-[120px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        Foto do teste / defeito (opcional, mas recomendado)
                                    </label>
                                    <input
                                        type="file"
                                        id="revision-photo-input"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={e => setRevisionPhoto(e.target.files?.[0] || null)}
                                    />
                                    <label
                                        htmlFor="revision-photo-input"
                                        className="flex items-center gap-3 bg-[#0F1115] border border-white/10 hover:border-yellow-500/30 rounded-xl p-3.5 cursor-pointer text-xs text-gray-300 transition-colors"
                                    >
                                        <Camera className="w-5 h-5 text-yellow-400 shrink-0" />
                                        <span className="truncate">
                                            {revisionPhoto ? `Arquivo selecionado: ${revisionPhoto.name}` : 'Clique para anexar foto do bordado com defeito'}
                                        </span>
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowRevisionModal(false)}
                                        className="flex-1 bg-white/5 border border-white/10 text-gray-400 font-bold py-3.5 rounded-xl hover:bg-white/10 transition-colors text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={submittingRevision}
                                        onClick={handleRequestRevision}
                                        className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3.5 rounded-xl transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                                    >
                                        {submittingRevision ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                Enviando Ajuste...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Enviar Solicitação
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
