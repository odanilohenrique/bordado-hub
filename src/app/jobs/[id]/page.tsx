'use client'

import React, { useEffect, useState, useCallback, useRef, Suspense, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/helpers'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, MessageSquare, AlertCircle, CheckCircle, Package, Zap, User, X, Star, PenTool, Download, Upload, Send, Sparkles, DollarSign, Wrench, Camera, Ruler, Maximize2, Handshake, Check, Code, Loader2, Trash2, Lock } from 'lucide-react'
import NegotiationChat from '@/components/NegotiationChat'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { clearCache, getCached, setCached } from '@/lib/clientCache'
import { useAuth } from '@/contexts/AuthContext'

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

function JobDetailSkeleton() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] py-4 px-4 sm:px-6 lg:px-8 text-[var(--text-primary)] animate-pulse">
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                {/* Back button skeleton */}
                <div className="h-4 w-36 bg-[var(--border-hairline)] rounded-lg" />

                {/* Status Progress Tracker Bar Skeleton */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-4 sm:p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-surface-elevated)]">
                                <div className="w-9 h-9 rounded-xl bg-[var(--border-hairline)] shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="h-3 w-16 bg-[var(--border-hairline)] rounded" />
                                    <div className="h-2 w-24 bg-[var(--border-hairline)] rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Job Card Skeleton */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden md:flex">
                    <div className="w-full md:w-80 h-72 md:h-auto bg-[var(--bg-surface-elevated)] p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[var(--border-hairline)]">
                        <div className="w-48 h-48 rounded-xl bg-[var(--border-hairline)]" />
                    </div>
                    <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-start gap-4">
                                <div className="h-7 w-2/3 bg-[var(--border-hairline)] rounded-lg" />
                                <div className="h-6 w-20 bg-[var(--border-hairline)] rounded-full" />
                            </div>
                            <div className="h-4 w-32 bg-[var(--border-hairline)] rounded-full" />
                            <div className="h-24 bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl p-4 mt-3" />
                        </div>
                        <div className="h-10 w-full bg-[var(--border-hairline)] rounded-xl mt-4" />
                    </div>
                </div>

                {/* Proposals area skeleton */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6">
                    <div className="h-5 w-48 bg-[var(--border-hairline)] rounded mb-4" />
                    <div className="space-y-3">
                        <div className="h-20 bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl" />
                        <div className="h-20 bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function JobDetail() {
    const params = useParams()
    const id = params?.id as string

    if (!id) return <JobDetailSkeleton />

    return (
        <Suspense fallback={<JobDetailSkeleton />}>
            <JobDetailClient jobId={id} />
        </Suspense>
    )
}

function JobDetailClient({ jobId }: { jobId: string }) {
    const { user: authUser, profile: authProfile, profileId: authProfileId } = useAuth()
    const authProfileRef = useRef(authProfile)
    authProfileRef.current = authProfile

    // SSR-safe initial state; cache hydrated inside useEffect for 0ms flicker-free transitions
    const [job, setJob] = useState<Job | null>(null)
    const [selectedMatrixIdx, setSelectedMatrixIdx] = useState(0)
    const [proposals, setProposals] = useState<Proposal[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [loading, setLoading] = useState<boolean>(true)

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
    const [activeCounterProposalId, setActiveCounterProposalId] = useState<string | null>(null)
    const [expandedProposalMessages, setExpandedProposalMessages] = useState<Record<string, boolean>>({})
    const [showEditProposalModal, setShowEditProposalModal] = useState(false)
    const [editProposalAmount, setEditProposalAmount] = useState('')
    const [savingEditProposal, setSavingEditProposal] = useState(false)
    const [counterAmount, setCounterAmount] = useState('')
    const [counterMessage, setCounterMessage] = useState('')
    const [submittingCounter, setSubmittingCounter] = useState(false)
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
    const [confirmAcceptModal, setConfirmAcceptModal] = useState<string | null>(null)
    const hasHandledPayParamRef = useRef(false)

    // Delivery & Review form state
    const [deliveryNotes, setDeliveryNotes] = useState('')
    const [delivering, setDelivering] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    // Avaliação: inicia em 0 para não preencher 5 estrelas sem querer
    const [ratingMatrix, setRatingMatrix] = useState<number>(0)
    const [ratingService, setRatingService] = useState<number>(0)
    const [ratingHoverMatrix, setRatingHoverMatrix] = useState<number>(0)
    const [ratingHoverService, setRatingHoverService] = useState<number>(0)
    const [reviewComment, setReviewComment] = useState('')
    const [jobReview, setJobReview] = useState<any>(null)
    const [jobTransaction, setJobTransaction] = useState<any>(null)

    // Revision state
    const [showRevisionModal, setShowRevisionModal] = useState(false)
    const [revisionNotes, setRevisionNotes] = useState('')
    const [revisionPhoto, setRevisionPhoto] = useState<File | null>(null)
    const [submittingRevision, setSubmittingRevision] = useState(false)

    // Cancel/Delete job state
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    const router = useRouter()
    const isFetchingRef = useRef(false)
    const pendingReloadRef = useRef(false)

    useEffect(() => {
        const cached = getCached<any>(`job_detail_${jobId}`)
        if (cached?.job) {
            setJob(cached.job)
            setProposals(cached.proposals || [])
            if (cached.review) setJobReview(cached.review)
            if (cached.transaction) setJobTransaction(cached.transaction)
            if (cached.unreadCounts) setUnreadCounts(cached.unreadCounts)
            setLoading(false)
            return
        }

        const fromPedidos = getCached<any[]>('pedidos_jobs')?.find((j: any) => j.id === jobId)
        if (fromPedidos) {
            setJob(fromPedidos)
            return
        }

        const fromFeed =
            getCached<any[]>('jobs_all')?.find((j: any) => j.id === jobId) ||
            getCached<any[]>('jobs_aberto')?.find((j: any) => j.id === jobId)
        if (fromFeed) {
            setJob(fromFeed)
        }
    }, [jobId])

    useEffect(() => {
        if (authProfile) {
            setCurrentUser(authProfile)
        }
    }, [authProfile])

    const loadData = useCallback(async () => {
        if (isFetchingRef.current) {
            pendingReloadRef.current = true
            return
        }
        isFetchingRef.current = true
        try {
            // 1. Resolve current user session via AuthContext or serialized getSession()
            let authUserId = authUser?.id || null
            if (!authUserId) {
                const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
                authUserId = session?.user?.id || null
            }

            const existingProfile = authProfileRef.current
            const authPromise = existingProfile?.id
                ? Promise.resolve(existingProfile)
                : authUserId
                  ? (async () => {
                        const { data: profile } = await supabase
                            .from('users')
                            .select('*')
                            .eq('supabase_user_id', authUserId)
                            .maybeSingle()
                        return profile
                    })().catch(err => {
                        console.warn('Auth session check error:', err)
                        return null
                    })
                  : Promise.resolve(null)

            const resolvedUserIdForApi = authUserId || authProfileId || existingProfile?.id || null

            // 2. Fetch full job details from fast server API route (passing userId for privacy check)
            const apiPromise = fetch(`/api/jobs/${jobId}${resolvedUserIdForApi ? `?userId=${encodeURIComponent(resolvedUserIdForApi)}` : ''}`, {
                cache: 'no-store',
                signal: AbortSignal.timeout(7500)
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
                // Cache this detail for fast back-and-forth navigation
                setCached(`job_detail_${jobId}`, apiData, 120000)
            }

            // Auto-mark notifications for this job as read
            const resolvedProfileId = profile?.id || authProfileId
            if (resolvedProfileId) {
                supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', resolvedProfileId)
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
            if (pendingReloadRef.current) {
                pendingReloadRef.current = false
                void loadData()
            }
        }
    }, [jobId, authUser?.id, authProfileId])

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatParam, proposals.length, currentUser?.id])

    // Auto-open payment modal when arriving via notification with ?pay=...
    useEffect(() => {
        if (!payParam || proposals.length === 0 || hasHandledPayParamRef.current) return
        const found = proposals.find((p: any) => p.id === payParam)
        if (found) {
            hasHandledPayParamRef.current = true
            setConfirmAcceptModal(found.id)
            try {
                const url = new URL(window.location.href)
                url.searchParams.delete('pay')
                window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''))
            } catch {}
            setTimeout(() => {
                const propCard = document.getElementById(`proposal-card-${found.id}`)
                if (propCard) {
                    propCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }, 300)
        }
    }, [payParam, proposals])

    const handleCloseConfirmAccept = () => {
        setConfirmAcceptModal(null)
        try {
            const url = new URL(window.location.href)
            url.searchParams.delete('pay')
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''))
        } catch {}
    }

    const handleCloseChat = () => {
        setNegotiatingProposalId(null)
        try {
            const url = new URL(window.location.href)
            url.searchParams.delete('chat')
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''))
        } catch {}
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

        // Safety gate: verify programmer profile readiness
        const isReady = Boolean(
            (currentUser?.is_programmer || currentUser?.role === 'criador') &&
            currentUser?.skills &&
            currentUser?.skills.length > 0
        )

        if (!isReady) {
            toast.error('Ative seu perfil de programador e informe os softwares que você domina antes de enviar propostas.')
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
                            role: 'cliente',
                            is_programmer: false
                        })
                    })
                    const resData = await res.json()
                    creatorId = resData?.data?.id
                }
            }

            if (!creatorId) {
                throw new Error('Não foi possível identificar o seu perfil de usuário. Por favor, recarregue a página e tente novamente.')
            }

            // Envia via API com notificacao interna e Web Push ao cliente
            const res = await fetch('/api/jobs/proposals/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId,
                    criadorId: creatorId,
                    amount: parseFloat(amount),
                    message,
                    deadlineText: deadline
                })
            })

            const resData = await res.json()
            if (!res.ok || resData.error) {
                throw new Error(resData.error || 'Erro ao enviar proposta.')
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

        if (!mRating || mRating < 1 || !sRating || sRating < 1) {
            toast.error('Por favor, selecione as estrelas de qualidade e atendimento antes de enviar.')
            return
        }

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

            clearCache('pedidos_jobs')
            clearCache('producao_data')
            toast.success('Avaliação enviada! Projeto finalizado e pagamento liberado.')
            setTimeout(() => {
                window.location.reload()
            }, 1500)
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

            clearCache('pedidos_jobs')
            clearCache('producao_data')
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


    const submitCounterProposal = async (targetProposalId?: string, overrideAmount?: number) => {
        const propId = targetProposalId || activeCounterProposalId || negotiatingProposalId
        if (!propId) return

        const rawVal = overrideAmount !== undefined ? String(overrideAmount) : counterAmount
        const val = parseFloat(String(rawVal).replace(',', '.').trim())
        if (!val || isNaN(val) || val <= 0) {
            toast.error('Informe um valor válido para a contraproposta.')
            return
        }

        setSubmittingCounter(true)
        try {
            const res = await fetch('/api/jobs/counter-proposal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposalId: propId,
                    counterAmount: val,
                    counterMessage: counterMessage || 'Contraproposta do cliente',
                    senderId: currentUser?.id
                })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao enviar contraproposta')
            }

            toast.success(`Contraproposta de R$ ${val.toFixed(2)} enviada com sucesso!`)
            setCounterAmount('')
            setCounterMessage('')
            setActiveCounterProposalId(null)
            clearCache('pedidos_jobs')
            clearCache('producao_data')
            await loadData()
            router.refresh()
        } catch (err: any) {
            console.error('Error submitting counter proposal:', err)
            toast.error('Erro ao enviar contraproposta: ' + err.message)
        } finally {
            setSubmittingCounter(false)
        }
    }

    const handleProgrammerAdjustProposal = async () => {
        if (!myExistingProposal) return
        const val = parseFloat(editProposalAmount)
        if (!val || isNaN(val) || val <= 0) {
            toast.error('Informe um valor válido para sua proposta.')
            return
        }
        setSavingEditProposal(true)
        try {
            const { error } = await supabase
                .from('proposals')
                .update({
                    amount: val,
                    status: 'pendente',
                    counter_amount: null,
                    counter_message: null
                })
                .eq('id', myExistingProposal.id)

            if (error) throw error

            await supabase.from('proposal_messages').insert({
                proposal_id: myExistingProposal.id,
                sender_id: currentUser?.id,
                content: `[VALOR ATUALIZADO] Atualizei o valor da minha proposta para R$ ${val.toFixed(2)}.`
            })

            if (job?.cliente_id) {
                await supabase.from('notifications').insert({
                    user_id: job.cliente_id,
                    type: 'proposta_atualizada',
                    title: 'Proposta Atualizada',
                    message: `O programador atualizou o valor da proposta para R$ ${val.toFixed(2)} no pedido "${job.title}".`,
                    link_url: `/jobs/${job.id}?chat=${myExistingProposal.id}`
                })
            }

            toast.success(`Proposta atualizada para R$ ${val.toFixed(2)}!`)
            setShowEditProposalModal(false)
            setEditProposalAmount('')
            clearCache('pedidos_jobs')
            clearCache('producao_data')
            await loadData()
            router.refresh()
        } catch (err: any) {
            toast.error('Erro ao atualizar proposta: ' + err.message)
        } finally {
            setSavingEditProposal(false)
        }
    }

    const handleProgrammerResponse = async (proposalId: string, action: 'accept_counter' | 'reject_counter', proposal: Proposal) => {
        setSubmittingCounter(true)
        try {
            const apiAction = action === 'accept_counter' ? 'accept' : 'reject'
            const res = await fetch('/api/jobs/counter-proposal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposalId,
                    action: apiAction,
                    senderId: currentUser?.id
                })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao processar resposta')
            }

            clearCache('pedidos_jobs')
            clearCache('producao_data')

            if (action === 'accept_counter') {
                const targetAmount = proposal.counter_amount || proposal.amount
                toast.success(`Oferta aceita! O valor foi atualizado para R$ ${Number(targetAmount).toFixed(2)}. Aguarde o pagamento do cliente.`)
            } else {
                toast.success('Contraproposta recusada. Valor original mantido.')
            }

            await loadData()
            router.refresh()
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
        } finally {
            setSubmittingCounter(false)
        }
    }

    const [acceptingProposal, setAcceptingProposal] = useState(false)

    const handleAcceptProposal = async (proposalId: string) => {
        if (!proposalId) return
        setAcceptingProposal(true)
        try {
            await Promise.race([
                supabase.from('proposals').update({ status: 'aceita' }).eq('id', proposalId),
                new Promise(resolve => setTimeout(resolve, 1500))
            ])
            clearCache('pedidos_jobs')
            clearCache('producao_data')
        } catch {}

        window.location.href = `/checkout/${proposalId}`
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

    // Cancel/Delete job handler
    const handleCancelJob = async () => {
        if (!job || !currentUser) return
        setCancelling(true)
        try {
            const res = await fetch(`/api/jobs/${job.id}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Erro ao cancelar pedido.')
                setCancelling(false)
                return
            }
            toast.success('Pedido cancelado com sucesso!')
            clearCache()
            setShowCancelModal(false)
            router.push('/pedidos')
        } catch (err) {
            console.error('Error cancelling job:', err)
            toast.error('Erro ao cancelar pedido. Tente novamente.')
            setCancelling(false)
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

    if (loading && !job) {
        return <JobDetailSkeleton />
    }

    if (!job) return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-primary)]">
            Job não encontrado
        </div>
    )

    const isOwner = Boolean(currentUser && (currentUser.id === job.cliente_id || currentUser.supabase_user_id === job.cliente_id))
    const myExistingProposal = proposals.find((p: any) => p.criador_id === currentUser?.id)
    const hasAlreadySentProposal = !!myExistingProposal
    const hasAnyAcceptedProposal = proposals.some((p: any) => p.status === 'aceita')
    const isJobLocked = job.status !== 'aberto' || hasAnyAcceptedProposal
    const showProposalForm = !isOwner && !isJobLocked && !hasAlreadySentProposal
    const isProgrammerReady = Boolean(
        (currentUser?.is_programmer || currentUser?.role === 'criador') &&
        currentUser?.skills &&
        currentUser?.skills.length > 0
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
        <div className="min-h-screen bg-[var(--bg-primary)] py-4 px-4 sm:px-6 lg:px-8 text-[var(--text-primary)]">
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <Link
                    href="/pedidos"
                    className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 text-[var(--text-secondary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors text-xs font-bold uppercase tracking-wider w-fit"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Voltar aos Pedidos
                </Link>

                {/* Status Progress Tracker Bar */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-4 sm:p-5 shadow-sm">
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
                                            ? 'bg-[#2563EB]/10 border border-[#2563EB]/30'
                                            : isCompleted
                                            ? 'bg-[#0D9488]/10 border border-[#0D9488]/25'
                                            : 'bg-transparent opacity-45 border border-transparent'
                                    }`}
                                >
                                    <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                                            isCurrent
                                                ? 'bg-[#2563EB] text-white font-bold'
                                                : isCompleted
                                                ? 'bg-[#0D9488]/15 text-[#0F766E] dark:text-[#14B8A6]'
                                                : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
                                        }`}
                                    >
                                        {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`text-xs font-bold truncate leading-tight ${
                                                isCurrent ? 'text-[var(--text-primary)]' : isCompleted ? 'text-[#0F766E] dark:text-[#14B8A6]' : 'text-[var(--text-secondary)]'
                                            }`}
                                        >
                                            {step.label}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">{step.desc}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 1. TOP SECTION: Job Detail (Unified Card for Single Matrix and Kits) */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden shadow-xl">
                    <div className="flex flex-col md:flex-row">
                        {/* Foto à esquerda */}
                        <div className="w-full md:w-80 lg:w-96 min-h-[300px] bg-[var(--bg-primary)] border-b md:border-b-0 md:border-r border-[var(--border-hairline)] relative flex flex-col justify-between group shrink-0">
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
                                    <div className="flex flex-col items-center justify-center text-[var(--text-secondary)] py-12">
                                        <Package className="w-12 h-12 opacity-30 mb-2" />
                                        <span className="text-xs">Sem foto cadastrada</span>
                                    </div>
                                )}

                                {/* Badge no topo da foto */}
                                {activeImageUrl && (
                                    <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                                        <span className="bg-[#0A0F1D]/85 backdrop-blur-md text-[#F8FAFC] border border-white/15 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow">
                                            {matrixList.length > 1 ? `Foto: ${currentMatrix.name} (${safeMatrixIdx + 1}/${matrixList.length})` : currentMatrix.name}
                                        </span>
                                    </div>
                                )}

                                {/* Hover overlay rápido para ver e baixar */}
                                {activeImageUrl && (
                                    <div className="absolute inset-0 bg-[#0A0F1D]/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                                        <a
                                            href={activeImageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-lg backdrop-blur-sm transition-all"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5 text-[#60A5FA]" />
                                            Ver Completa
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadReferenceImage(activeImageUrl, safeMatrixIdx, currentMatrix.name)}
                                            className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg transition-all"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Baixar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Ações da Imagem no Rodapé */}
                            {activeImageUrl && (
                                <div className="p-3 bg-[var(--bg-surface-elevated)] border-t border-[var(--border-hairline)] flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <a
                                            href={activeImageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 bg-[var(--bg-surface)] hover:bg-[var(--btn-glass-bg)] text-[var(--text-primary)] border border-[var(--border-hairline)] text-xs font-semibold py-2.5 sm:py-2 px-2 rounded-lg transition-colors"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                                            Ver Completa
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadReferenceImage(activeImageUrl, safeMatrixIdx, currentMatrix.name)}
                                            className="flex-1 min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 text-xs font-semibold py-2.5 sm:py-2 px-2 rounded-lg transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Baixar Imagem
                                        </button>
                                    </div>
                                    {job.image_urls && job.image_urls.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={handleDownloadAllReferenceImages}
                                            className="w-full min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 bg-[var(--btn-glass-bg)] hover:bg-[#2563EB]/10 text-[var(--text-primary)] border border-[var(--border-hairline)] text-[11px] font-medium py-2 sm:py-1.5 px-2 rounded-lg transition-colors"
                                        >
                                            <Download className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" />
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
                                        <h1 className="text-2xl lg:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">{job.title}</h1>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            {matrixList.length > 1 && (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 border border-[#2563EB]/25 px-3 py-1 rounded-full">
                                                    <Package className="w-3.5 h-3.5" />
                                                    Kit com {matrixList.length} Matrizes
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-full text-xs text-[var(--text-secondary)]">
                                                <Clock className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" />
                                                Prazo: {urgencyLabels[job.urgency] || job.urgency}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-start">
                                        <span className="px-3.5 py-1.5 bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 rounded-full text-xs font-bold tracking-wider uppercase">
                                            {job.status.replace('_', ' ')}
                                        </span>
                                        {/* Botão Cancelar Pedido — visível apenas para o dono e em status cancelável */}
                                        {isOwner && ['aberto', 'aguardando_pagamento', 'cancelado'].includes(job.status) && (
                                            <button
                                                type="button"
                                                onClick={() => setShowCancelModal(true)}
                                                className="min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 bg-red-500/10 text-[#DC2626] dark:text-[#EF4444] border border-red-500/25 rounded-full text-xs font-bold tracking-wider uppercase hover:bg-red-500/20 transition-all flex items-center gap-1.5"
                                                title="Excluir este pedido definitivamente"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Excluir
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Botões lado a lado para selecionar cada matriz contida no kit */}
                                {matrixList.length > 1 && (
                                    <div className="mb-4">
                                        <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                                            Selecione a matriz para carregar suas informações e foto:
                                        </p>
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                                            {matrixList.map((m, idx) => {
                                                const isSelected = safeMatrixIdx === idx
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setSelectedMatrixIdx(idx)}
                                                        className={`min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 border ${
                                                            isSelected
                                                                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                                                : 'bg-[var(--bg-surface-elevated)] hover:bg-[var(--btn-glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-hairline)]'
                                                        }`}
                                                    >
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                            isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
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
                                <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl p-4 sm:p-5 mb-4">
                                    <div className="flex items-center justify-between mb-3 border-b border-[var(--border-hairline)] pb-2.5">
                                        <h3 className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider flex items-center gap-1.5">
                                            <Ruler className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                                            {matrixList.length > 1 ? `Especificações: ${currentMatrix.name}` : 'Especificações da Matriz'}
                                        </h3>
                                        {matrixList.length > 1 && (
                                            <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                                                Matriz {safeMatrixIdx + 1} de {matrixList.length}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3">
                                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-3">
                                            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                                                Tamanho Desejado
                                            </span>
                                            <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                                <Ruler className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                                                {currentMatrix.size || 'Conforme arte'}
                                            </span>
                                        </div>

                                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-3">
                                            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                                                Tipo de Tecido
                                            </span>
                                            <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                                <Package className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                                                {currentMatrix.fabric || job.fabric_type || 'A combinar'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Observação específica da matriz */}
                                    {currentMatrix.notes && (
                                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-3 mb-3">
                                            <span className="text-[10px] font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider block mb-1 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" /> Observação desta Matriz
                                            </span>
                                            <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                                                {currentMatrix.notes}
                                            </p>
                                        </div>
                                    )}

                                    {/* Formatos Solicitados */}
                                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--border-hairline)]">
                                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Formatos:</span>
                                        {job.formats && job.formats.length > 0 ? (
                                            job.formats.map((fmt, idx) => (
                                                <span key={idx} className="px-2.5 py-0.5 bg-[var(--bg-surface)] border border-[#2563EB]/25 text-[#2563EB] dark:text-[#60A5FA] rounded text-[11px] uppercase font-bold">
                                                    {fmt}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-[var(--text-secondary)]">Qualquer formato compatível</span>
                                        )}
                                    </div>
                                </div>

                                {/* Aviso sobre o pacote de matrizes */}
                                {matrixList.length > 1 && (
                                    <div className="bg-[#2563EB]/8 border-l-4 border-[#2563EB] dark:border-[#3B82F6] p-3 rounded-r-lg mb-4 text-xs text-[var(--text-primary)] leading-relaxed">
                                        <span className="font-bold text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1.5 mb-1">
                                            <Sparkles className="w-3.5 h-3.5" /> Aviso sobre o Pacote de Matrizes:
                                        </span>
                                        Este pedido contempla a digitalização de <strong>todas as {matrixList.length} matrizes</strong> do kit. Ao enviar sua proposta, considere o valor e prazo total para entregar o conjunto completo.
                                    </div>
                                )}

                                {/* Descrição geral do pedido */}
                                {job.description && (
                                    <div className="mb-2">
                                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                                            Descrição Geral do Pedido:
                                        </span>
                                        <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap bg-[var(--bg-surface-elevated)] p-3 rounded-lg border border-[var(--border-hairline)]">
                                            {job.description}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Rodapé do Card */}
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-hairline)] text-[11px] text-[var(--text-secondary)]">
                                <span className="font-mono">ID: #{job.id.slice(0, 8)}</span>
                                <div className="flex items-center gap-1 font-bold">
                                    <Calendar className="w-3 h-3 text-[var(--text-secondary)]" />
                                    Publicado em {formatDate(job.created_at)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. MIDDLE SECTION: Proposals OR Production/Revision Hero OR Delivery OR Finalized */}
                {/* 2. MIDDLE SECTION: Proposals OR Production/Revision Hero OR Delivery OR Finalized */}
                {(job.status === 'em_progresso' || job.status === 'em_revisao') && acceptedProposal ? (
                    <div className="bg-[var(--bg-surface)] border border-[#2563EB]/30 rounded-2xl p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[320px] text-center mb-8 shadow-xl">
                        <div className="relative z-10 mb-6 mt-2">
                            <div className="w-28 h-28 relative flex items-center justify-center mx-auto">
                                <svg className="absolute inset-0 w-full h-full text-[#2563EB] dark:text-[#60A5FA] animate-[spin_12s_linear_infinite] opacity-30" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" strokeLinecap="round" />
                                </svg>
                                <div className="bg-[var(--bg-surface-elevated)] w-14 h-14 rounded-full border border-[#2563EB]/30 z-10 flex items-center justify-center">
                                    {job.status === 'em_revisao' ? (
                                        <Wrench className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
                                    ) : (
                                        <PenTool className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 max-w-lg mx-auto">
                            <h2 className="text-3xl font-semibold text-[var(--text-primary)] mb-3 tracking-tight">
                                {job.status === 'em_revisao' ? 'Matriz em Revisão' : 'Matriz em Produção'}
                            </h2>
                            <p className="text-[var(--text-secondary)] text-sm leading-relaxed px-4">
                                {job.status === 'em_revisao' ? (
                                    isOwner ? (
                                        <>Você solicitou um ajuste na matriz. O profissional <strong className="text-[#2563EB] dark:text-[#60A5FA] text-base">{acceptedProposal.users?.name || 'Parceiro'}</strong> já foi notificado e está trabalhando na correção.</>
                                    ) : (
                                        <>O comprador testou o bordado e solicitou um ajuste. Veja os detalhes abaixo e envie a matriz corrigida.</>
                                    )
                                ) : (
                                    <>Aguarde... O profissional <strong className="text-[#2563EB] dark:text-[#60A5FA] text-base">{acceptedProposal.users?.name || 'Parceiro'}</strong> está criando sua matriz da melhor maneira possível.</>
                                )}
                            </p>

                            <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                                <span className="inline-flex items-center gap-2 bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border-[#2563EB]/25 px-4 py-2 rounded-full text-xs font-bold border">
                                    <span className="w-2 h-2 bg-[#2563EB] dark:bg-[#3B82F6] rounded-full"></span>
                                    {job.status === 'em_revisao' ? 'AJUSTES EM ANDAMENTO' : 'TRABALHO EM ANDAMENTO'}
                                </span>
                                
                                <button 
                                    onClick={() => handleNegotiate(acceptedProposal.id)}
                                    className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 bg-[var(--bg-surface-elevated)] hover:bg-[var(--btn-glass-bg)] text-[var(--text-primary)] px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-hairline)] transition-colors"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {negotiatingProposalId === acceptedProposal.id ? 'Fechar Chat' : 'Chat / Histórico'}
                                </button>
                            </div>

                            {/* REVISION DETAILS CARD (IF IN REVISION) */}
                            {job.status === 'em_revisao' && (job.revision_notes || job.revision_image_url) && (
                                <div className="mt-6 bg-[#2563EB]/8 border border-[#2563EB]/25 rounded-xl p-5 text-left">
                                    <p className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-2 uppercase tracking-wider mb-2">
                                        <Wrench className="w-4 h-4" /> Detalhes do Ajuste Solicitado pelo Cliente:
                                    </p>
                                    {job.revision_notes && (
                                        <div className="bg-[var(--bg-surface-elevated)] p-3.5 rounded-lg border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] mb-3 whitespace-pre-wrap">
                                            &quot;{job.revision_notes}&quot;
                                        </div>
                                    )}
                                    {job.revision_image_url && (
                                        <div>
                                            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Foto do Teste / Defeito no Bordado:</p>
                                            <a href={job.revision_image_url} target="_blank" rel="noopener noreferrer" className="inline-block relative rounded-lg overflow-hidden border border-[var(--border-hairline)] hover:border-[#2563EB]/50 transition-colors">
                                                <img src={job.revision_image_url} alt="Foto do bordado com defeito" className="max-h-48 rounded-lg object-cover" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}


                            {/* DELIVERY SECTION (Programmer Only) */}
                            {!isOwner && currentUser?.id === acceptedProposal.criador_id && (
                                <div className="mt-8 pt-8 border-t border-[var(--border-hairline)] w-full max-w-lg mx-auto text-left relative z-10">
                                    <div className="bg-[var(--bg-surface-elevated)] p-6 rounded-xl border border-[#0D9488]/30">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="bg-[#0D9488]/15 p-2 rounded-lg">
                                                <Package className="w-5 h-5 text-[#0F766E] dark:text-[#14B8A6]" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                                {job.status === 'em_revisao' ? 'Enviar Matriz Corrigida' : 'Entregar Matriz'}
                                            </h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Notas da Entrega</label>
                                                <textarea 
                                                    value={deliveryNotes}
                                                    onChange={e => setDeliveryNotes(e.target.value)}
                                                    placeholder="Ex: Segue a matriz nos formatos solicitados. Ajustei o ponto para o tecido mencionado."
                                                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#0D9488] dark:focus:border-[#14B8A6] transition-colors min-h-[100px]"
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
                                                    className={`flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-glass)] rounded-xl p-8 cursor-pointer hover:border-[#0D9488] dark:hover:border-[#14B8A6] hover:bg-[#0D9488]/5 transition-all ${delivering ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {selectedFiles.length > 0 ? (
                                                        <>
                                                            <Upload className="w-8 h-8 text-[#0F766E] dark:text-[#14B8A6] mb-2" />
                                                            <p className="text-sm text-[#0F766E] dark:text-[#14B8A6] font-bold text-center">{selectedFiles.length} arquivo(s) selecionado(s):</p>
                                                            <div className="flex flex-wrap justify-center gap-2 mt-3">
                                                                {selectedFiles.map((f, i) => (
                                                                    <div key={i} className="bg-[var(--bg-surface)] px-3 py-1 rounded text-xs text-[var(--text-primary)] border border-[var(--border-hairline)] truncate max-w-[150px]">
                                                                        {f.name}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <p className="text-[10px] text-[var(--text-secondary)] mt-4 uppercase tracking-widest font-bold">Clique para alterar a seleção</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-8 h-8 text-[#0F766E] dark:text-[#14B8A6] mb-2" />
                                                            <p className="text-sm text-[var(--text-primary)] font-semibold text-center">Clique para selecionar os arquivos (até 10)</p>
                                                            <p className="text-[10px] text-[var(--text-secondary)] mt-1 uppercase tracking-widest font-bold text-center">Apenas formatos de bordado (.pxf, .emb, .dst, .pes, etc) e imagens/pdf</p>
                                                        </>
                                                    )}
                                                </label>
                                            </div>

                                            {selectedFiles.length > 0 && (
                                                <div className="mt-4 flex justify-end">
                                                    <button 
                                                        onClick={handleSubmitDelivery}
                                                        disabled={delivering}
                                                        className="min-h-[48px] bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
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
                    <div className="bg-[var(--bg-surface)] border border-[#0D9488]/30 rounded-2xl overflow-hidden shadow-xl mb-8">
                        <div className="flex flex-col lg:flex-row">
                            {/* Left Side: Owner gets test/download/revision; Programmer gets confirmation + file list */}
                            <div className="flex-1 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-[var(--border-hairline)]">
                                {isOwner ? (
                                    <>
                                        <div className="inline-flex items-center gap-2 bg-[#0D9488]/15 text-[#0F766E] dark:text-[#14B8A6] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
                                            <CheckCircle className="w-3 h-3" /> {job.revision_notes ? 'Matriz Revisada Pronta para Teste' : 'Matriz Pronta para Teste'}
                                        </div>
                                        <h2 className="text-3xl font-semibold text-[var(--text-primary)] mb-4">
                                            {job.revision_notes ? 'Sua matriz revisada está pronta!' : 'Sua matriz está pronta!'}
                                        </h2>
                                        <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                                            {job.revision_notes ? (
                                                <>O programador <strong className="text-[var(--text-primary)]">{acceptedProposal?.users?.name}</strong> enviou a <strong>versão revisada da matriz com as alterações solicitadas</strong>. Baixe os arquivos abaixo e faça um novo teste na sua máquina. Você tem até <strong className="text-[#2563EB] dark:text-[#60A5FA]">24 horas</strong> para aprovar ou solicitar novos ajustes antes da liberação automática.</>
                                            ) : (
                                                <>O programador <strong className="text-[var(--text-primary)]">{acceptedProposal?.users?.name}</strong> finalizou o trabalho. Baixe os arquivos abaixo e faça um teste na sua máquina. Você tem até <strong className="text-[#2563EB] dark:text-[#60A5FA]">24 horas</strong> para testar o bordado ou solicitar ajustes antes da liberação automática.</>
                                            )}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="inline-flex items-center gap-2 bg-[#0D9488]/15 text-[#0F766E] dark:text-[#14B8A6] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
                                            <Package className="w-3 h-3" /> {job.revision_notes ? 'Correção da Matriz Enviada com Sucesso' : 'Matriz Entregue com Sucesso'}
                                        </div>
                                        <h2 className="text-3xl font-semibold text-[var(--text-primary)] mb-4">
                                            {job.revision_notes ? 'Matriz Revisada Enviada para o Comprador!' : 'Matriz Entregue para o Comprador!'}
                                        </h2>
                                        <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                                            {job.revision_notes ? (
                                                <>Você enviou a <strong>versão revisada da matriz</strong> atendendo aos ajustes solicitados pelo comprador. O cliente foi notificado para testar o novo arquivo na máquina. Caso ele não avalie ou solicite novas revisões dentro do prazo de <strong className="text-[#2563EB] dark:text-[#60A5FA]">24 horas</strong>, o pagamento será liberado automaticamente para você.</>
                                            ) : (
                                                <>Você já enviou os arquivos da matriz. O cliente foi notificado para testar o bordado na máquina. Caso ele não avalie ou solicite revisões dentro do prazo de <strong className="text-[#2563EB] dark:text-[#60A5FA]">24 horas</strong>, o pagamento será liberado automaticamente para você.</>
                                            )}
                                        </p>
                                    </>
                                )}
                                
                                {job.revision_notes && (
                                    <div className="bg-[#2563EB]/8 p-3.5 rounded-xl border border-[#2563EB]/25 mb-4 text-xs text-[var(--text-primary)]">
                                        <p className="font-bold uppercase tracking-wider text-[10px] text-[#2563EB] dark:text-[#60A5FA] mb-1">Ajuste que havia sido solicitado:</p>
                                        <p className="italic text-[var(--text-secondary)]">&quot;{job.revision_notes}&quot;</p>
                                    </div>
                                )}

                                {job.delivery_notes && (
                                    <div className="bg-[var(--bg-surface-elevated)] p-4 rounded-xl border border-[var(--border-hairline)] mb-6 text-sm text-[var(--text-secondary)]">
                                        <p className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-secondary)] mb-1">
                                            {job.revision_notes ? 'Notas da Correção do Produtor:' : 'Notas da Entrega:'}
                                        </p>
                                        <p className="italic text-[var(--text-primary)]">&quot;{job.delivery_notes}&quot;</p>
                                    </div>
                                )}

                                {/* Ficha Técnica da Matriz Entregue */}
                                <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl p-4 mb-6">
                                    <div className="flex items-center justify-between mb-3 border-b border-[var(--border-hairline)] pb-2">
                                        <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Especificações Técnicas da Entrega
                                        </span>
                                        <span className="text-[10px] text-[#0F766E] dark:text-[#14B8A6] bg-[#0D9488]/10 border border-[#0D9488]/25 px-2.5 py-0.5 rounded-full font-bold">
                                            Apto para Bastidor
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-2.5 rounded-lg">
                                            <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-bold">Bastidor / Tamanho</span>
                                            <span className="font-bold text-[var(--text-primary)] flex items-center gap-1 mt-0.5">
                                                <Ruler className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" />
                                                {currentMatrix?.size || job.dimensions || 'Conforme arte'}
                                            </span>
                                        </div>
                                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-2.5 rounded-lg">
                                            <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-bold">Tecido Recomendado</span>
                                            <span className="font-bold text-[var(--text-primary)] flex items-center gap-1 mt-0.5">
                                                <Package className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" />
                                                {currentMatrix?.fabric || job.fabric_type || 'A combinar'}
                                            </span>
                                        </div>
                                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-2.5 rounded-lg col-span-2 sm:col-span-1">
                                            <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-bold">Formatos Inclusos</span>
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                {job.formats && job.formats.length > 0 ? (
                                                    job.formats.map((fmt, i) => (
                                                        <span key={i} className="text-[10px] font-bold text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 px-1.5 py-0.5 rounded">
                                                            {fmt}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[var(--text-primary)] font-bold">Compatíveis</span>
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
                                        } catch {
                                            toast.error('Erro ao compactar arquivos.')
                                        }
                                    }

                                    return (
                                        <div className="flex flex-col gap-4">
                                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">
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
                                                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 bg-[var(--bg-surface-elevated)] hover:bg-[#0D9488]/12 border border-[var(--border-hairline)] hover:border-[#0D9488]/40 text-[var(--text-primary)] hover:text-[#0F766E] dark:hover:text-[#14B8A6] px-4 py-2 rounded-lg transition-all text-xs cursor-pointer active:scale-95"
                                                        >
                                                            <Download className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                                                            <span>{cleanName}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            {urls.length > 1 && (
                                                <button
                                                    onClick={handleDownloadAll}
                                                    className="min-h-[48px] inline-flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 w-fit"
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
                                    <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#2563EB]/8 p-4 rounded-xl border border-[#2563EB]/25">
                                        <div>
                                            <p className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1.5">
                                                <AlertCircle className="w-4 h-4" /> Testou o bordado e precisa de algum ajuste ou correção?
                                            </p>
                                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                                Você pode solicitar uma correção de ponto, tamanho ou formato com foto.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowRevisionModal(true)}
                                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 bg-[#2563EB]/12 hover:bg-[#2563EB]/20 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/30 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0"
                                        >
                                            <Wrench className="w-3.5 h-3.5" />
                                            Pedir Ajuste / Revisão
                                        </button>
                                    </div>
                                )}

                                {/* QUICK CHAT BUTTON FOR PROGRAMMER */}
                                {!isOwner && acceptedProposal && (
                                    <div className="mt-8 pt-6 border-t border-[var(--border-hairline)] flex items-center justify-between gap-3 flex-wrap">
                                        <p className="text-xs text-[var(--text-secondary)]">Dúvidas com o cliente sobre o bordado?</p>
                                        <button
                                            onClick={() => handleNegotiate(acceptedProposal.id)}
                                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 bg-[var(--bg-surface-elevated)] hover:bg-[var(--btn-glass-bg)] text-[var(--text-primary)] px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] transition-colors"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Abrir Chat com Cliente
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Review Form for Owner, Timeline for Programmer */}
                            {isOwner && (
                                <div className="w-full lg:w-[450px] bg-[var(--bg-surface-elevated)] p-8 lg:p-10 flex flex-col justify-center">
                                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Tudo Certo? Avalie o Trabalho</h3>

                                    {/* Dica amigável antes de avaliar */}
                                    <div className="bg-[#2563EB]/8 border border-[#2563EB]/25 rounded-xl p-3 text-xs text-[var(--text-primary)] flex items-start gap-2.5 mb-5">
                                        <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] flex-shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-[var(--text-primary)]">Já testou o bordado?</p>
                                            <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">
                                                Recomendamos fazer um teste no tecido antes de avaliar. Se precisar de ajustes agora, use o botão <strong>Pedir Ajuste / Revisão</strong> ao lado.
                                            </p>
                                            <p className="text-[10px] text-[#0F766E] dark:text-[#14B8A6] font-semibold">
                                                Fique tranquilo: mesmo após aprovar, você terá 7 dias de garantia para solicitar correções na matriz!
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Formulário de Avaliação com Seleção Explícita de Estrelas */}
                                    <div className="space-y-5">
                                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
                                            {/* Critério 1: Qualidade da Matriz */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" /> 1. Qualidade da Matriz
                                                    </span>
                                                    <span className="text-xs font-bold transition-all">
                                                        {(ratingHoverMatrix || ratingMatrix) === 5 ? (
                                                            <span className="text-[#2563EB] dark:text-[#60A5FA]">5.0 - Excelente / Perfeita!</span>
                                                        ) : (ratingHoverMatrix || ratingMatrix) === 4 ? (
                                                            <span className="text-[#0F766E] dark:text-[#14B8A6]">4.0 - Muito Boa</span>
                                                        ) : (ratingHoverMatrix || ratingMatrix) === 3 ? (
                                                            <span className="text-[var(--text-secondary)]">3.0 - Regular</span>
                                                        ) : (ratingHoverMatrix || ratingMatrix) === 2 ? (
                                                            <span className="text-[#DC2626] dark:text-[#F87171]">2.0 - Ruim</span>
                                                        ) : (ratingHoverMatrix || ratingMatrix) === 1 ? (
                                                            <span className="text-[#DC2626] dark:text-[#F87171]">1.0 - Péssima</span>
                                                        ) : (
                                                            <span className="text-[var(--text-secondary)] italic text-[11px]">Toque nas estrelas</span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 sm:gap-2 bg-[var(--bg-surface-elevated)] p-2 rounded-xl border border-[var(--border-hairline)]">
                                                    {[1, 2, 3, 4, 5].map(star => {
                                                        const isFilled = star <= (ratingHoverMatrix || ratingMatrix)
                                                        return (
                                                            <button 
                                                                key={star} 
                                                                type="button"
                                                                onMouseEnter={() => setRatingHoverMatrix(star)}
                                                                onMouseLeave={() => setRatingHoverMatrix(0)}
                                                                onClick={() => setRatingMatrix(star)} 
                                                                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1 transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                                                                title={`${star} estrela${star > 1 ? 's' : ''}`}
                                                            >
                                                                <Star className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${isFilled ? 'fill-[#2563EB] text-[#2563EB] dark:fill-[#60A5FA] dark:text-[#60A5FA]' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`} />
                                                            </button>
                                                        )
                                                    })}
                                                    {ratingMatrix > 0 && (
                                                        <span className="inline-flex items-center gap-1 ml-auto text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 px-2.5 py-1 rounded-lg border border-[#2563EB]/25 font-mono">
                                                            {ratingMatrix}.0 <Star className="w-3 h-3 fill-current" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Critério 2: Atendimento / Prazo */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" /> 2. Atendimento & Prazo
                                                    </span>
                                                    <span className="text-xs font-bold transition-all">
                                                        {(ratingHoverService || ratingService) === 5 ? (
                                                            <span className="text-[#2563EB] dark:text-[#60A5FA]">5.0 - Excelente / Rápido!</span>
                                                        ) : (ratingHoverService || ratingService) === 4 ? (
                                                            <span className="text-[#0F766E] dark:text-[#14B8A6]">4.0 - Muito Bom</span>
                                                        ) : (ratingHoverService || ratingService) === 3 ? (
                                                            <span className="text-[var(--text-secondary)]">3.0 - Regular</span>
                                                        ) : (ratingHoverService || ratingService) === 2 ? (
                                                            <span className="text-[#DC2626] dark:text-[#F87171]">2.0 - Ruim</span>
                                                        ) : (ratingHoverService || ratingService) === 1 ? (
                                                            <span className="text-[#DC2626] dark:text-[#F87171]">1.0 - Péssimo</span>
                                                        ) : (
                                                            <span className="text-[var(--text-secondary)] italic text-[11px]">Toque nas estrelas</span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 sm:gap-2 bg-[var(--bg-surface-elevated)] p-2 rounded-xl border border-[var(--border-hairline)]">
                                                    {[1, 2, 3, 4, 5].map(star => {
                                                        const isFilled = star <= (ratingHoverService || ratingService)
                                                        return (
                                                            <button 
                                                                key={star} 
                                                                type="button"
                                                                onMouseEnter={() => setRatingHoverService(star)}
                                                                onMouseLeave={() => setRatingHoverService(0)}
                                                                onClick={() => setRatingService(star)} 
                                                                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1 transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                                                                title={`${star} estrela${star > 1 ? 's' : ''}`}
                                                            >
                                                                <Star className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${isFilled ? 'fill-[#2563EB] text-[#2563EB] dark:fill-[#60A5FA] dark:text-[#60A5FA]' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`} />
                                                            </button>
                                                        )
                                                    })}
                                                    {ratingService > 0 && (
                                                        <span className="inline-flex items-center gap-1 ml-auto text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 px-2.5 py-1 rounded-lg border border-[#2563EB]/25 font-mono">
                                                            {ratingService}.0 <Star className="w-3 h-3 fill-current" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <textarea 
                                            value={reviewComment}
                                            onChange={e => setReviewComment(e.target.value)}
                                            placeholder="Deixe um elogio ou comentário sobre o trabalho do programador (opcional)..."
                                            className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-3.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 min-h-[90px] focus:border-[#2563EB] dark:focus:border-[#3B82F6] outline-none transition-colors"
                                        />

                                        <div className="space-y-1.5">
                                            <button 
                                                type="button"
                                                onClick={() => handleSubmitReview(ratingMatrix, ratingService, reviewComment)}
                                                disabled={ratingMatrix === 0 || ratingService === 0}
                                                className={`min-h-[48px] w-full py-4 rounded-xl font-semibold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                                                    ratingMatrix > 0 && ratingService > 0
                                                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] active:scale-95 cursor-pointer'
                                                        : 'bg-[var(--btn-glass-bg)] text-[var(--text-secondary)] cursor-not-allowed border border-[var(--border-hairline)]'
                                                }`}
                                            >
                                                {ratingMatrix > 0 && ratingService > 0 ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span>
                                                            Confirmar Avaliação ({((ratingMatrix + ratingService) / 2).toFixed(1)} <Star className="w-3.5 h-3.5 fill-current inline -mt-0.5" />) & Liberar Pagamento
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Star className="w-4 h-4 text-[var(--text-secondary)]" />
                                                        Selecione as estrelas acima para avaliar
                                                    </>
                                                )}
                                            </button>
                                            <p className="text-[10px] text-[var(--text-secondary)] text-center leading-tight">
                                                Ao confirmar, sua avaliação é salva no perfil do programador e o pagamento em custódia é repassado a ele.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isOwner && currentUser?.id === acceptedProposal?.criador_id && (
                                <div className="w-full lg:w-[450px] bg-[var(--bg-surface-elevated)] p-8 lg:p-10 flex flex-col items-center justify-center text-center">
                                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-8 text-center">Acompanhamento do Pagamento</h3>
                                    
                                    <div className="relative pl-6 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-hairline)] w-full max-w-sm">
                                        {/* Etapa 1: Concluída */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-[24px] h-[24px] bg-[#0D9488] rounded-full border-4 border-[var(--bg-surface-elevated)] flex items-center justify-center z-10">
                                                <CheckCircle className="w-3 h-3 text-white" />
                                            </div>
                                            <h4 className="text-sm font-bold text-[#0F766E] dark:text-[#14B8A6] mb-1 leading-none pt-0.5 text-left">Matriz Entregue</h4>
                                            <p className="text-xs text-[var(--text-secondary)] text-left">Seu arquivo foi enviado com sucesso.</p>
                                        </div>

                                        {/* Etapa 2: Aguardando (Pendente) */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-[24px] h-[24px] bg-[#2563EB] rounded-full border-4 border-[var(--bg-surface-elevated)] flex items-center justify-center z-10">
                                                <Clock className="w-3 h-3 text-white" />
                                            </div>
                                            <h4 className="text-sm font-bold text-[#2563EB] dark:text-[#60A5FA] mb-1 leading-none pt-0.5 text-left">Avaliação do Cliente (até 24h)</h4>
                                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed text-left">
                                                O comprador tem até 24 horas para testar o bordado. Se ele não avaliar nem solicitar ajustes nesse prazo, o valor é liberado automaticamente.
                                            </p>
                                        </div>

                                        {/* Etapa 3: Futura */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-[24px] h-[24px] bg-[var(--border-glass)] rounded-full border-4 border-[var(--bg-surface-elevated)] z-10"></div>
                                            <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-1 leading-none pt-0.5 text-left">Pagamento Liberado</h4>
                                            <p className="text-xs text-[var(--text-secondary)] text-left">
                                                O repasse via PIX é liberado imediatamente após a aprovação ou ao final do prazo de 24 horas.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : job.status === 'finalizado' ? (
                    <div className="bg-[var(--bg-surface)] border border-[#0D9488]/30 rounded-2xl overflow-hidden shadow-xl mb-8">
                        <div className="flex flex-col lg:flex-row">
                            {/* Left Side: Always accessible downloads & personalized messages */}
                            <div className="flex-1 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-[var(--border-hairline)]">
                                {isOwner ? (
                                    <>
                                        <div className="inline-flex items-center gap-2 bg-[#0D9488]/15 text-[#0F766E] dark:text-[#14B8A6] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
                                            <CheckCircle className="w-3 h-3" /> Pedido Concluído & Pago
                                        </div>
                                        <h2 className="text-3xl font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                            Matriz Aprovada e Concluída!
                                            <Sparkles className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
                                        </h2>
                                        <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                                            Parabéns! Sua matriz foi 100% aprovada e está pronta para bordar. Os arquivos ficam salvos permanentemente na sua conta e você pode baixá-los a qualquer momento.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        {jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5 ? (
                                            <div className="inline-flex items-center gap-2 bg-[#2563EB]/12 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/30 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-6">
                                                <Sparkles className="w-3.5 h-3.5" /> Avaliação Máxima • 5 Estrelas
                                            </div>
                                        ) : jobReview && (jobReview.rating_matrix + jobReview.rating_service) >= 8 ? (
                                            <div className="inline-flex items-center gap-2 bg-[#0D9488]/15 text-[#0F766E] dark:text-[#14B8A6] border border-[#0D9488]/30 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-6">
                                                <Star className="w-3.5 h-3.5 fill-current" /> Ótimo Trabalho • Avaliação Positiva
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 bg-[#0D9488]/15 text-[#0F766E] dark:text-[#14B8A6] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
                                                <CheckCircle className="w-3 h-3" /> Pedido Concluído & Aprovado
                                            </div>
                                        )}

                                        <h2 className="text-3xl font-semibold text-[var(--text-primary)] mb-2">
                                            {jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5
                                                ? 'Excelente Trabalho! Parabéns!'
                                                : jobReview && (jobReview.rating_matrix + jobReview.rating_service) >= 8
                                                ? 'Parabéns pela Entrega Concluída!'
                                                : 'Missão Cumprida! Pedido Finalizado'}
                                        </h2>

                                        <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                                            {jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5 ? (
                                                <>
                                                    O comprador avaliou sua entrega com <strong className="text-[#2563EB] dark:text-[#60A5FA]">nota máxima (5 estrelas)</strong>! Sua precisão nos pontos, pontualidade e capricho fazem toda a diferença no BordadoHUB. Continue mantendo esse padrão de excelência — <strong className="text-[var(--text-primary)]">profissionais 5 estrelas ganham maior destaque e preferência em novos pedidos!</strong>
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
                                        <div className="mb-6 p-4 bg-[#0D9488]/10 border border-[#0D9488]/25 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#0D9488]/15 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center font-bold text-lg shrink-0">
                                                    <DollarSign className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-[#0F766E] dark:text-[#14B8A6] uppercase tracking-wider">Pagamento Liberado para Repasse</p>
                                                    <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                                                        Valor da sua proposta: <span className="text-[#0F766E] dark:text-[#14B8A6] font-extrabold">R$ {acceptedProposal?.amount ? acceptedProposal.amount.toFixed(2) : '---'}</span>
                                                    </p>
                                                    <p className="text-[11px] text-[var(--text-secondary)]">
                                                        O pagamento do comprador foi confirmado e o valor será repassado via PIX para sua chave cadastrada.
                                                    </p>
                                                </div>
                                            </div>
                                            <Link
                                                href="/producao"
                                                className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 active:scale-95"
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
                                        } catch {
                                            toast.error('Erro ao compactar arquivos.')
                                        }
                                    }

                                    return (
                                        <div className="flex flex-col gap-4">
                                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">
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
                                                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 bg-[var(--bg-surface-elevated)] hover:bg-[#0D9488]/12 border border-[var(--border-hairline)] hover:border-[#0D9488]/40 text-[var(--text-primary)] hover:text-[#0F766E] dark:hover:text-[#14B8A6] px-4 py-2 rounded-lg transition-all text-xs cursor-pointer active:scale-95"
                                                        >
                                                            <Download className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                                                            <span>{cleanName}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            {urls.length > 1 && (
                                                <button
                                                    onClick={handleDownloadAll}
                                                    className="min-h-[48px] inline-flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 w-fit"
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
                                    <div className="mt-6 p-4 bg-[#2563EB]/8 border border-[#2563EB]/25 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6]"></span>
                                                <p className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1.5">
                                                    <Wrench className="w-3.5 h-3.5" /> Garantia de Ajuste ou Correção (7 dias)
                                                </p>
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                                Bordou a peça e precisa de alteração de pontos, tamanho ou compensação na matriz?
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleOpenChatForAdjustment}
                                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Solicitar Ajuste no Chat
                                        </button>
                                    </div>
                                )}

                                <div className="mt-8 pt-6 border-t border-[var(--border-hairline)] flex items-center justify-between gap-3 flex-wrap">
                                    <p className="text-xs text-[var(--text-secondary)]">Histórico de mensagens e suporte preservados.</p>
                                    {!isOwner && acceptedProposal && (
                                        <button
                                            onClick={() => handleNegotiate(acceptedProposal.id)}
                                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 bg-[var(--bg-surface-elevated)] hover:bg-[var(--btn-glass-bg)] text-[var(--text-primary)] px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] transition-colors"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Abrir Chat com Cliente
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Right Side: Review Summary */}
                            <div className="w-full lg:w-[450px] bg-[var(--bg-surface-elevated)] p-8 lg:p-10 flex flex-col justify-center">
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        <Star className="w-5 h-5 text-[#2563EB] fill-[#2563EB] dark:text-[#60A5FA] dark:fill-[#60A5FA]" />
                                        {isOwner ? 'Avaliação do Projeto' : 'Avaliação Recebida do Cliente'}
                                    </h3>
                                    {!isOwner && jobReview && jobReview.rating_matrix === 5 && jobReview.rating_service === 5 && (
                                        <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold bg-[#2563EB]/12 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 px-3 py-1 rounded-full">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Desempenho 10/10 • Cliente Satisfeito
                                        </span>
                                    )}
                                </div>

                                {jobReview ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Qualidade da Matriz</p>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`w-5 h-5 ${s <= jobReview.rating_matrix ? 'fill-[#2563EB] text-[#2563EB] dark:fill-[#60A5FA] dark:text-[#60A5FA]' : 'text-slate-300 dark:text-slate-600'}`} />
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Atendimento / Prazo</p>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`w-5 h-5 ${s <= jobReview.rating_service ? 'fill-[#2563EB] text-[#2563EB] dark:fill-[#60A5FA] dark:text-[#60A5FA]' : 'text-slate-300 dark:text-slate-600'}`} />
                                                ))}
                                            </div>
                                        </div>

                                        {jobReview.comment && (
                                            <div className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] italic">
                                                {!isOwner && <p className="text-[10px] text-[var(--text-secondary)] uppercase not-italic font-bold mb-1">Comentário do Comprador:</p>}
                                                &quot;{jobReview.comment}&quot;
                                            </div>
                                        )}

                                        <div className="pt-2 flex flex-col gap-2">
                                            {!isOwner && (
                                                <span className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 px-3 py-1.5 rounded-full border border-[#2563EB]/25 font-bold">
                                                    <Sparkles className="w-3.5 h-3.5" /> Pontuação adicionada ao seu perfil profissional!
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1.5 text-xs text-[#0F766E] dark:text-[#14B8A6] bg-[#0D9488]/10 px-3 py-1.5 rounded-full border border-[#0D9488]/25 font-bold">
                                                <CheckCircle className="w-3.5 h-3.5" /> Pagamento {jobTransaction?.metodo === 'asaas_cartao' ? 'via Cartão' : 'PIX'} Confirmado
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <CheckCircle className="w-10 h-10 text-[#0F766E] dark:text-[#14B8A6] mx-auto mb-2" />
                                        <p className="text-sm text-[var(--text-primary)] font-bold">Trabalho concluído com sucesso!</p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">O valor foi liberado para o programador.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-5 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                                {isOwner ? (
                                    <>Propostas Recebidas ({proposals.length})</>
                                ) : (
                                    <>{proposals.length === 0 ? 'Nenhuma proposta recebida' : `${proposals.length} ${proposals.length === 1 ? 'proposta recebida' : 'propostas recebidas'}`}</>
                                )}
                            </h2>
                        </div>

                        {showProposalForm && (
                            isProgrammerReady ? (
                                <div className="mb-6 bg-[var(--bg-surface-elevated)] p-4 sm:p-5 rounded-2xl border border-[#2563EB]/25">
                                    <div className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5" /> Enviar Proposta de Orçamento
                                    </div>
                                    <form onSubmit={handleSubmitProposal} className="space-y-3 md:space-y-0 md:flex md:gap-3 md:items-end">
                                        <div className="grid grid-cols-2 gap-3 md:contents">
                                            {/* Campo Valor */}
                                            <div className="w-full md:w-36 lg:w-44 shrink-0">
                                                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                                                    Valor (R$)
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-xs font-bold">R$</span>
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        min="1"
                                                        inputMode="decimal"
                                                        required 
                                                        value={amount} 
                                                        onChange={e => setAmount(e.target.value)} 
                                                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] focus:border-[#2563EB] dark:focus:border-[#3B82F6] rounded-xl pl-8 pr-2.5 py-2.5 text-base md:text-sm font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none transition-colors" 
                                                        placeholder="0,00" 
                                                    />
                                                </div>
                                            </div>

                                            {/* Campo Prazo */}
                                            <div className="w-full md:w-36 lg:w-44 shrink-0">
                                                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                                                    Prazo
                                                </label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={deadline} 
                                                    onChange={e => setDeadline(e.target.value)} 
                                                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] focus:border-[#2563EB] dark:focus:border-[#3B82F6] rounded-xl px-3 py-2.5 text-base md:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none transition-colors font-medium" 
                                                    placeholder="ex: 2 dias, 24h" 
                                                />
                                            </div>
                                        </div>

                                        {/* Campo Mensagem */}
                                        <div className="flex-1 min-w-0">
                                            <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                                                Mensagem / Diferencial
                                            </label>
                                            <input 
                                                type="text" 
                                                required 
                                                value={message} 
                                                onChange={e => setMessage(e.target.value)} 
                                                className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] focus:border-[#2563EB] dark:focus:border-[#3B82F6] rounded-xl px-3.5 py-2.5 text-base md:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none transition-colors font-medium" 
                                                placeholder="Descreva seu prazo, qualidade ou software..." 
                                            />
                                        </div>

                                        {/* Botão Enviar */}
                                        <div className="w-full md:w-auto shrink-0 pt-1 md:pt-0">
                                            <button 
                                                type="submit" 
                                                disabled={submitting} 
                                                className="w-full md:w-auto min-h-[48px] md:min-h-[42px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] font-semibold px-6 py-2.5 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
                                            >
                                                <Send className="w-4 h-4" />
                                                Enviar Proposta
                                            </button>
                                        </div>
                                    </form>
                                    {amount && Number(amount) > 0 && (
                                        <div className="mt-3 pt-3 border-t border-[var(--border-hairline)] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-secondary)]">
                                            <span>Cliente paga: <strong className="text-[var(--text-primary)] font-bold">R$ {Number(amount).toFixed(2)}</strong> (Taxa Zero)</span>
                                            <span>Taxa da Plataforma (10%): <strong className="text-[#2563EB] dark:text-[#60A5FA] font-bold">R$ {(Number(amount) * 0.10).toFixed(2)}</strong></span>
                                            <span className="bg-[#0D9488]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0D9488]/25 px-2.5 py-0.5 rounded-md font-bold">
                                                Você recebe líquido: R$ {(Number(amount) * 0.90).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-6 bg-[var(--bg-surface-elevated)] p-5 rounded-2xl border border-[var(--border-hairline)] flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="p-3 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/25 text-[#2563EB] dark:text-[#60A5FA] shrink-0">
                                            <Code className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Quer enviar uma proposta para este pedido?</h3>
                                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                                                Para garantir segurança e qualidade técnica, ative seu perfil de programador configurando seus softwares e dados de PIX.
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href={currentUser?.id 
                                            ? `/profile/${currentUser.id}?edit=true&activate=programmer&returnTo=${encodeURIComponent(`/jobs/${job.id}`)}` 
                                            : `/login?redirect=${encodeURIComponent(`/profile/me?edit=true&activate=programmer&returnTo=${encodeURIComponent(`/jobs/${job.id}`)}`)}`
                                        }
                                        className="shrink-0 min-h-[48px] inline-flex items-center justify-center bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] active:scale-95 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all text-center w-full sm:w-auto"
                                    >
                                        Completar Perfil para Enviar Proposta
                                    </Link>
                                </div>
                            )
                        )}

                        {/* Buyer Alert: Pending Payment */}
                        {isOwner && acceptedProposal && job.status === 'aberto' && (
                            <div className="mb-6 bg-[#2563EB]/10 border border-[#2563EB]/25 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-start sm:items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] px-2.5 py-0.5 rounded-full">
                                            Aguardando Seu Pagamento
                                        </span>
                                        <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                                            Você aceitou a proposta de {acceptedProposal.users?.name || 'um profissional'} no valor de <strong className="text-[#2563EB] dark:text-[#60A5FA]">R$ {acceptedProposal.amount?.toFixed(2)}</strong>
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                            Conclua o pagamento para o programador começar a criar sua matriz. O valor fica 100% seguro em custódia até você aprovar.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <Link
                                        href={`/checkout/${acceptedProposal.id}`}
                                        className="min-h-[48px] inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        Pagar Agora
                                    </Link>
                                    <button
                                        onClick={() => handleCancelReservation(acceptedProposal.id, 'client')}
                                        disabled={cancellingReserve}
                                        className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-[#DC2626] dark:text-[#EF4444] border border-red-500/25 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors"
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
                                (job.status === 'aberto' || !job.status) ? (
                                    <div className="mb-6 bg-[#2563EB]/10 border border-[#2563EB]/25 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-start sm:items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] px-2.5 py-0.5 rounded-full">
                                                        Proposta Aceita • Aguardando Pagamento
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                                                    O comprador aceitou sua proposta no valor de <strong className="text-[#2563EB] dark:text-[#60A5FA]">R$ {myExistingProposal.amount?.toFixed(2)}</strong>
                                                </p>
                                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                                    <strong>Atenção:</strong> Não inicie a criação da matriz ainda. Seu prazo ({myExistingProposal.deadline_text || 'combinado'}) só começará a contar após a confirmação do pagamento em custódia.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                            <button
                                                onClick={() => handleNegotiate(myExistingProposal.id)}
                                                className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                Chat com Cliente
                                            </button>
                                            <button
                                                onClick={() => handleCancelReservation(myExistingProposal.id, 'programmer')}
                                                disabled={cancellingReserve}
                                                className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-[#DC2626] dark:text-[#EF4444] border border-red-500/25 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                                                title="Se o cliente demorar para pagar, você pode liberar o pedido para não ficar preso"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                {cancellingReserve ? 'Liberando...' : 'Liberar Pedido'}
                                            </button>
                                        </div>
                                    </div>
                                ) : null
                            ) : myExistingProposal.status === 'contraproposta' && myExistingProposal.counter_amount ? (
                                <div className="mb-6 bg-[#2563EB]/10 border-2 border-[#2563EB]/40 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-start sm:items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0 border border-[#2563EB]/25">
                                            <Handshake className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[11px] font-bold uppercase tracking-wider bg-[#2563EB] text-white px-2.5 py-0.5 rounded-full">
                                                    Contraproposta Recebida
                                                </span>
                                                <span className="text-xs text-[var(--text-secondary)]">
                                                    Sua proposta inicial: R$ {myExistingProposal.amount?.toFixed(2)}
                                                </span>
                                            </div>
                                            <p className="text-base font-bold text-[var(--text-primary)] leading-snug">
                                                O cliente ofereceu <strong className="text-[#2563EB] dark:text-[#60A5FA] text-lg">R$ {Number(myExistingProposal.counter_amount).toFixed(2)}</strong> para fechar este trabalho!
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                                                Ao aceitar a oferta, o valor da sua proposta será atualizado para <strong>R$ {Number(myExistingProposal.counter_amount).toFixed(2)}</strong> e o cliente poderá pagar.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0 flex-wrap">
                                        <button
                                            onClick={() => handleProgrammerResponse(myExistingProposal.id, 'accept_counter', myExistingProposal)}
                                            className="flex-1 sm:flex-none min-h-[48px] sm:min-h-[42px] inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-3 rounded-xl text-xs font-semibold transition-all active:scale-95"
                                        >
                                            <Check className="w-4 h-4" />
                                            Aceitar Oferta (R$ {Number(myExistingProposal.counter_amount).toFixed(2)})
                                        </button>
                                        <button
                                            onClick={() => handleProgrammerResponse(myExistingProposal.id, 'reject_counter', myExistingProposal)}
                                            className="min-h-[44px] sm:min-h-[42px] inline-flex items-center justify-center gap-1.5 border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-3 rounded-xl text-xs font-semibold transition-colors hover:bg-[var(--btn-glass-bg)] active:scale-95"
                                            title="Recusar contraproposta e manter seu valor original"
                                        >
                                            <X className="w-4 h-4" />
                                            Recusar
                                        </button>
                                        <button
                                            onClick={() => handleNegotiate(myExistingProposal.id)}
                                            className="min-h-[44px] sm:min-h-[42px] inline-flex items-center justify-center gap-1.5 bg-[var(--bg-surface-elevated)] hover:bg-[var(--btn-glass-bg)] text-[var(--text-primary)] px-4 py-3 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] transition-colors"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            Chat
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6 bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                                Você já enviou uma proposta para este pedido
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                                Valor oferecido: <strong className="text-[#2563EB] dark:text-[#60A5FA]">R$ {myExistingProposal.amount?.toFixed(2)}</strong> • Prazo: <strong>{myExistingProposal.deadline_text || 'A combinar'}</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                                        <button
                                            onClick={() => {
                                                setEditProposalAmount(myExistingProposal.amount?.toString() || '')
                                                setShowEditProposalModal(true)
                                            }}
                                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 bg-[var(--bg-surface)] hover:bg-[var(--btn-glass-bg)] text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                                        >
                                            <DollarSign className="w-3.5 h-3.5" />
                                            Ajustar Valor
                                        </button>
                                        <button
                                            onClick={() => handleNegotiate(myExistingProposal.id)}
                                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Abrir Chat da Proposta
                                        </button>
                                    </div>
                                </div>
                            )
                        )}

                        {!isOwner && isJobLocked && !hasAlreadySentProposal && (
                            <div className="mb-6 bg-[#2563EB]/10 border border-[#2563EB]/25 p-4 rounded-xl flex items-center gap-3">
                                <Handshake className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-[var(--text-primary)]">Negócio Fechado • Em Produção</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Este pedido já fechou proposta com outro profissional e está em produção. Não está mais aceitando novas propostas.</p>
                                </div>
                            </div>
                        )}

                        {isOwner ? (
                            <div className="flex gap-4 overflow-x-auto pb-2 snap-x custom-scrollbar">
                            {proposals.length === 0 ? (
                                <div className="w-full text-center py-6 text-[var(--text-secondary)] text-sm">Nenhuma proposta enviada.</div>
                            ) : (
                                proposals.map((proposal: any) => (
                                    <div key={proposal.id} id={`proposal-card-${proposal.id}`} className={`min-w-[290px] max-w-[340px] shrink-0 bg-[var(--bg-surface-elevated)] rounded-2xl border p-4 snap-start transition-all ${negotiatingProposalId === proposal.id ? 'border-[#2563EB] dark:border-[#3B82F6]' : 'border-[var(--border-hairline)] hover:border-[var(--border-glass)]'}`}>
                                        <div className="flex flex-col mb-3 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-hairline)] relative shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] overflow-hidden relative shrink-0 flex items-center justify-center">
                                                    {proposal.users?.avatar_url ? (
                                                        <img src={proposal.users.avatar_url} className="w-full h-full object-cover" alt=""/>
                                                    ) : <User className="w-5 h-5 text-[var(--text-secondary)]"/>}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="text-sm font-bold text-[var(--text-primary)] leading-tight truncate">
                                                        {proposal.users?.name || 'Profissional'} 
                                                    </div>
                                                    {proposal.users?.reviews_count && proposal.users.reviews_count > 0 && proposal.users?.rating ? (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Star className="w-3 h-3 text-[#2563EB] fill-[#2563EB] dark:text-[#60A5FA] dark:fill-[#60A5FA]" />
                                                            <span className="text-[var(--text-primary)] text-xs font-bold">{Number(proposal.users.rating).toFixed(1)}</span>
                                                            <span className="text-[10px] text-[var(--text-secondary)]">({proposal.users.reviews_count})</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="text-[10px] text-[var(--text-secondary)] font-medium">Novo profissional</span>
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-mono mt-0.5">#{proposal.id.split('-')[0]}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center bg-[var(--bg-primary)] p-2.5 rounded-lg border border-[var(--border-hairline)]">
                                                <p className="text-lg font-bold text-[#2563EB] dark:text-[#60A5FA] leading-none tracking-tight">R$ {proposal.amount.toFixed(2)}</p>
                                                <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 font-medium bg-[var(--bg-surface)] px-2 py-1 rounded-md border border-[var(--border-hairline)]"><Clock className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]"/> {proposal.deadline_text}</p>
                                            </div>
                                        </div>

                                        {/* Mensagem da Proposta Legível e Expansível no Mobile */}
                                        <div className="mt-2 mb-3 bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-hairline)]">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
                                                    <MessageSquare className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" /> Mensagem do Programador
                                                </span>
                                            </div>
                                            <div className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
                                                {proposal.message ? (
                                                    expandedProposalMessages[proposal.id] || proposal.message.length <= 110 ? (
                                                        <span>&ldquo;{proposal.message}&rdquo;</span>
                                                    ) : (
                                                        <>
                                                            <span>&ldquo;{proposal.message.slice(0, 110)}...&rdquo;</span>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setExpandedProposalMessages(prev => ({ ...prev, [proposal.id]: true }))}
                                                                className="text-[#2563EB] dark:text-[#60A5FA] hover:underline font-bold ml-1.5 inline-block text-[11px]"
                                                            >
                                                                Ler tudo
                                                            </button>
                                                        </>
                                                    )
                                                ) : (
                                                    <span className="text-[var(--text-secondary)] italic">Sem mensagem adicional.</span>
                                                )}
                                                {expandedProposalMessages[proposal.id] && proposal.message && proposal.message.length > 110 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => setExpandedProposalMessages(prev => ({ ...prev, [proposal.id]: false }))}
                                                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-[11px] block mt-1"
                                                    >
                                                        Recolher
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col gap-2">
                                            {isOwner && proposal.status === 'pendente' && (
                                                <div className="flex flex-col gap-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button 
                                                            onClick={() => setConfirmAcceptModal(proposal.id)} 
                                                            className="min-h-[48px] sm:min-h-[42px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                                        >
                                                            <Zap className="w-3.5 h-3.5"/> Pagar Agora
                                                        </button>
                                                        <button 
                                                            onClick={() => handleNegotiate(proposal.id)} 
                                                            className={`min-h-[44px] sm:min-h-[42px] border text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1 relative ${negotiatingProposalId === proposal.id ? 'bg-[#2563EB]/12 text-[#2563EB] dark:text-[#60A5FA] border-[#2563EB]/30' : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5"/> {negotiatingProposalId === proposal.id ? 'Fechar Chat' : 'Abrir Chat'}
                                                            {unreadCounts[proposal.id] > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white shadow-sm">{unreadCounts[proposal.id]}</span>}
                                                        </button>
                                                    </div>
                                                    <button 
                                                        onClick={() => setActiveCounterProposalId(activeCounterProposalId === proposal.id ? null : proposal.id)}
                                                        className={`w-full min-h-[44px] sm:min-h-0 text-xs font-semibold py-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 ${activeCounterProposalId === proposal.id ? 'bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] border-[#2563EB]/40' : 'bg-[var(--btn-glass-bg)] hover:bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border-[#2563EB]/25 hover:border-[#2563EB]/40'}`}
                                                    >
                                                        <Handshake className="w-3.5 h-3.5"/> {activeCounterProposalId === proposal.id ? 'Fechar Contraproposta' : 'Fazer Contraproposta'}
                                                    </button>
                                                </div>
                                            )}

                                            {!isOwner && currentUser?.id === proposal.criador_id && (
                                                <button onClick={() => handleNegotiate(proposal.id)} className={`w-full min-h-[44px] sm:min-h-0 border text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 relative ${negotiatingProposalId === proposal.id ? 'bg-[#2563EB]/12 text-[#2563EB] dark:text-[#60A5FA] border-[#2563EB]/30' : 'border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA]'}`}>
                                                    <MessageSquare className="w-3.5 h-3.5"/> {negotiatingProposalId === proposal.id ? 'Fechar Chat' : 'Abrir Chat'}
                                                    {unreadCounts[proposal.id] > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white shadow-sm">{unreadCounts[proposal.id]}</span>}
                                                </button>
                                            )}

                                            {/* Painel de Contraproposta no Card */}
                                            {isOwner && activeCounterProposalId === proposal.id && proposal.status === 'pendente' && (
                                                <div className="p-3 bg-[var(--bg-surface)] border border-[#2563EB]/30 rounded-xl flex flex-col gap-2 shadow-lg animate-in slide-in-from-top duration-200">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1">
                                                            <Handshake className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]"/> Sua Contraproposta
                                                        </p>
                                                        <span className="text-[10px] text-[var(--text-secondary)]">Atual: R$ {proposal.amount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-xs font-bold">R$</span>
                                                            <input 
                                                                type="number" 
                                                                step="0.01"
                                                                min="1"
                                                                inputMode="decimal"
                                                                placeholder="0,00" 
                                                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-hairline)] text-sm font-bold pl-8 pr-2.5 py-2 rounded-lg text-[var(--text-primary)] focus:border-[#2563EB] dark:focus:border-[#3B82F6] outline-none" 
                                                                value={counterAmount}
                                                                onChange={(e) => setCounterAmount(e.target.value)}
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => submitCounterProposal(proposal.id)} 
                                                            disabled={!counterAmount || submittingCounter} 
                                                            className="min-h-[44px] sm:min-h-0 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-all whitespace-nowrap active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                                                        >
                                                            {submittingCounter && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                                            {submittingCounter ? 'Enviando...' : 'Enviar'}
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                                        <span className="text-[10px] text-[var(--text-secondary)]">Atalhos:</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setCounterAmount((proposal.amount * 0.9).toFixed(2))}
                                                            className="min-h-[36px] sm:min-h-0 text-[10px] bg-[var(--btn-glass-bg)] hover:bg-[#2563EB]/10 text-[var(--text-primary)] px-2.5 py-1.5 sm:py-1 rounded border border-[var(--border-hairline)]"
                                                        >
                                                            -10% (R$ {(proposal.amount * 0.9).toFixed(2)})
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setCounterAmount((proposal.amount * 0.85).toFixed(2))}
                                                            className="min-h-[36px] sm:min-h-0 text-[10px] bg-[var(--btn-glass-bg)] hover:bg-[#2563EB]/10 text-[var(--text-primary)] px-2.5 py-1.5 sm:py-1 rounded border border-[var(--border-hairline)]"
                                                        >
                                                            -15% (R$ {(proposal.amount * 0.85).toFixed(2)})
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {proposal.status === 'aceita' && (
                                                <div className="flex flex-col gap-2">
                                                    <div className="w-full text-center py-2 bg-[#0D9488]/10 text-[#0F766E] dark:text-[#14B8A6] text-xs font-bold rounded-lg border border-[#0D9488]/25 uppercase tracking-wider">Aceita</div>
                                                    {isOwner && job.status === 'aberto' && (
                                                        <button onClick={() => { window.location.href = `/checkout/${proposal.id}` }} className="w-full min-h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                                            <DollarSign className="w-3 h-3"/> Continuar Pagamento
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {!isOwner && proposal.status === 'contraproposta' && proposal.criador_id === currentUser?.id && (
                                                <div className="p-3 bg-[#2563EB]/10 border border-[#2563EB]/25 rounded-xl mt-2">
                                                    <p className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] mb-2 flex items-center gap-1.5">
                                                        <Handshake className="w-3.5 h-3.5"/> Oferta do Cliente: R$ {Number(proposal.counter_amount).toFixed(2)}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleProgrammerResponse(proposal.id, 'accept_counter', proposal)} 
                                                            className="flex-1 min-h-[44px] sm:min-h-0 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1 active:scale-95"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Aceitar Oferta (R$ {Number(proposal.counter_amount).toFixed(2)})
                                                        </button>
                                                        <button 
                                                            onClick={() => handleProgrammerResponse(proposal.id, 'reject_counter', proposal)} 
                                                            className="min-h-[44px] sm:min-h-0 border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs py-2 px-3 rounded-lg hover:bg-[var(--btn-glass-bg)] transition-colors flex items-center gap-1 active:scale-95"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            Recusar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {isOwner && proposal.status === 'contraproposta' && (
                                                <div className="flex flex-col gap-2 mt-2">
                                                    <div className="p-3 bg-[#2563EB]/10 border border-[#2563EB]/25 rounded-lg text-center">
                                                        <p className="text-[10px] text-[#2563EB] dark:text-[#60A5FA] font-bold uppercase tracking-wider mb-1"><Clock className="w-3 h-3 inline mr-1"/> Aguardando Resposta</p>
                                                        <p className="text-xs text-[var(--text-primary)]">Você ofereceu <strong>R$ {Number(proposal.counter_amount).toFixed(2)}</strong></p>
                                                    </div>
                                                    <button onClick={() => handleNegotiate(proposal.id)} className={`w-full min-h-[44px] sm:min-h-0 border text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 relative ${negotiatingProposalId === proposal.id ? 'bg-[#2563EB]/12 text-[#2563EB] dark:text-[#60A5FA] border-[#2563EB]/30' : 'border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                                                        <MessageSquare className="w-3 h-3"/> {negotiatingProposalId === proposal.id ? 'Fechar Chat' : 'Abrir Chat'}
                                                        {unreadCounts[proposal.id] > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white shadow-sm">{unreadCounts[proposal.id]}</span>}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                                )}
                            </div>
                        ) : (
                            <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2.5">
                                <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/25 flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA]">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-bold text-[var(--text-primary)]">
                                    {proposals.length === 0 
                                        ? 'Nenhuma proposta recebida até o momento' 
                                        : `${proposals.length} ${proposals.length === 1 ? 'proposta recebida' : 'propostas recebidas'}`
                                    }
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] max-w-md leading-relaxed">
                                    {proposals.length === 0 
                                        ? 'Seja o primeiro a enviar uma proposta de orçamento para este pedido!' 
                                        : 'As propostas e valores são confidenciais e visíveis exclusivamente para o cliente deste pedido.'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. BOTTOM SECTION: Chat */}
                {negotiatingProposalId && (
                    <div 
                        id="negotiation-chat-section" 
                        className="fixed inset-0 z-50 md:static md:z-auto h-[100dvh] md:h-[560px] w-full bg-[var(--bg-primary)] md:border md:border-[var(--border-hairline)] md:rounded-2xl overflow-hidden shadow-2xl md:mt-4 md:mb-8 animate-in slide-in-from-bottom-4 fade-in duration-300"
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
                                onClose={handleCloseChat}
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

                {/* MODAL PARA O PROGRAMADOR AJUSTAR O VALOR DA SUA PROPOSTA */}
                {showEditProposalModal && myExistingProposal && (
                    <div 
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
                        onClick={() => setShowEditProposalModal(false)}
                    >
                        <div 
                            className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowEditProposalModal(false)}
                                className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--btn-glass-bg)] transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-12 h-12 bg-[#2563EB]/15 rounded-xl flex items-center justify-center mb-4 border border-[#2563EB]/25">
                                <DollarSign className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Ajustar Valor da Proposta</h3>
                            <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                                Valor atual: <strong className="text-[#2563EB] dark:text-[#60A5FA]">R$ {myExistingProposal.amount?.toFixed(2)}</strong>. Digite o novo valor acordado para fechar este trabalho:
                            </p>
                            <div className="relative mb-5">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm font-bold">R$</span>
                                <input 
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    placeholder="0,00"
                                    value={editProposalAmount}
                                    onChange={e => setEditProposalAmount(e.target.value)}
                                    className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl pl-10 pr-4 py-3 text-base text-[var(--text-primary)] font-bold focus:border-[#2563EB] dark:focus:border-[#3B82F6] outline-none"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleProgrammerAdjustProposal}
                                    disabled={savingEditProposal || !editProposalAmount}
                                    className="flex-1 min-h-[48px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs py-3 rounded-xl transition-all disabled:opacity-50 active:scale-95"
                                >
                                    {savingEditProposal ? 'Salvando...' : 'Confirmar Novo Valor'}
                                </button>
                                <button
                                    onClick={() => setShowEditProposalModal(false)}
                                    className="min-h-[48px] border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs px-4 py-3 rounded-xl hover:bg-[var(--btn-glass-bg)] transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* SUCCESS MODAL */}
                {showSuccessModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-8 rounded-2xl w-full max-w-md text-center shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-[#0D9488]/15 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#0D9488]/25">
                                <CheckCircle className="w-10 h-10 text-[#0F766E] dark:text-[#14B8A6]" />
                            </div>
                            <h3 className="text-3xl font-semibold text-[var(--text-primary)] mb-2">Matriz Enviada com Sucesso!</h3>
                            <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
                                Parabéns pelo trabalho! O comprador já foi notificado.<br/><br/>
                                <strong className="text-[var(--text-primary)]">O pagamento será liberado</strong> automaticamente em <strong>24 horas</strong> caso o cliente não solicite revisões, ou imediatamente após a avaliação.
                            </p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="w-full min-h-[48px] bg-[#0D9488] text-white font-semibold py-4 rounded-xl hover:bg-[#0F766E] transition-colors"
                            >
                                Entendi, fechar
                            </button>
                        </div>
                    </div>
                )}

                {/* CONFIRM ACCEPT MODAL */}
                {confirmAcceptModal && (
                    <div 
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
                        onClick={handleCloseConfirmAccept}
                    >
                        <div 
                            className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-6 md:p-8 rounded-2xl w-full max-w-md text-center shadow-2xl animate-in zoom-in-95 duration-200 relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={handleCloseConfirmAccept}
                                className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--btn-glass-bg)] transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-16 h-16 bg-[#2563EB]/15 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#2563EB]/25">
                                <DollarSign className="w-8 h-8 text-[#2563EB] dark:text-[#60A5FA]" />
                            </div>
                            <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Ir para o Pagamento?</h3>
                            <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
                                Você está prestes a fechar negócio com este programador. O valor ficará retido com segurança até que a matriz seja entregue e aprovada por você.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={handleCloseConfirmAccept}
                                    disabled={acceptingProposal}
                                    className="flex-1 min-h-[48px] bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] text-[var(--text-primary)] font-semibold py-3.5 rounded-xl hover:border-[#2563EB]/40 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={() => handleAcceptProposal(confirmAcceptModal)}
                                    disabled={acceptingProposal}
                                    className="flex-1 min-h-[48px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-3.5 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {acceptingProposal ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                                            <span>Indo para Pagamento...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Pagar Agora</span>
                                            <Zap className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* REVISION REQUEST MODAL */}
                {showRevisionModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
                            <button
                                onClick={() => setShowRevisionModal(false)}
                                className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--btn-glass-bg)] transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-[#2563EB]/15 rounded-xl border border-[#2563EB]/25 flex items-center justify-center shrink-0">
                                    <Wrench className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">Solicitar Ajuste na Matriz</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Descreva o que aconteceu no teste para o programador corrigir.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                                        O que precisa ser ajustado? *
                                    </label>
                                    <textarea
                                        value={revisionNotes}
                                        onChange={e => setRevisionNotes(e.target.value)}
                                        placeholder="Ex: No teste em tecido piquet, o ponto da letra ficou muito denso e repuxou. Precisa reduzir um pouco os pontos e aumentar o contorno em 2mm..."
                                        className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl p-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] min-h-[120px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
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
                                        className="flex items-center gap-3 bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] hover:border-[#2563EB]/40 rounded-xl p-3.5 cursor-pointer text-xs text-[var(--text-primary)] transition-colors"
                                    >
                                        <Camera className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                                        <span className="truncate">
                                            {revisionPhoto ? `Arquivo selecionado: ${revisionPhoto.name}` : 'Clique para anexar foto do bordado com defeito'}
                                        </span>
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowRevisionModal(false)}
                                        className="flex-1 min-h-[48px] bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] text-[var(--text-primary)] font-semibold py-3.5 rounded-xl hover:border-[#2563EB]/40 transition-colors text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={submittingRevision}
                                        onClick={handleRequestRevision}
                                        className="flex-1 min-h-[48px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                                    >
                                        {submittingRevision ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

                {/* Modal de Confirmação — Cancelar/Excluir Pedido */}
                {showCancelModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                                    <Trash2 className="w-6 h-6 text-[#DC2626] dark:text-[#EF4444]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Excluir Pedido Definitivamente</h3>
                                    <p className="text-xs text-[var(--text-secondary)]">Esta ação apagará o pedido do banco de dados</p>
                                </div>
                            </div>

                            <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4 mb-5">
                                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                                    Tem certeza que deseja apagar o pedido <strong>&quot;{job?.title}&quot;</strong>?
                                </p>
                                <ul className="mt-3 space-y-1.5 text-xs text-[var(--text-secondary)]">
                                    <li className="flex items-start gap-2">
                                        <AlertCircle className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF4444] shrink-0 mt-0.5" />
                                        O pedido será apagado permanentemente do banco de dados
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <AlertCircle className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF4444] shrink-0 mt-0.5" />
                                        Cobranças pendentes serão canceladas no Asaas
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <AlertCircle className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF4444] shrink-0 mt-0.5" />
                                        Propostas vinculadas serão removidas
                                    </li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCancelModal(false)}
                                    disabled={cancelling}
                                    className="flex-1 min-h-[48px] bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] text-[var(--text-primary)] font-semibold py-3 rounded-xl hover:border-[#2563EB]/40 transition-colors text-sm disabled:opacity-50"
                                >
                                    Voltar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelJob}
                                    disabled={cancelling}
                                    className="flex-1 min-h-[48px] bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                >
                                    {cancelling ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Excluindo...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            Sim, Excluir Pedido
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
