'use client'

import React, { useEffect, useState, useCallback, useRef, Suspense, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/helpers'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, MessageSquare, AlertCircle, CheckCircle, Package, Zap, User, X, Star, PenTool, Download, Upload, Send, Sparkles, DollarSign, Wrench, Camera, RotateCcw, Ruler, Maximize2, Handshake, Check, Code } from 'lucide-react'
import NegotiationChat from '@/components/NegotiationChat'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface ParsedMatrix {
    name: string
    size: string
    fabric: string
    notes?: string
    image_url?: string | null
}

function getMatrixList(job: Job | null): ParsedMatrix[] {
    if (!job) return []

    // 1. JSON estruturado em dimensions
    if (job.dimensions && typeof job.dimensions === 'string' && job.dimensions.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(job.dimensions)
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item: any, idx: number) => ({
                    name: item.name || `Matriz ${idx + 1}`,
                    size: item.size || 'Conforme arte',
                    fabric: item.fabric || job.fabric_type || 'A combinar',
                    notes: item.notes || '',
                    image_url: item.image_url || job.image_urls?.[idx] || job.image_urls?.[0] || null
                }))
            }
        } catch (e) {
            console.error('Failed to parse dimensions JSON:', e)
        }
    }

    // 2. Legado com separador pipe '|'
    if (job.dimensions && typeof job.dimensions === 'string' && job.dimensions.includes('|')) {
        const parts = job.dimensions.split('|').map(s => s.trim()).filter(Boolean)
        return parts.map((part, idx) => {
            let name = `Matriz ${idx + 1}`
            let size = part
            let fabric = job.fabric_type || 'A combinar'
            const notes = ''

            const nameMatch = part.match(/^(?:\d+[\.\)]\s*)?([^:]+):/i)
            if (nameMatch) {
                name = nameMatch[1].trim()
            }

            const fabricMatch = part.match(/\(Tecido:\s*([^)]+)\)/i)
            if (fabricMatch) {
                fabric = fabricMatch[1].trim()
                size = size.replace(/\(Tecido:[^)]+\)/i, '').trim()
            }

            if (size.includes(':')) {
                size = size.split(':').slice(1).join(':').trim()
            }

            return {
                name,
                size: size || 'Conforme arte',
                fabric,
                notes,
                image_url: job.image_urls?.[idx] || job.image_urls?.[0] || null
            }
        })
    }

    // 3. Matriz individual tradicional
    return [{
        name: 'Matriz Principal',
        size: job.dimensions || 'Conforme arte',
        fabric: job.fabric_type || 'A combinar',
        notes: '',
        image_url: job.image_urls?.[0] || null
    }]
}

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
        reviews_count?: number
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
    const [selectedMatrixIdx, setSelectedMatrixIdx] = useState(0)
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
    const isFetchingRef = useRef(false)

    const loadData = useCallback(async () => {
        if (isFetchingRef.current) return
        isFetchingRef.current = true
        try {
            // 1. Fetch current user session in parallel without blocking
            const authPromise = (async () => {
                const { data: { session } } = await supabase.auth.getSession()
                const user = session?.user
                if (!user) return null
                let { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('supabase_user_id', user.id)
                    .maybeSingle()
                return profile
            })().catch(err => {
                console.warn('Auth session check error:', err)
                return null
            })

            // 2. Fetch full job details from fast server API route
            const apiPromise = fetch(`/api/jobs/${jobId}`, {
                cache: 'no-store',
                signal: AbortSignal.timeout(6000)
            }).then(r => r.json()).catch(err => {
                console.warn('API error fetching job detail:', err)
                return null
            })

            const [profile, apiData] = await Promise.all([authPromise, apiPromise])

            if (profile) setCurrentUser(profile)

            if (apiData && apiData.job) {
                setJob(apiData.job)
                setProposals(apiData.proposals || [])
                if (apiData.review) setJobReview(apiData.review)
                if (apiData.transaction) setJobTransaction(apiData.transaction)
                if (apiData.unreadCounts) setUnreadCounts(apiData.unreadCounts)
            }

            // Auto-mark notifications for this job as read
            if (profile?.id) {
                supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', profile.id)
                    .eq('is_read', false)
                    .like('link_url', `%${jobId}%`)
                    .then(() => {
                        // Dispatch event so NotificationBell updates its count
                        window.dispatchEvent(new CustomEvent('bordadohub_notification_read'))
                    })
            }
        } catch (err) {
            console.error('Error in loadData:', err)
        } finally {
            isFetchingRef.current = false
            setLoading(false)
        }
    }, [jobId])

    // Ref to track currentUser id for realtime callbacks without causing re-renders
    const currentUserIdRef = useRef<string | null>(null)
    useEffect(() => {
        currentUserIdRef.current = currentUser?.id || null
    }, [currentUser?.id])

    useEffect(() => {
        loadData()

        // 1. Listen for new proposals, messages, and job status changes
        const channel = supabase
            .channel(`job_updates_${jobId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'proposal_messages',
            }, (payload) => {
                const newMsg = payload.new as any
                setUnreadCounts(prev => {
                    if (newMsg.sender_id !== currentUserIdRef.current) {
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
                const targetJobId = newRow?.job_id || oldRow?.job_id
                if (targetJobId === jobId || (!targetJobId && payload.eventType === 'DELETE')) {
                    loadData()
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'jobs',
                filter: `id=eq.${jobId}`,
            }, () => {
                // Instantly reload when job status changes (e.g. payment confirmed)
                loadData()
            })
            .subscribe()

        // 2. Polling fallback (every 5s)
        const syncInterval = setInterval(() => {
            loadData()
        }, 5000)

        // 3. Sync immediately when window is refocused
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
    }, [jobId, loadData])

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

        // Safety gate: verify programmer profile readiness
        const isReady = Boolean(
            currentUser?.is_programmer ||
            (currentUser?.skills && currentUser?.skills.length > 0) ||
            currentUser?.role === 'criador'
        )

        if (!isReady) {
            toast.error('Ative seu perfil de programador com seus softwares dominados antes de enviar propostas.')
            setSubmitting(false)
            return
        }

        try {
            let creatorId = currentUser?.id

            if (!creatorId) {
                const { data: { session } } = await supabase.auth.getSession()
                const user = session?.user
                if (!user) {
                    toast.error('Você precisa estar logado para enviar uma proposta.')
                    router.push('/login')
                    return
                }

                const { data: userProfile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('supabase_user_id', user.id)
                    .maybeSingle()

                if (userProfile?.id) {
                    creatorId = userProfile.id
                } else if (user.email) {
                    const res = await fetch('/api/create-profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.id,
                            email: user.email,
                            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
                            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                            role: 'criador'
                        })
                    })
                    const resData = await res.json()
                    creatorId = resData?.data?.id
                }
            }

            if (!creatorId) {
                throw new Error('Não foi possível identificar o seu perfil de usuário. Por favor, recarregue a página e tente novamente.')
            }

            const { error } = await supabase
                .from('proposals')
                .insert([{
                    job_id: jobId,
                    criador_id: creatorId,
                    amount: parseFloat(amount),
                    message,
                    deadline_text: deadline,
                    status: 'pendente'
                }])

            if (error) throw error

            // Notify the job owner about the new proposal
            if (job?.cliente_id) {
                const creatorName = currentUser?.name || 'Um produtor'
                await supabase.from('notifications').insert({
                    user_id: job.cliente_id,
                    type: 'nova_proposta',
                    title: 'Nova proposta recebida',
                    message: `${creatorName} enviou uma proposta de R$ ${parseFloat(amount).toFixed(2)} para "${job.title || 'seu pedido'}"`,
                    link_url: `/jobs/${jobId}`,
                    is_read: false
                })
            }

            toast.success('Proposta enviada com sucesso!')
            router.refresh()
            window.location.reload()
        } catch (err: any) {
            toast.error('Erro ao enviar proposta: ' + (err.message || 'Erro desconhecido'))
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
                // Sanitize file name
                const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
                const fileName = `${jobId}_${safeName}`
                const filePath = `deliveries/${fileName}`

                // Use fetch-based upload to avoid supabase client auth issues
                const formData = new FormData()
                formData.append('file', file)
                formData.append('bucket', 'job-deliveries')
                formData.append('path', filePath)
                formData.append('originalName', file.name)

                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout

                try {
                    const uploadRes = await fetch('/api/upload-delivery', {
                        method: 'POST',
                        body: formData,
                        signal: controller.signal
                    })
                    clearTimeout(timeoutId)

                    const uploadData = await uploadRes.json()
                    if (!uploadRes.ok) throw new Error(uploadData.error || 'Erro no upload')

                    publicUrls.push(uploadData.publicUrl)
                } catch (uploadErr: any) {
                    clearTimeout(timeoutId)
                    if (uploadErr.name === 'AbortError') {
                        throw new Error(`Upload do arquivo "${file.name}" excedeu o tempo limite. Tente novamente.`)
                    }
                    throw new Error(`Erro no upload de "${file.name}": ${uploadErr.message}`)
                }
            }

            await handleDeliverMatrix(deliveryNotes, publicUrls.join(','))
        } catch (err: any) {
            toast.error('Erro no upload: ' + err.message)
        } finally {
            setDelivering(false)
        }
    }

    const handleDeliverMatrix = async (deliveryNotes: string, fileUrls: string) => {
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
    }

    const handleSubmitReview = async (mRating: number, sRating: number, comment: string) => {
        if (!acceptedProposal) return

        try {
            const response = await fetch('/api/jobs/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId,
                    reviewerId: currentUser?.id,
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
            ? 'Deseja realmente cancelar a espera por este pagamento? O pedido será liberado no mural de pedidos de clientes e sua proposta será descartada para você não ficar preso.'
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

    const handleDownloadReferenceImage = async (url: string, index: number, customName?: string) => {
        try {
            toast.info('Iniciando download da imagem...')
            const res = await fetch(url)
            const blob = await res.blob()
            const ext = url.split('.').pop()?.split('?')[0] || 'jpg'
            const safeTitle = (customName || job?.title || 'referencia').replace(/[^a-zA-Z0-9_-]/g, '_')
            const fileName = `${safeTitle}_arte_${index + 1}.${ext}`
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

    const getCleanDeliveryFileName = (url: string) => {
        try {
            // First check URL query parameter ?download=
            const urlObj = new URL(url, 'https://bordadohub.com')
            const queryDownload = urlObj.searchParams.get('download')
            if (queryDownload) {
                return decodeURIComponent(queryDownload)
            }
        } catch {
            // Fallback to path extraction
        }
        const lastPart = (url.split('?')[0] || '').split('/').pop() || 'arquivo'
        const decoded = decodeURIComponent(lastPart)
        const parts = decoded.split('_')
        return parts.length > 1 ? parts.slice(1).join('_') : decoded
    }

    const handleDownloadDeliveryFile = async (url: string) => {
        const fileName = getCleanDeliveryFileName(url)
        try {
            toast.info(`Baixando ${fileName}...`)
            const res = await fetch(url)
            if (!res.ok) throw new Error('Falha na resposta do servidor')
            const blob = await res.blob()
            saveAs(blob, fileName)
            toast.success(`Download de ${fileName} concluído!`)
        } catch (err) {
            console.error('Download delivery file error:', err)
            // Fallback: direct window open with download attribute
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            a.target = '_blank'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        }
    }

    const matrixList = useMemo(() => getMatrixList(job), [job])
    const safeMatrixIdx = Math.min(selectedMatrixIdx, Math.max(0, matrixList.length - 1))
    const currentMatrix = matrixList[safeMatrixIdx] || matrixList[0] || {
        name: 'Matriz Principal',
        size: 'Conforme arte',
        fabric: 'A combinar',
        notes: '',
        image_url: null
    }
    const activeImageUrl = currentMatrix?.image_url || job?.image_urls?.[safeMatrixIdx] || job?.image_urls?.[0] || null

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
    const isProgrammerReady = Boolean(
        currentUser?.is_programmer ||
        (currentUser?.skills && currentUser?.skills.length > 0) ||
        currentUser?.role === 'criador'
    )

    const urgencyLabels: Record<string, string> = {
        'urgente': 'Urgente (24h)',
        'prazo_curto': 'Prazo Curto (3-5 dias)',
        'sem_pressa': 'Sem Pressa'
    }

    const statusSteps = [
        { key: 'aberto', label: 'Publicado', desc: 'Recebendo Propostas', icon: Package },
        { key: 'em_progresso', label: 'Em Produção', desc: 'Digitalização da Matriz', icon: PenTool },
        { key: 'entregue', label: 'Entregue', desc: 'Teste de Máquina (24h)', icon: Clock },
        { key: 'finalizado', label: 'Concluído', desc: 'Pagamento Liberado', icon: CheckCircle }
    ]

    const currentStepIndex = job.status === 'aberto' ? 0
        : (job.status === 'em_progresso' || job.status === 'em_revisao') ? 1
        : job.status === 'entregue' ? 2
        : job.status === 'finalizado' ? 3
        : 0

    return (
        <div className="min-h-screen bg-[#0B0D11] py-4 px-4 sm:px-6 lg:px-8 text-slate-100">
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <Link
                    href="/pedidos"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-[#F5A623] transition-colors text-xs font-bold uppercase tracking-wider w-fit"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Voltar aos Pedidos
                </Link>

                {/* Status Progress Tracker Bar */}
                <div className="bg-[#12151C] border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative">
                        {statusSteps.map((step, idx) => {
                            const StepIcon = step.icon
                            const isCompleted = currentStepIndex > idx
                            const isCurrent = currentStepIndex === idx
                            return (
                                <div
                                    key={step.key}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                                        isCurrent
                                            ? 'bg-[#181C26] border border-[#F5A623]/40 shadow-sm shadow-[#F5A623]/5'
                                            : isCompleted
                                            ? 'bg-emerald-500/5 border border-emerald-500/20'
                                            : 'bg-transparent opacity-40 border border-transparent'
                                    }`}
                                >
                                    <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                                            isCurrent
                                                ? 'bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-black font-black scale-105 shadow-md shadow-[#FFB703]/20'
                                                : isCompleted
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-white/5 text-gray-500'
                                        }`}
                                    >
                                        {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`text-xs font-bold truncate leading-tight ${
                                                isCurrent ? 'text-white' : isCompleted ? 'text-emerald-300' : 'text-gray-400'
                                            }`}
                                        >
                                            {step.label}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{step.desc}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 1. TOP SECTION: Job Detail (Unified Card for Single Matrix and Kits) */}
                <div className="bg-[#12151C] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
                    <div className="flex flex-col md:flex-row">
                        {/* Foto à esquerda */}
                        <div className="w-full md:w-80 lg:w-96 min-h-[300px] bg-[#0B0D11] border-r border-white/[0.07] relative flex flex-col justify-between group shrink-0">
                            <div className="relative flex-1 min-h-[240px] flex items-center justify-center overflow-hidden p-4">
                                {activeImageUrl ? (
                                    activeImageUrl.toLowerCase().includes('.pdf') ? (
                                        <iframe src={`${activeImageUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="absolute inset-0 w-full h-full" />
                                    ) : (
                                        <img
                                            src={activeImageUrl}
                                            alt={currentMatrix.name}
                                            className="max-h-64 max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                                        />
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-500 py-12">
                                        <Package className="w-12 h-12 opacity-30 mb-2" />
                                        <span className="text-xs">Sem foto cadastrada</span>
                                    </div>
                                )}

                                {/* Badge no topo da foto */}
                                {activeImageUrl && (
                                    <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                                        <span className="bg-black/80 backdrop-blur-md text-[#FFAE00] border border-[#FFAE00]/30 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow">
                                            {matrixList.length > 1 ? `Foto: ${currentMatrix.name} (${safeMatrixIdx + 1}/${matrixList.length})` : currentMatrix.name}
                                        </span>
                                    </div>
                                )}

                                {/* Hover overlay rápido para ver e baixar */}
                                {activeImageUrl && (
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                                        <a
                                            href={activeImageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-lg backdrop-blur-sm transition-all"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5 text-[#FFAE00]" />
                                            Ver Completa
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadReferenceImage(activeImageUrl, safeMatrixIdx, currentMatrix.name)}
                                            className="inline-flex items-center gap-1.5 bg-[#FFAE00] hover:bg-yellow-400 text-black text-xs font-black px-3 py-2 rounded-lg shadow-lg transition-all"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Baixar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Ações da Imagem no Rodapé */}
                            {activeImageUrl && (
                                <div className="p-3 bg-[#0F1115] border-t border-white/5 flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <a
                                            href={activeImageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1A1D23] hover:bg-white/5 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold py-2 px-2 rounded-lg transition-colors"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5 text-[#FFAE00]" />
                                            Ver Completa
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadReferenceImage(activeImageUrl, safeMatrixIdx, currentMatrix.name)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#FFAE00]/10 hover:bg-[#FFAE00]/20 text-[#FFAE00] border border-[#FFAE00]/30 text-xs font-bold py-2 px-2 rounded-lg transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Baixar Imagem
                                        </button>
                                    </div>
                                    {job.image_urls && job.image_urls.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={handleDownloadAllReferenceImages}
                                            className="w-full inline-flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[11px] font-medium py-1.5 px-2 rounded-lg transition-colors"
                                        >
                                            <Download className="w-3 h-3 text-[#FFAE00]" />
                                            Baixar Todas as Imagens (.zip)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Informações à direita */}
                        <div className="w-full md:flex-1 p-6 flex flex-col justify-between">
                            <div>
                                {/* Título Principal & Status */}
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                                    <div>
                                        <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F3F4F6] tracking-tight">{job.title}</h1>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            {matrixList.length > 1 && (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFAE00] bg-[#FFAE00]/10 border border-[#FFAE00]/30 px-3 py-1 rounded-full shadow-sm">
                                                    <Package className="w-3.5 h-3.5" />
                                                    Kit com {matrixList.length} Matrizes
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0F1115] border border-gray-800 rounded-full text-xs text-gray-300">
                                                <Clock className="w-3 h-3 text-[#FFAE00]" />
                                                Prazo: {urgencyLabels[job.urgency] || job.urgency}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-start">
                                        <span className="px-3.5 py-1.5 bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/25 rounded-full text-xs font-bold tracking-wider uppercase">
                                            {job.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                {/* Botões lado a lado para selecionar cada matriz contida no kit */}
                                {matrixList.length > 1 && (
                                    <div className="mb-4">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-[#FFAE00]" />
                                            Selecione a matriz para carregar suas informações e foto:
                                        </p>
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-gray-800">
                                            {matrixList.map((m, idx) => {
                                                const isSelected = safeMatrixIdx === idx
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setSelectedMatrixIdx(idx)}
                                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap shrink-0 border ${
                                                            isSelected
                                                                ? 'bg-[#FFAE00] text-black border-[#FFAE00] shadow-[0_0_15px_rgba(255,174,0,0.35)] scale-[1.02]'
                                                                : 'bg-[#0F1115] hover:bg-white/5 text-gray-300 hover:text-white border-white/10 hover:border-white/20'
                                                        }`}
                                                    >
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                            isSelected ? 'bg-black text-[#FFAE00]' : 'bg-white/10 text-gray-400'
                                                        }`}>
                                                            {idx + 1}
                                                        </span>
                                                        <span>{m.name}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Informações importantes logo abaixo */}
                                <div className="bg-[#0F1115]/80 border border-white/10 rounded-xl p-4 sm:p-5 mb-4 shadow-inner">
                                    <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
                                        <h3 className="text-xs font-black text-[#FFAE00] uppercase tracking-wider flex items-center gap-1.5">
                                            <Ruler className="w-4 h-4 text-[#FFAE00]" />
                                            {matrixList.length > 1 ? `Especificações: ${currentMatrix.name}` : 'Especificações da Matriz'}
                                        </h3>
                                        {matrixList.length > 1 && (
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                Matriz {safeMatrixIdx + 1} de {matrixList.length}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3">
                                        <div className="bg-[#1A1D23] border border-white/5 rounded-lg p-3">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                Tamanho Desejado
                                            </span>
                                            <span className="text-sm font-black text-white flex items-center gap-1.5">
                                                <Ruler className="w-3.5 h-3.5 text-[#FFAE00]" />
                                                {currentMatrix.size || 'Conforme arte'}
                                            </span>
                                        </div>

                                        <div className="bg-[#1A1D23] border border-white/5 rounded-lg p-3">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                Tipo de Tecido
                                            </span>
                                            <span className="text-sm font-black text-white flex items-center gap-1.5">
                                                <Package className="w-3.5 h-3.5 text-[#FFAE00]" />
                                                {currentMatrix.fabric || job.fabric_type || 'A combinar'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Observação específica da matriz */}
                                    {currentMatrix.notes && (
                                        <div className="bg-[#1A1D23] border border-white/5 rounded-lg p-3 mb-3">
                                            <span className="text-[10px] font-bold text-[#FFAE00] uppercase tracking-wider block mb-1 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-[#FFAE00]" /> Observação desta Matriz
                                            </span>
                                            <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                                                {currentMatrix.notes}
                                            </p>
                                        </div>
                                    )}

                                    {/* Formatos Solicitados */}
                                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Formatos:</span>
                                        {job.formats && job.formats.length > 0 ? (
                                            job.formats.map((fmt, idx) => (
                                                <span key={idx} className="px-2.5 py-0.5 bg-[#1A1D23] border border-[#FFAE00]/30 text-[#FFAE00] rounded text-[11px] uppercase font-black">
                                                    {fmt}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400">Qualquer formato compatível</span>
                                        )}
                                    </div>
                                </div>

                                {/* Aviso sobre o pacote de matrizes */}
                                {matrixList.length > 1 && (
                                    <div className="bg-amber-500/10 border-l-4 border-[#FFAE00] p-3 rounded-r-lg mb-4 text-xs text-amber-200/90 leading-relaxed">
                                        <span className="font-bold text-[#FFAE00] flex items-center gap-1.5 mb-1">
                                            <Sparkles className="w-3.5 h-3.5" /> Aviso sobre o Pacote de Matrizes:
                                        </span>
                                        Este pedido contempla a digitalização de <strong>todas as {matrixList.length} matrizes</strong> do kit. Ao enviar sua proposta, considere o valor e prazo total para entregar o conjunto completo.
                                    </div>
                                )}

                                {/* Descrição geral do pedido */}
                                {job.description && (
                                    <div className="mb-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                            Descrição Geral do Pedido:
                                        </span>
                                        <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap bg-black/20 p-3 rounded-lg border border-white/5">
                                            {job.description}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Rodapé do Card */}
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-800/50 text-[11px] text-gray-500">
                                <span className="font-mono">ID: #{job.id.slice(0, 8)}</span>
                                <div className="flex items-center gap-1 font-bold">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    Publicado em {formatDate(job.created_at)}
                                </div>
                            </div>
                        </div>
                    </div>
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
                    <div className="bg-[#12151C] border border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)] mb-8">
                        <div className="flex flex-col lg:flex-row">
                            {/* Left Side: Owner gets test/download/revision; Programmer gets confirmation + file list */}
                            <div className="flex-1 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-white/[0.07]">
                                {isOwner ? (
                                    <>
                                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                                            <CheckCircle className="w-3 h-3" /> {job.revision_notes ? 'Matriz Revisada Pronta para Teste' : 'Matriz Pronta para Teste'}
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4">
                                            {job.revision_notes ? 'Sua matriz revisada está pronta!' : 'Sua matriz está pronta!'}
                                        </h2>
                                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                            {job.revision_notes ? (
                                                <>O programador <strong className="text-white">{acceptedProposal?.users?.name}</strong> enviou a <strong>versão revisada da matriz com as alterações solicitadas</strong>. Baixe os arquivos abaixo e faça um novo teste na sua máquina. Você tem até <strong className="text-[#F5A623]">24 horas</strong> para aprovar ou solicitar novos ajustes antes da liberação automática.</>
                                            ) : (
                                                <>O programador <strong className="text-white">{acceptedProposal?.users?.name}</strong> finalizou o trabalho. Baixe os arquivos abaixo e faça um teste na sua máquina. Você tem até <strong className="text-[#F5A623]">24 horas</strong> para testar o bordado ou solicitar ajustes antes da liberação automática.</>
                                            )}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                                            <Package className="w-3 h-3" /> {job.revision_notes ? 'Correção da Matriz Enviada com Sucesso' : 'Matriz Entregue com Sucesso'}
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4">
                                            {job.revision_notes ? 'Matriz Revisada Enviada para o Comprador!' : 'Matriz Enviada para o Comprador!'}
                                        </h2>
                                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                            {job.revision_notes ? (
                                                <>Você enviou a <strong>versão revisada da matriz</strong> atendendo aos ajustes solicitados pelo comprador. O cliente foi notificado para testar o novo arquivo na máquina. Caso ele não avalie ou solicite novas revisões dentro do prazo de <strong className="text-[#F5A623]">24 horas</strong>, o pagamento será liberado automaticamente para você.</>
                                            ) : (
                                                <>Você já enviou os arquivos da matriz. O cliente foi notificado para testar o bordado na máquina. Caso ele não avalie ou solicite revisões dentro do prazo de <strong className="text-[#F5A623]">24 horas</strong>, o pagamento será liberado automaticamente para você.</>
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
                                    <div className="bg-[#0B0D11] p-4 rounded-xl border border-white/[0.07] mb-6 text-sm text-gray-400">
                                        <p className="font-bold uppercase tracking-wider text-[10px] text-gray-500 mb-1">
                                            {job.revision_notes ? 'Notas da Correção do Produtor:' : 'Notas da Entrega:'}
                                        </p>
                                        <p className="italic">&quot;{job.delivery_notes}&quot;</p>
                                    </div>
                                )}

                                {/* Ficha Técnica da Matriz Entregue */}
                                <div className="bg-[#181C26] border border-white/[0.07] rounded-xl p-4 mb-6 shadow-inner">
                                    <div className="flex items-center justify-between mb-3 border-b border-white/[0.07] pb-2">
                                        <span className="text-xs font-bold text-[#F5A623] uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Especificações Técnicas da Entrega
                                        </span>
                                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                                            Apto para Bastidor
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                                        <div className="bg-[#0B0D11] border border-white/[0.07] p-2.5 rounded-lg">
                                            <span className="text-[10px] text-gray-500 block uppercase font-bold">Bastidor / Tamanho</span>
                                            <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                                                <Ruler className="w-3 h-3 text-[#F5A623]" />
                                                {currentMatrix?.size || job.dimensions || 'Conforme arte'}
                                            </span>
                                        </div>
                                        <div className="bg-[#0B0D11] border border-white/[0.07] p-2.5 rounded-lg">
                                            <span className="text-[10px] text-gray-500 block uppercase font-bold">Tecido Recomendado</span>
                                            <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                                                <Package className="w-3 h-3 text-[#F5A623]" />
                                                {currentMatrix?.fabric || job.fabric_type || 'A combinar'}
                                            </span>
                                        </div>
                                        <div className="bg-[#0B0D11] border border-white/[0.07] p-2.5 rounded-lg col-span-2 sm:col-span-1">
                                            <span className="text-[10px] text-gray-500 block uppercase font-bold">Formatos Inclusos</span>
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                {job.formats && job.formats.length > 0 ? (
                                                    job.formats.map((fmt, i) => (
                                                        <span key={i} className="text-[10px] font-bold text-[#F5A623] bg-[#F5A623]/10 px-1.5 py-0.5 rounded">
                                                            {fmt}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-white font-bold">Compatíveis</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {job.delivery_url && (() => {
                                    const urls = job.delivery_url.split(',')
                                    const handleDownloadAll = async () => {
                                        toast.info('Compactando arquivos... aguarde.')
                                        try {
                                            const zip = new JSZip()
                                            for (const url of urls) {
                                                const res = await fetch(url)
                                                const blob = await res.blob()
                                                zip.file(getCleanDeliveryFileName(url), blob)
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
                                                {urls.map((url, i) => {
                                                    const cleanName = getCleanDeliveryFileName(url)
                                                    return (
                                                        <button 
                                                            key={i}
                                                            type="button"
                                                            onClick={() => handleDownloadDeliveryFile(url)}
                                                            title={`Baixar ${cleanName}`}
                                                            className="inline-flex items-center gap-2 bg-[#0F1115] hover:bg-green-500/20 border border-white/10 hover:border-green-500/50 text-gray-300 hover:text-green-400 px-4 py-2 rounded-lg transition-all text-xs cursor-pointer active:scale-95"
                                                        >
                                                            <Download className="w-3.5 h-3.5 text-green-400" />
                                                            <span>{cleanName}</span>
                                                        </button>
                                                    )
                                                })}
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
                                        <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-2">
                                            Matriz Aprovada e Concluída!
                                            <Sparkles className="w-6 h-6 text-[#F5A623]" />
                                        </h2>
                                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                            Parabéns! Sua matriz foi 100% aprovada e está pronta para bordar. Os arquivos ficam salvos permanentemente na sua conta e você pode baixá-los a qualquer momento.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        {jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5 ? (
                                            <div className="inline-flex items-center gap-2 bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/40 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-6 shadow-[0_0_15px_rgba(245,166,35,0.2)]">
                                                <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" /> Avaliação Máxima • 5 Estrelas
                                            </div>
                                        ) : jobReview && (jobReview.rating_matrix + jobReview.rating_service) >= 8 ? (
                                            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-6">
                                                <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" /> Ótimo Trabalho • Avaliação Positiva
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                                                <CheckCircle className="w-3 h-3" /> Pedido Concluído & Aprovado
                                            </div>
                                        )}

                                        <h2 className="text-3xl font-black text-white mb-2">
                                            {jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5
                                                ? 'Excelente Trabalho! Parabéns!'
                                                : jobReview && (jobReview.rating_matrix + jobReview.rating_service) >= 8
                                                ? 'Parabéns pela Entrega Concluída!'
                                                : 'Missão Cumprida! Pedido Finalizado'}
                                        </h2>

                                        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                            {jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5 ? (
                                                <>
                                                    O comprador avaliou sua entrega com <strong className="text-[#F5A623]">nota máxima (5 estrelas)</strong>! Sua precisão nos pontos, pontualidade e capricho fazem toda a diferença no BordadoHUB. Continue mantendo esse padrão de excelência — <strong className="text-white">profissionais 5 estrelas ganham maior destaque e preferência em novos pedidos!</strong>
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
                                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
                                                    <DollarSign className="w-5 h-5 text-emerald-400" />
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
                                    const handleDownloadAll = async () => {
                                        toast.info('Compactando arquivos... aguarde.')
                                        try {
                                            const zip = new JSZip()
                                            for (const url of urls) {
                                                const res = await fetch(url)
                                                const blob = await res.blob()
                                                zip.file(getCleanDeliveryFileName(url), blob)
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
                                                {urls.map((url, i) => {
                                                    const cleanName = getCleanDeliveryFileName(url)
                                                    return (
                                                        <button 
                                                            key={i}
                                                            type="button"
                                                            onClick={() => handleDownloadDeliveryFile(url)}
                                                            title={`Baixar ${cleanName}`}
                                                            className="inline-flex items-center gap-2 bg-[#0F1115] hover:bg-green-500/20 border border-white/10 hover:border-green-500/50 text-gray-300 hover:text-green-400 px-4 py-2 rounded-lg transition-all text-xs cursor-pointer active:scale-95"
                                                        >
                                                            <Download className="w-3.5 h-3.5 text-green-400" />
                                                            <span>{cleanName}</span>
                                                        </button>
                                                    )
                                                })}
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
                                        <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30 px-3 py-1 rounded-full">
                                            <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
                                            Desempenho 10/10 • Cliente Satisfeito
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
                            isProgrammerReady ? (
                                <div className="mb-6 bg-[#0F1115] p-4 sm:p-5 rounded-2xl border border-[#FFAE00]/20 shadow-lg">
                                    <div className="text-xs font-black text-[#FFAE00] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5" /> Enviar Proposta de Orçamento
                                    </div>
                                    <form onSubmit={handleSubmitProposal} className="space-y-3 md:space-y-0 md:flex md:gap-3 md:items-end">
                                        <div className="grid grid-cols-2 gap-3 md:contents">
                                            {/* Campo Valor */}
                                            <div className="w-full md:w-36 lg:w-44 shrink-0">
                                                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                                    Valor (R$)
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">R$</span>
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        min="1"
                                                        inputMode="decimal"
                                                        required 
                                                        value={amount} 
                                                        onChange={e => setAmount(e.target.value)} 
                                                        className="w-full bg-[#1A1D23] border border-white/10 focus:border-[#FFAE00] rounded-xl pl-8 pr-2.5 py-2.5 text-base md:text-sm font-bold text-white placeholder-gray-500 focus:outline-none transition-colors" 
                                                        placeholder="0,00" 
                                                    />
                                                </div>
                                            </div>

                                            {/* Campo Prazo */}
                                            <div className="w-full md:w-36 lg:w-44 shrink-0">
                                                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                                    Prazo
                                                </label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={deadline} 
                                                    onChange={e => setDeadline(e.target.value)} 
                                                    className="w-full bg-[#1A1D23] border border-white/10 focus:border-[#FFAE00] rounded-xl px-3 py-2.5 text-base md:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors font-medium" 
                                                    placeholder="ex: 2 dias, 24h" 
                                                />
                                            </div>
                                        </div>

                                        {/* Campo Mensagem */}
                                        <div className="flex-1 min-w-0">
                                            <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                                Mensagem / Diferencial
                                            </label>
                                            <input 
                                                type="text" 
                                                required 
                                                value={message} 
                                                onChange={e => setMessage(e.target.value)} 
                                                className="w-full bg-[#1A1D23] border border-white/10 focus:border-[#FFAE00] rounded-xl px-3.5 py-2.5 text-base md:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors font-medium" 
                                                placeholder="Descreva seu prazo, qualidade ou software..." 
                                            />
                                        </div>

                                        {/* Botão Enviar */}
                                        <div className="w-full md:w-auto shrink-0 pt-1 md:pt-0">
                                            <button 
                                                type="submit" 
                                                disabled={submitting} 
                                                className="w-full md:w-auto bg-gradient-to-r from-[#FFAE00] to-yellow-400 hover:from-yellow-400 hover:to-[#FFAE00] text-black font-extrabold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-[#FFAE00]/10 hover:scale-[1.02] active:scale-95 disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
                                            >
                                                <Send className="w-4 h-4" />
                                                Enviar Proposta
                                            </button>
                                        </div>
                                    </form>
                                    {amount && Number(amount) > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
                                            <span>Sua Proposta: <strong className="text-white font-bold">R$ {Number(amount).toFixed(2)}</strong></span>
                                            <span>Taxa (5%): <strong className="text-[#FFAE00] font-bold">R$ {(Number(amount) * 0.05).toFixed(2)}</strong></span>
                                            <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-0.5 rounded-md font-bold">
                                                Você recebe líquido: R$ {(Number(amount) * 0.95).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-6 bg-[#12151C] p-5 rounded-2xl border border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                                    <div className="flex items-center gap-3.5">
                                        <div className="p-3 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] shrink-0">
                                            <Code className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Quer enviar uma proposta para este pedido?</h3>
                                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                                                Para garantir segurança e qualidade técnica, ative seu perfil de programador configurando seus softwares e dados de PIX.
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/profile/${currentUser?.id || ''}?edit=true&activate=programmer`}
                                        className="shrink-0 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#FFB703]/10 text-center w-full sm:w-auto"
                                    >
                                        Ativar Perfil de Programador
                                    </Link>
                                </div>
                            )
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
                                    <div key={proposal.id} id={`proposal-card-${proposal.id}`} className={`min-w-[280px] max-w-[320px] shrink-0 bg-[#12151C] rounded-2xl border p-4 snap-start transition-all ${negotiatingProposalId === proposal.id ? 'border-[#F5A623] shadow-[0_0_15px_rgba(245,166,35,0.15)]' : 'border-white/[0.07] hover:border-white/20'}`}>
                                        <div className="flex flex-col mb-3 bg-[#181C26] p-3 rounded-xl border border-white/[0.07] relative shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 overflow-hidden relative shadow-sm shrink-0">
                                                    {proposal.users?.avatar_url ? (
                                                        <img src={proposal.users.avatar_url} className="w-full h-full object-cover" alt=""/>
                                                    ) : <User className="w-5 h-5 m-auto text-gray-500 mt-2.5"/>}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="text-sm font-bold text-white leading-tight truncate">
                                                        {proposal.users?.name || 'Profissional'} 
                                                    </div>
                                                    {proposal.users?.reviews_count && proposal.users.reviews_count > 0 && proposal.users?.rating ? (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Star className="w-3 h-3 text-[#F5A623] fill-[#F5A623]" />
                                                            <span className="text-white text-xs font-bold">{Number(proposal.users.rating).toFixed(1)}</span>
                                                            <span className="text-[10px] text-gray-500">({proposal.users.reviews_count})</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="text-[10px] text-gray-500 font-medium">Novo profissional</span>
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mt-0.5">#{proposal.id.split('-')[0]}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center bg-[#0B0D11] p-2.5 rounded-lg border border-white/[0.07]">
                                                <p className="text-lg font-black text-[#F5A623] leading-none tracking-tight">R$ {proposal.amount.toFixed(2)}</p>
                                                <p className="text-[10px] text-gray-400 flex items-center gap-1 font-medium bg-[#181C26] px-2 py-1 rounded-md border border-white/[0.07]"><Clock className="w-3 h-3 text-[#F5A623]"/> {proposal.deadline_text}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 line-clamp-2 mt-4 mb-4 h-8 bg-black/20 p-2 rounded border border-white/[0.07] italic">&ldquo;{proposal.message}&rdquo;</p>
                                        
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2 relative">
                                                {isOwner && proposal.status === 'pendente' && (
                                                    <>
                                                        <button onClick={() => setConfirmAcceptModal(proposal.id)} className="flex-1 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 text-black text-xs font-black py-2.5 rounded-xl transition-all shadow-md shadow-[#FFB703]/10 flex items-center justify-center gap-1.5 active:scale-95"><Zap className="w-3.5 h-3.5 fill-black"/> Pagar Agora</button>
                                                        <button onClick={() => handleNegotiate(proposal.id)} className={`flex-1 border text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1 relative ${negotiatingProposalId === proposal.id ? 'bg-white/10 text-white border-white/20' : 'border-white/[0.07] text-gray-400 hover:text-white'}`}>
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
                                                        <div className="relative flex-1">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">R$</span>
                                                            <input 
                                                                type="number" 
                                                                step="0.01"
                                                                min="1"
                                                                inputMode="decimal"
                                                                placeholder="0,00" 
                                                                className="w-full bg-[#0F1115] border border-white/10 text-sm font-bold pl-8 pr-2.5 py-2 rounded-lg text-white focus:border-[#FFAE00] outline-none" 
                                                                value={counterAmount}
                                                                onChange={(e) => setCounterAmount(e.target.value)}
                                                            />
                                                        </div>
                                                        <button onClick={submitCounterProposal} disabled={!counterAmount} className="bg-[#FFAE00] text-black text-xs font-extrabold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all whitespace-nowrap">Enviar</button>
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
