'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/helpers'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, MessageSquare, AlertCircle, CheckCircle, Package, Zap, User, X, Star, PenTool, Download, Upload, Send, Sparkles, DollarSign, Wrench, Camera, RotateCcw, Ruler, Maximize2, Handshake, Check } from 'lucide-react'
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

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
            </div>
        }>
            <JobDetailClient jobId={id} />
        </Suspense>
    )
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
    const searchParams = useSearchParams()
    const chatParam = searchParams.get('chat')
    const payParam = searchParams.get('pay')
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

    const loadData = useCallback(async () => {
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
            .select('*, users!jobs_cliente_id_fkey(name, avatar_url)')
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
                    if (msg.sender_id !== profile?.id) {
                        counts[msg.proposal_id] = (counts[msg.proposal_id] || 0) + 1
                    }
                })
                setUnreadCounts(counts)
            }
        }

        setLoading(false)
    }, [jobId, router])

    useEffect(() => {
        loadData()

        // 1. Listen for new proposals and messages
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
            }, (payload) => {
                const newRow = payload.new as any
                const oldRow = payload.old as any
                // If it belongs to this job, or if job_id is null in partial update, reload
                if (!newRow?.job_id || newRow?.job_id === jobId || oldRow?.job_id === jobId) {
                    loadData()
                }
            })
            .subscribe()

        // 2. High-speed silent polling fallback (every 3s) while the job page is open to guarantee zero-F5 sync
        const syncInterval = setInterval(() => {
            loadData()
        }, 3000)

        // 3. Sync immediately when window is refocused or tab becomes active
        const handleVisibilityOrFocus = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                loadData()
            }
        }
        window.addEventListener('focus', handleVisibilityOrFocus)
        document.addEventListener('visibilitychange', handleVisibilityOrFocus)

        // 4. Custom events triggered by notifications / popups
        const handleNotificationReload = () => {
            loadData()
        }
        window.addEventListener('bordadohub_reload_job', handleNotificationReload)
        window.addEventListener('bordadohub_notification', handleNotificationReload)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(syncInterval)
            window.removeEventListener('focus', handleVisibilityOrFocus)
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
            window.removeEventListener('bordadohub_reload_job', handleNotificationReload)
            window.removeEventListener('bordadohub_notification', handleNotificationReload)
        }
    }, [jobId, loadData, currentUser?.id])

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

    // Auto-open chat when arriving via notification with ?chat=...
    useEffect(() => {
        if (!chatParam || proposals.length === 0) return

        let targetId = chatParam
        if (chatParam === 'true' || chatParam === 'open') {
            const accepted = proposals.find((p: any) => p.status === 'aceita')
            const mine = proposals.find((p: any) => p.criador_id === currentUser?.id)
            targetId = accepted?.id || mine?.id || proposals[0]?.id
        }

        const found = proposals.find((p: any) => p.id === targetId)
        if (found || targetId) {
            setNegotiatingProposalId(targetId)
            setUnreadCounts(prev => ({ ...prev, [targetId]: 0 }))

            setTimeout(() => {
                const chatSection = document.getElementById('negotiation-chat-section')
                if (chatSection) {
                    chatSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    const inputEl = document.getElementById('chat-message-input') as HTMLInputElement | null
                    if (inputEl) inputEl.focus()
                }
            }, 300)
        }
    }, [chatParam, proposals.length, currentUser?.id])

    // Auto-open payment modal when arriving via notification with ?pay=...
    useEffect(() => {
        if (!payParam || proposals.length === 0) return
        const found = proposals.find((p: any) => p.id === payParam)
        if (found) {
            setConfirmAcceptModal(found.id)
            setTimeout(() => {
                const propCard = document.getElementById(`proposal-card-${found.id}`)
                if (propCard) {
                    propCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }, 300)
        }
    }, [payParam, proposals])

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
            const numericCounter = parseFloat(counterAmount)
            const { error } = await supabase
                .from('proposals')
                .update({
                    status: 'contraproposta',
                    counter_amount: numericCounter,
                    counter_message: counterMessage || 'Contraproposta do cliente'
                })
                .eq('id', negotiatingProposalId)

            if (error) throw error

            // Send notification message in chat
            await supabase.from('proposal_messages').insert({
                proposal_id: negotiatingProposalId,
                sender_id: currentUser?.id,
                content: `Fiz uma contraproposta oficial de R$ ${numericCounter.toFixed(2)}. Veja os detalhes e aceite para fecharmos!`
            })

            // Create notification for the programmer with direct link to chat
            const targetProp = proposals.find(p => p.id === negotiatingProposalId)
            if (targetProp?.criador_id) {
                await supabase.from('notifications').insert({
                    user_id: targetProp.criador_id,
                    type: 'contraproposta',
                    title: 'Contraproposta Recebida',
                    message: `O cliente fez uma contraproposta de R$ ${numericCounter.toFixed(2)} no pedido "${job?.title || 'Bordado'}".`,
                    link_url: `/jobs/${jobId}?chat=${negotiatingProposalId}`
                })
            }

            toast.success('Contraproposta enviada!')
            setCounterAmount('')
            setCounterMessage('')
            await loadData()
            router.refresh()
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
        }
    }

    const handleProgrammerResponse = async (proposalId: string, action: 'accept_counter' | 'reject_counter', proposal: Proposal) => {
        try {
            if (action === 'accept_counter') {
                const targetAmount = proposal.counter_amount || proposal.amount
                const { error } = await supabase
                    .from('proposals')
                    .update({
                        job_id: jobId,
                        amount: targetAmount,
                        status: 'pendente',
                        counter_amount: null,
                        counter_message: null
                    })
                    .eq('id', proposalId)

                if (error) throw error

                // Send update into chat
                await supabase.from('proposal_messages').insert({
                    proposal_id: proposalId,
                    sender_id: currentUser?.id,
                    content: `[CONTRAOFERTA ACEITA] Aceitei sua contraproposta de R$ ${Number(targetAmount).toFixed(2)}. O valor foi atualizado!`
                })

                // Notify client
                if (job?.cliente_id) {
                    await supabase.from('notifications').insert({
                        user_id: job.cliente_id,
                        type: 'contraproposta_aceita',
                        title: 'Contraproposta Aceita!',
                        message: `O produtor aceitou sua oferta de R$ ${Number(targetAmount).toFixed(2)} para o pedido "${job.title}". Conclua o pagamento para iniciar a produção.`,
                        link_url: `/jobs/${job.id}?pay=${proposalId}`
                    })
                }

                toast.success(`Oferta aceita! O valor foi atualizado para R$ ${Number(targetAmount).toFixed(2)}. Aguarde o pagamento do cliente.`)
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

                await supabase.from('proposal_messages').insert({
                    proposal_id: proposalId,
                    sender_id: currentUser?.id,
                    content: `[CONTRAOFERTA RECUSADA] O valor original de R$ ${Number(proposal.amount).toFixed(2)} foi mantido.`
                })

                toast.success('Contraproposta recusada. Valor original mantido.')
            }
            await loadData()
            router.refresh()
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

    const [cancellingReserve, setCancellingReserve] = useState(false)

    const handleCancelReservation = async (proposalId: string, role: 'programmer' | 'client') => {
        const confirmMsg = role === 'programmer'
            ? 'Deseja realmente cancelar a espera por este pagamento? O pedido será liberado no feed público e sua proposta será descartada para você não ficar preso.'
            : 'Deseja desistir desta contratação e voltar a ver outras propostas para seu pedido?'
        
        if (!window.confirm(confirmMsg)) return

        setCancellingReserve(true)
        try {
            const res = await fetch('/api/jobs/cancel-reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proposalId, cancelledBy: role })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao cancelar reserva')

            toast.success(role === 'programmer' ? 'Pedido liberado com sucesso! Você está livre.' : 'Contratação cancelada. Pedido reaberto!')
            router.refresh()
            window.location.reload()
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
        } finally {
            setCancellingReserve(false)
        }
    }

    const handleDownloadReferenceImage = async (url: string, index: number) => {
        try {
            toast.info('Iniciando download da imagem...')
            const res = await fetch(url)
            const blob = await res.blob()
            const ext = url.split('.').pop()?.split('?')[0] || 'jpg'
            const safeTitle = (job?.title || 'referencia').replace(/[^a-zA-Z0-9_-]/g, '_')
            const fileName = `${safeTitle}_referencia_${index + 1}.${ext}`
            saveAs(blob, fileName)
            toast.success('Download da imagem concluído!')
        } catch (err) {
            console.error('Download error:', err)
            window.open(url, '_blank')
        }
    }

    const handleDownloadAllReferenceImages = async () => {
        if (!job?.image_urls || job.image_urls.length === 0) return
        toast.info('Compactando imagens de referência... aguarde.')
        try {
            const zip = new JSZip()
            for (let i = 0; i < job.image_urls.length; i++) {
                const url = job.image_urls[i]
                const res = await fetch(url)
                const blob = await res.blob()
                const ext = url.split('.').pop()?.split('?')[0] || 'jpg'
                const safeTitle = (job?.title || 'matriz').replace(/[^a-zA-Z0-9_-]/g, '_')
                zip.file(`${safeTitle}_arte_${i + 1}.${ext}`, blob)
            }
            const content = await zip.generateAsync({ type: 'blob' })
            saveAs(content, `${(job.title || 'referencias').replace(/[^a-zA-Z0-9_-]/g, '_')}_referencias.zip`)
            toast.success('Download das referências concluído!')
        } catch (err) {
            console.error('Zip error:', err)
            toast.error('Erro ao compactar imagens de referência.')
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
    const hasAnyAcceptedProposal = proposals.some((p: any) => p.status === 'aceita')
    const isJobLocked = job.status !== 'aberto' || hasAnyAcceptedProposal
    const showProposalForm = !isOwner && !isJobLocked && !hasAlreadySentProposal

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
                            <div className="w-full md:w-1/3 min-h-[220px] bg-black/40 border-r border-white/5 relative flex flex-col justify-between group">
                                <div className="relative flex-1 min-h-[180px] flex items-center justify-center overflow-hidden">
                                    {job.image_urls[0].toLowerCase().includes('.pdf') ? (
                                        <iframe src={`${job.image_urls[0]}#toolbar=0&navpanes=0&scrollbar=0`} className="absolute inset-0 w-full h-full" />
                                    ) : (
                                        <img src={job.image_urls[0]} alt="Referência" className="max-h-full max-w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                                        <a
                                            href={job.image_urls[0]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-lg backdrop-blur-sm transition-all"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5 text-[#FFAE00]" />
                                            Ver Completa
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadReferenceImage(job.image_urls[0], 0)}
                                            className="inline-flex items-center gap-1.5 bg-[#FFAE00] hover:bg-yellow-400 text-black text-xs font-black px-3 py-2 rounded-lg shadow-lg transition-all"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Baixar
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-[#0F1115] border-t border-white/5 flex items-center justify-between gap-2">
                                    <a
                                        href={job.image_urls[0]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1A1D23] hover:bg-white/5 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold py-1.5 px-2 rounded-lg transition-colors"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5 text-[#FFAE00]" />
                                        Ver Imagem Completa
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadReferenceImage(job.image_urls[0], 0)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#FFAE00]/10 hover:bg-[#FFAE00]/20 text-[#FFAE00] border border-[#FFAE00]/30 text-xs font-bold py-1.5 px-2 rounded-lg transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Baixar Imagem
                                    </button>
                                </div>
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
                    {job.image_urls && job.image_urls.length > 0 && (
                        <div className="p-5 bg-[#0F1115]/60 border-t border-white/5">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                                <div>
                                    <h3 className="text-xs font-bold text-[#FFAE00] uppercase tracking-wider flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5 text-[#FFAE00]" />
                                        Artes e Imagens de Referência do Pedido ({job.image_urls.length} {job.image_urls.length === 1 ? 'arquivo' : 'arquivos'}):
                                    </h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        Baixe a imagem original em alta resolução para abrir no seu programa de matrizes (Wilcom, Embird, PE-Design, etc.)
                                    </p>
                                </div>
                                {job.image_urls.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={handleDownloadAllReferenceImages}
                                        className="inline-flex items-center gap-1.5 bg-[#FFAE00] hover:bg-yellow-400 text-black px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition-all shrink-0 hover:scale-105 active:scale-95"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Baixar Todas as Artes (.zip)
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {job.image_urls.map((url, idx) => {
                                    const isPdf = url.toLowerCase().includes('.pdf')
                                    const dimParts = job.dimensions?.split('|') || []
                                    const label = dimParts[idx] ? dimParts[idx].trim() : `Arte ${idx + 1}`

                                    return (
                                        <div key={idx} className="bg-[#1A1D23] border border-white/10 rounded-xl p-3 flex flex-col justify-between group hover:border-[#FFAE00]/50 transition-all shadow-md">
                                            <div className="h-32 w-full bg-black/40 rounded-lg flex items-center justify-center overflow-hidden relative mb-2.5">
                                                {isPdf ? (
                                                    <iframe src={`${url}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full pointer-events-none" />
                                                ) : (
                                                    <img src={url} alt={label} className="max-h-full max-w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
                                                )}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity p-2">
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-all text-xs font-bold flex items-center gap-1"
                                                        title="Ver em tamanho real"
                                                    >
                                                        <Maximize2 className="w-3.5 h-3.5 text-[#FFAE00]" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadReferenceImage(url, idx)}
                                                        className="p-2 bg-[#FFAE00] hover:bg-yellow-400 text-black rounded-lg shadow transition-all text-xs font-bold flex items-center gap-1"
                                                        title="Baixar imagem original"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mb-2">
                                                <span className="text-xs font-bold text-gray-200 block truncate" title={label}>
                                                    {label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 inline-flex items-center justify-center gap-1 bg-[#0F1115] hover:bg-white/5 text-gray-300 hover:text-white border border-white/10 text-[11px] font-semibold py-1.5 px-2 rounded-lg transition-colors"
                                                >
                                                    <Maximize2 className="w-3 h-3 text-[#FFAE00]" />
                                                    Ver
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadReferenceImage(url, idx)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1 bg-[#FFAE00]/10 hover:bg-[#FFAE00]/20 text-[#FFAE00] border border-[#FFAE00]/30 text-[11px] font-bold py-1.5 px-2 rounded-lg transition-colors"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    Baixar
                                                </button>
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

                            {/* ARTES DE REFERÊNCIA DO COMPRADOR (CARDS VISÍVEIS) */}
                            {job.image_urls && job.image_urls.length > 0 && (
                                <div className="mt-8 pt-8 border-t border-white/10 w-full max-w-2xl mx-auto text-left animate-in fade-in duration-300">
                                    {/* Header da Seção */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#FFAE00] shrink-0">
                                                <Package className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-white">
                                                        Artes de Referência
                                                    </h3>
                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-medium whitespace-nowrap">
                                                        {job.image_urls.length} {job.image_urls.length === 1 ? 'imagem' : 'imagens'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    Arquivos enviados para a criação da matriz
                                                </p>
                                            </div>
                                        </div>

                                        {job.image_urls.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={handleDownloadAllReferenceImages}
                                                className="inline-flex items-center gap-1.5 bg-[#FFAE00] hover:bg-yellow-400 text-black px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all shrink-0 active:scale-95 whitespace-nowrap"
                                            >
                                                <Download className="w-3.5 h-3.5" /> Baixar Todas (.zip)
                                            </button>
                                        )}
                                    </div>

                                    {/* Grid de Cards das Artes */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                                        {job.image_urls.map((url, idx) => {
                                            const isPdf = url.toLowerCase().includes('.pdf')
                                            const dimParts = job.dimensions ? job.dimensions.split('|') : []
                                            const label = dimParts[idx]?.trim() || `Arte ${idx + 1}`

                                            return (
                                                <div 
                                                    key={idx} 
                                                    className="bg-[#0F1115] border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-all duration-200 flex flex-col group shadow-sm hover:shadow-lg hover:shadow-black/50"
                                                >
                                                    {/* Canvas com Proporção Quadrada e Fundo Escuro */}
                                                    <div className="relative aspect-square w-full bg-black/40 flex items-center justify-center p-3 overflow-hidden">
                                                        {/* Badge de numeração discreto no topo */}
                                                        <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono font-medium text-gray-400 border border-white/10">
                                                            #{idx + 1}
                                                        </span>

                                                        {isPdf ? (
                                                            <div className="flex flex-col items-center justify-center text-gray-400 gap-2 p-4 text-center">
                                                                <PenTool className="w-8 h-8 text-[#FFAE00]" />
                                                                <span className="text-[11px] font-medium text-gray-300">Documento PDF</span>
                                                            </div>
                                                        ) : (
                                                            <img 
                                                                src={url} 
                                                                alt={label} 
                                                                className="max-h-full max-w-full object-contain p-1 transition-transform duration-300 group-hover:scale-105" 
                                                            />
                                                        )}

                                                        {/* Hover overlay rápido para abrir original */}
                                                        <a 
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                            title="Ver imagem original em tela cheia"
                                                        >
                                                            <span className="bg-black/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/20 flex items-center gap-1 backdrop-blur-sm">
                                                                <Maximize2 className="w-3 h-3 text-[#FFAE00]" /> Abrir
                                                            </span>
                                                        </a>
                                                    </div>

                                                    {/* Rodapé do Card com Nome e Ações Alinhadas */}
                                                    <div className="p-3 bg-[#0F1115] border-t border-white/5 flex flex-col gap-2">
                                                        <p className="text-xs font-medium text-gray-200 truncate" title={label}>
                                                            {label}
                                                        </p>

                                                        {/* Botões Perfeitamente Proporcionais (50% / 50%) */}
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-medium transition-colors border border-white/10 text-center whitespace-nowrap"
                                                                title="Abrir em tamanho real"
                                                            >
                                                                <Maximize2 className="w-3 h-3 text-[#FFAE00] shrink-0" />
                                                                <span>Ver</span>
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDownloadReferenceImage(url, idx)}
                                                                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#FFAE00] hover:bg-yellow-400 text-black text-[11px] font-bold transition-all shadow-sm active:scale-95 text-center whitespace-nowrap"
                                                                title="Baixar arquivo original"
                                                            >
                                                                <Download className="w-3 h-3 shrink-0" />
                                                                <span>Baixar</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
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
                                            <CheckCircle className="w-3 h-3" /> {job.revision_notes ? 'Matriz Revisada Pronta para Teste' : 'Matriz Pronta para Teste'}
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4">
                                            {job.revision_notes ? 'Sua matriz revisada está pronta!' : 'Sua matriz está pronta!'}
                                        </h2>
                                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                            {job.revision_notes ? (
                                                <>O programador <strong className="text-white">{acceptedProposal?.users?.name}</strong> enviou a <strong>versão revisada da matriz com as alterações solicitadas</strong>. Baixe os arquivos abaixo e faça um novo teste na sua máquina. Você tem até <strong className="text-[#FFAE00]">24 horas</strong> para aprovar ou solicitar novos ajustes antes da liberação automática.</>
                                            ) : (
                                                <>O programador <strong className="text-white">{acceptedProposal?.users?.name}</strong> finalizou o trabalho. Baixe os arquivos abaixo e faça um teste na sua máquina. Você tem até <strong className="text-[#FFAE00]">24 horas</strong> para testar o bordado ou solicitar ajustes antes da liberação automática.</>
                                            )}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                                            <Package className="w-3 h-3" /> {job.revision_notes ? 'Correção da Matriz Enviada com Sucesso' : 'Matriz Entregue com Sucesso'}
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4">
                                            {job.revision_notes ? 'Matriz Revisada Enviada para o Comprador!' : 'Matriz Enviada para o Comprador!'}
                                        </h2>
                                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                            {job.revision_notes ? (
                                                <>Você enviou a <strong>versão revisada da matriz</strong> atendendo aos ajustes solicitados pelo comprador. O cliente foi notificado para testar o novo arquivo na máquina. Caso ele não avalie ou solicite novas revisões dentro do prazo de <strong className="text-[#FFAE00]">24 horas</strong>, o pagamento será liberado automaticamente para você.</>
                                            ) : (
                                                <>Você já enviou os arquivos da matriz. O cliente foi notificado para testar o bordado na máquina. Caso ele não avalie ou solicite revisões dentro do prazo de <strong className="text-[#FFAE00]">24 horas</strong>, o pagamento será liberado automaticamente para você.</>
                                            )}
                                        </p>
                                    </>
                                )}
                                
                                {job.revision_notes && (
                                    <div className="bg-yellow-500/10 p-3.5 rounded-xl border border-yellow-500/20 mb-4 text-xs text-yellow-300">
                                        <p className="font-bold uppercase tracking-wider text-[10px] text-yellow-400 mb-1">Ajuste que havia sido solicitado:</p>
                                        <p className="italic text-gray-300">&quot;{job.revision_notes}&quot;</p>
                                    </div>
                                )}

                                {job.delivery_notes && (
                                    <div className="bg-[#0F1115] p-4 rounded-xl border border-white/5 mb-6 text-sm text-gray-400">
                                        <p className="font-bold uppercase tracking-wider text-[10px] text-gray-500 mb-1">
                                            {job.revision_notes ? 'Notas da Correção do Produtor:' : 'Notas da Entrega:'}
                                        </p>
                                        <p className="italic">&quot;{job.delivery_notes}&quot;</p>
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
                                                {isOwner 
                                                    ? (job.revision_notes ? `Arquivos da Matriz Revisada (${urls.length})` : `Arquivos para Download (${urls.length})`) 
                                                    : (job.revision_notes ? `Arquivos da Matriz Revisada Entregues (${urls.length})` : `Arquivos Entregues (${urls.length})`)}
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
                                            <p className="font-bold text-white">Já testou o bordado?</p>
                                            <p className="text-gray-300 leading-relaxed text-[11px]">
                                                Recomendamos fazer um teste no tecido antes de avaliar. Se precisar de ajustes agora, use o botão <strong>Pedir Ajuste / Revisão</strong> ao lado.
                                            </p>
                                            <p className="text-[10px] text-amber-400 font-semibold">
                                                Fique tranquilo: mesmo após aprovar, você terá 7 dias de garantia para solicitar correções na matriz!
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
                                            <h4 className="text-sm font-bold text-[#FFAE00] mb-1 leading-none pt-0.5">Avaliação do Cliente (até 24h)</h4>
                                            <p className="text-xs text-gray-500 leading-relaxed text-left">
                                                O comprador tem até 24 horas para testar o bordado. Se ele não avaliar nem solicitar ajustes nesse prazo, o valor é liberado automaticamente.
                                            </p>
                                        </div>

                                        {/* Etapa 3: Futura */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-[24px] h-[24px] bg-gray-800 rounded-full border-4 border-[#1A1D23] z-10"></div>
                                            <h4 className="text-sm font-bold text-gray-600 mb-1 leading-none pt-0.5">Pagamento Liberado</h4>
                                            <p className="text-xs text-gray-600 text-left">
                                                O repasse via PIX é liberado imediatamente após a aprovação ou ao final do prazo de 24 horas.
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
                            {/* Left Side: Always accessible downloads & personalized messages */}
                            <div className="flex-1 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-white/5">
                                {isOwner ? (
                                    <>
                                        <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                                            <CheckCircle className="w-3 h-3" /> Pedido Concluído & Pago
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-2">Matriz Aprovada e Concluída! 🏆</h2>
                                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                            Parabéns! Sua matriz foi 100% aprovada e está pronta para bordar. Os arquivos ficam salvos permanentemente na sua conta e você pode baixá-los a qualquer momento.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        {jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5 ? (
                                            <div className="inline-flex items-center gap-2 bg-[#FFAE00]/20 text-[#FFAE00] border border-[#FFAE00]/40 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-6 shadow-[0_0_15px_rgba(255,174,0,0.2)]">
                                                <Sparkles className="w-3.5 h-3.5 text-[#FFAE00]" /> Avaliação Máxima • 5 Estrelas
                                            </div>
                                        ) : jobReview && (jobReview.rating_matrix + jobReview.rating_service) >= 8 ? (
                                            <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 border border-green-500/40 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-6">
                                                <Star className="w-3.5 h-3.5 fill-green-400 text-green-400" /> Ótimo Trabalho • Avaliação Positiva
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                                                <CheckCircle className="w-3 h-3" /> Pedido Concluído & Aprovado
                                            </div>
                                        )}

                                        <h2 className="text-3xl font-black text-white mb-2">
                                            {jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5
                                                ? 'Excelente Trabalho! Parabéns! 🚀🌟'
                                                : jobReview && (jobReview.rating_matrix + jobReview.rating_service) >= 8
                                                ? 'Parabéns pela Entrega Concluída! 🎯'
                                                : 'Missão Cumprida! Pedido Finalizado 🎯'}
                                        </h2>

                                        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                            {jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5 ? (
                                                <>
                                                    O comprador avaliou sua entrega com <strong className="text-[#FFAE00]">nota máxima (5 estrelas)</strong>! Sua precisão nos pontos, pontualidade e capricho fazem toda a diferença no BordadoHUB. Continue mantendo esse padrão de excelência — <strong className="text-white">profissionais 5 estrelas ganham maior destaque e preferência em novos pedidos!</strong>
                                                </>
                                            ) : jobReview && (jobReview.rating_matrix + jobReview.rating_service) >= 8 ? (
                                                <>
                                                    O comprador aprovou sua matriz e deixou uma excelente avaliação! Seu capricho e atendimento fortalecem sua reputação na comunidade BordadoHUB. Continue produzindo matrizes de alto nível!
                                                </>
                                            ) : (
                                                <>
                                                    O cliente aprovou sua entrega e o pedido foi marcado como 100% concluído. Bom trabalho! Continue produzindo e expandindo sua clientela no BordadoHUB.
                                                </>
                                            )}
                                        </p>

                                        {/* Card Financeiro / Repasse do Produtor */}
                                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(34,197,94,0.08)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-lg shrink-0">
                                                    💰
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-green-400 uppercase tracking-wider">Pagamento Liberado para Repasse</p>
                                                    <p className="text-sm font-bold text-white mt-0.5">
                                                        Valor da sua proposta: <span className="text-green-400 font-black">R$ {acceptedProposal?.amount ? acceptedProposal.amount.toFixed(2) : '---'}</span>
                                                    </p>
                                                    <p className="text-[11px] text-gray-400">
                                                        O pagamento do comprador foi confirmado e o valor será repassado via PIX para sua chave cadastrada.
                                                    </p>
                                                </div>
                                            </div>
                                            <Link
                                                href="/producao"
                                                className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 hover:scale-105 active:scale-95 shadow-md"
                                            >
                                                <Package className="w-3.5 h-3.5" />
                                                Minha Produção
                                            </Link>
                                        </div>
                                    </>
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

                                {/* GARANTIA DE AJUSTE OU CORREÇÃO (PÓS-AVALIAÇÃO - APENAS PARA O COMPRADOR) */}
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
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Star className="w-5 h-5 text-[#FFAE00] fill-[#FFAE00]" />
                                        {isOwner ? 'Avaliação do Projeto' : 'Avaliação Recebida do Cliente'}
                                    </h3>
                                    {!isOwner && jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5 && (
                                        <span className="inline-block mt-2 text-[11px] font-bold bg-amber-500/20 text-[#FFAE00] border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                                            🏆 Desempenho 10/10 • Cliente Satisfeito
                                        </span>
                                    )}
                                </div>

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
                                                {!isOwner && <p className="text-[10px] text-gray-500 uppercase not-italic font-bold mb-1">Comentário do Comprador:</p>}
                                                &quot;{jobReview.comment}&quot;
                                            </div>
                                        )}

                                        <div className="pt-2 flex flex-col gap-2">
                                            {!isOwner && (
                                                <span className="inline-flex items-center gap-1.5 text-xs text-[#FFAE00] bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 font-bold">
                                                    <Sparkles className="w-3.5 h-3.5 text-[#FFAE00]" /> Pontuação adicionada ao seu perfil profissional!
                                                </span>
                                            )}
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
                                {amount && Number(amount) > 0 && (
                                    <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
                                        <span>Proposta: <strong className="text-white">R$ {Number(amount).toFixed(2)}</strong></span>
                                        <span>Taxa da plataforma (5%): <strong className="text-[#FFAE00]">R$ {(Number(amount) * 0.05).toFixed(2)}</strong></span>
                                        <span>Você recebe líquido: <strong className="text-green-400">R$ {(Number(amount) * 0.95).toFixed(2)}</strong></span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Buyer Alert: Pending Payment */}
                        {isOwner && acceptedProposal && job.status === 'aberto' && (
                            <div className="mb-6 bg-gradient-to-r from-yellow-500/15 via-[#FFAE00]/10 to-transparent border border-yellow-500/30 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                                <div className="flex items-start sm:items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-400 px-2.5 py-0.5 rounded-full">
                                            Aguardando Seu Pagamento
                                        </span>
                                        <p className="text-sm font-bold text-white mt-1">
                                            Você aceitou a proposta de {acceptedProposal.users?.name || 'um profissional'} no valor de <strong className="text-yellow-400">R$ {acceptedProposal.amount?.toFixed(2)}</strong>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Conclua o pagamento para o programador começar a criar sua matriz. O valor fica 100% seguro em custódia até você aprovar.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <Link
                                        href={`/checkout/${acceptedProposal.id}`}
                                        className="inline-flex items-center gap-2 bg-[#FFAE00] hover:bg-yellow-400 text-black px-5 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#FFAE00]/10"
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        Pagar Agora
                                    </Link>
                                    <button
                                        onClick={() => handleCancelReservation(acceptedProposal.id, 'client')}
                                        disabled={cancellingReserve}
                                        className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors"
                                        title="Desistir e reabrir o pedido para outras propostas"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Desistir / Outro
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Programmer Alert: Waiting Payment or Already Sent */}
                        {!isOwner && hasAlreadySentProposal && myExistingProposal && (
                            myExistingProposal.status === 'aceita' ? (
                                <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                                    <div className="flex items-start sm:items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0">
                                            <Clock className="w-5 h-5 animate-pulse" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-400 px-2.5 py-0.5 rounded-full">
                                                    Proposta Aceita • Aguardando Pagamento
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-white mt-1">
                                                O comprador aceitou sua proposta no valor de <strong className="text-yellow-400">R$ {myExistingProposal.amount?.toFixed(2)}</strong>
                                            </p>
                                            <p className="text-xs text-gray-300 mt-1">
                                                <strong>Atenção:</strong> Não inicie a criação da matriz ainda. Seu prazo ({myExistingProposal.deadline_text || 'combinado'}) só começará a contar após a confirmação do pagamento em custódia.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                        <button
                                            onClick={() => handleNegotiate(myExistingProposal.id)}
                                            className="inline-flex items-center gap-2 bg-[#FFAE00] hover:bg-yellow-400 text-black px-4 py-2 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-md"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Chat com Cliente
                                        </button>
                                        <button
                                            onClick={() => handleCancelReservation(myExistingProposal.id, 'programmer')}
                                            disabled={cancellingReserve}
                                            className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                            title="Se o cliente demorar para pagar, você pode liberar o pedido para não ficar preso"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            {cancellingReserve ? 'Liberando...' : 'Liberar Pedido'}
                                        </button>
                                    </div>
                                </div>
                            ) : myExistingProposal.status === 'contraproposta' && myExistingProposal.counter_amount ? (
                                <div className="mb-6 bg-[#FFAE00]/15 border-2 border-[#FFAE00] p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(255,174,0,0.15)] animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-start sm:items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-[#FFAE00]/20 text-[#FFAE00] flex items-center justify-center shrink-0 border border-[#FFAE00]/30 shadow-inner">
                                            <Handshake className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[11px] font-black uppercase tracking-wider bg-[#FFAE00] text-black px-2.5 py-0.5 rounded-full shadow-sm">
                                                    Contraproposta Recebida
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    Sua proposta inicial: R$ {myExistingProposal.amount?.toFixed(2)}
                                                </span>
                                            </div>
                                            <p className="text-base font-bold text-white leading-snug">
                                                O cliente ofereceu <strong className="text-[#FFAE00] text-lg">R$ {Number(myExistingProposal.counter_amount).toFixed(2)}</strong> para fechar este trabalho!
                                            </p>
                                            <p className="text-xs text-gray-300 mt-1">
                                                Ao aceitar a oferta, o valor da sua proposta será atualizado para <strong>R$ {Number(myExistingProposal.counter_amount).toFixed(2)}</strong> e o cliente poderá pagar.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0 flex-wrap">
                                        <button
                                            onClick={() => handleProgrammerResponse(myExistingProposal.id, 'accept_counter', myExistingProposal)}
                                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#FFAE00] hover:bg-yellow-400 text-black px-5 py-3 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#FFAE00]/20"
                                        >
                                            <Check className="w-4 h-4" />
                                            Aceitar Oferta (R$ {Number(myExistingProposal.counter_amount).toFixed(2)})
                                        </button>
                                        <button
                                            onClick={() => handleProgrammerResponse(myExistingProposal.id, 'reject_counter', myExistingProposal)}
                                            className="inline-flex items-center justify-center gap-1.5 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white px-3 py-3 rounded-xl text-xs font-bold transition-colors hover:bg-white/5 active:scale-95"
                                            title="Recusar contraproposta e manter seu valor original"
                                        >
                                            <X className="w-4 h-4" />
                                            Recusar
                                        </button>
                                        <button
                                            onClick={() => handleNegotiate(myExistingProposal.id)}
                                            className="inline-flex items-center justify-center gap-1.5 bg-[#1A1D23] hover:bg-white/5 text-gray-300 px-4 py-3 rounded-xl text-xs font-bold border border-white/10 transition-colors"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            Chat
                                        </button>
                                    </div>
                                </div>
                            ) : (
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
                            )
                        )}

                        {!isOwner && isJobLocked && !hasAlreadySentProposal && (
                            <div className="mb-6 bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center gap-3">
                                <Handshake className="w-5 h-5 text-[#FFAE00] shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-white">Negócio Fechado • Em Produção</p>
                                    <p className="text-xs text-gray-400">Este pedido já fechou proposta com outro profissional e está em produção. Não está mais aceitando novas propostas.</p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 overflow-x-auto pb-2 snap-x custom-scrollbar">
                            {proposals.length === 0 ? (
                                <div className="w-full text-center py-6 text-gray-500 text-sm">Nenhuma proposta enviada.</div>
                            ) : (
                                proposals.map((proposal: any) => (
                                    <div key={proposal.id} id={`proposal-card-${proposal.id}`} className={`min-w-[280px] max-w-[320px] shrink-0 bg-[#0F1115] rounded-xl border p-4 snap-start transition-all ${negotiatingProposalId === proposal.id ? 'border-[#FFAE00] shadow-[0_0_15px_rgba(255,174,0,0.1)]' : 'border-white/5 hover:border-white/10'}`}>
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
                                                        <button onClick={() => setConfirmAcceptModal(proposal.id)} className="flex-1 bg-[#FFAE00] hover:bg-yellow-400 text-black text-xs font-black py-2.5 rounded-lg transition-all shadow-md shadow-[#FFAE00]/10 flex items-center justify-center gap-1.5 active:scale-95"><Zap className="w-3.5 h-3.5 fill-black"/> Pagar Agora</button>
                                                        <button onClick={() => handleNegotiate(proposal.id)} className={`flex-1 border text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 relative ${negotiatingProposalId === proposal.id ? 'bg-white/10 text-white border-white/20' : 'border-white/10 text-gray-400 hover:text-white'}`}>
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

                                            {!isOwner && proposal.status === 'contraproposta' && proposal.criador_id === currentUser?.id && (
                                                <div className="p-3 bg-[#FFAE00]/10 border border-[#FFAE00]/30 rounded-xl mt-2">
                                                    <p className="text-xs font-bold text-[#FFAE00] mb-2 flex items-center gap-1.5">
                                                        <Handshake className="w-3.5 h-3.5"/> Oferta do Cliente: R$ {Number(proposal.counter_amount).toFixed(2)}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleProgrammerResponse(proposal.id, 'accept_counter', proposal)} 
                                                            className="flex-1 bg-[#FFAE00] hover:bg-yellow-400 text-black text-xs font-black py-2 rounded-lg transition-all shadow flex items-center justify-center gap-1 active:scale-95"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Aceitar Oferta (R$ {Number(proposal.counter_amount).toFixed(2)})
                                                        </button>
                                                        <button 
                                                            onClick={() => handleProgrammerResponse(proposal.id, 'reject_counter', proposal)} 
                                                            className="border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1 active:scale-95"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            Recusar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {isOwner && proposal.status === 'contraproposta' && (
                                                <div className="flex flex-col gap-2 mt-2">
                                                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                                                        <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider mb-1"><Clock className="w-3 h-3 inline mr-1"/> Aguardando Resposta</p>
                                                        <p className="text-xs text-gray-300">Você ofereceu <strong>R$ {Number(proposal.counter_amount).toFixed(2)}</strong></p>
                                                    </div>
                                                    <button onClick={() => handleNegotiate(proposal.id)} className={`w-full border text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 relative ${negotiatingProposalId === proposal.id ? 'bg-white/10 text-white border-white/20' : 'border-white/10 text-gray-400 hover:text-white'}`}>
                                                        <MessageSquare className="w-3 h-3"/> {negotiatingProposalId === proposal.id ? 'Ocultar Chat' : 'Abrir Chat'}
                                                        {unreadCounts[proposal.id] > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-lg animate-bounce">{unreadCounts[proposal.id]}</span>}
                                                    </button>
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
                    <div 
                        id="negotiation-chat-section" 
                        className="fixed inset-0 z-50 md:static md:z-auto h-[100dvh] md:h-[560px] w-full bg-[#111b21] md:border md:border-white/10 md:rounded-2xl overflow-hidden shadow-2xl md:mt-4 md:mb-8 animate-in slide-in-from-bottom-4 fade-in duration-300"
                    >
                        <div className="h-full">
                            <NegotiationChat
                                proposalId={negotiatingProposalId}
                                currentUserId={currentUser?.id}
                                isOwner={isOwner}
                                senderName={currentUser?.name || 'Usuário'}
                                jobId={jobId}
                                initialAmount={proposals.find(p => p.id === negotiatingProposalId)?.amount || 0}
                                onProposalUpdated={loadData}
                                onClose={() => setNegotiatingProposalId(null)}
                                otherUser={(() => {
                                    const p = proposals.find(p => p.id === negotiatingProposalId)
                                    if (isOwner) {
                                        return {
                                            name: p?.users?.name || 'Programador',
                                            avatar_url: p?.users?.avatar_url || null,
                                            role: 'Programador'
                                        }
                                    } else {
                                        return {
                                            name: (job as any)?.users?.name || 'Cliente',
                                            avatar_url: (job as any)?.users?.avatar_url || null,
                                            role: 'Cliente'
                                        }
                                    }
                                })()}
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
                            <h3 className="text-3xl font-black text-white mb-2">Matriz Enviada com Sucesso!</h3>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                Parabéns pelo trabalho! O comprador já foi notificado.<br/><br/>
                                <strong className="text-white">O pagamento será liberado</strong> automaticamente em <strong>24 horas</strong> caso o cliente não solicite revisões, ou imediatamente após a avaliação.
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
