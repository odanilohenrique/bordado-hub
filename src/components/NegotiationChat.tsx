'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Send, Paperclip, User, FileImage, RefreshCw, CheckCircle2, DollarSign, Package, Download, Handshake, X, Check, Clock, CheckCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Message {
    id: string
    content: string
    attachment_url?: string
    sender_id: string
    created_at: string
    users?: { name: string; avatar_url?: string | null }
}

interface ProposalData {
    id: string
    amount: number
    status: string
    counter_amount: number | null
    counter_message: string | null
    criador_id: string
}

interface ChatProps {
    proposalId: string
    currentUserId: string
    senderName: string
    isOwner: boolean
    jobId: string
    initialAmount: number
    onProposalUpdated?: () => void
    onClose?: () => void
    otherUser?: {
        name: string
        avatar_url?: string | null
        role?: string
    }
}

export default function NegotiationChat({ 
    proposalId, 
    currentUserId, 
    senderName, 
    isOwner, 
    jobId, 
    initialAmount, 
    onProposalUpdated, 
    onClose, 
    otherUser 
}: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [showQuickDeal, setShowQuickDeal] = useState(false)
    const [agreedValue, setAgreedValue] = useState(initialAmount?.toString() || '')
    const [proposalData, setProposalData] = useState<ProposalData | null>(null)
    const [processingCounter, setProcessingCounter] = useState(false)
    const [otherUserData, setOtherUserData] = useState<{
        name: string
        avatar_url?: string | null
        role?: string
    } | null>(otherUser || null)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (otherUser) {
            setOtherUserData(otherUser)
        }
    }, [otherUser])

    useEffect(() => {
        loadMessages()
        loadProposal()
        fetchOtherUser()

        // 1. Subscribe to Realtime postgres_changes
        const channel = supabase
            .channel(`proposal_chat:${proposalId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'proposal_messages',
                filter: `proposal_id=eq.${proposalId}`
            }, async (payload) => {
                const newMsg = payload.new as Message
                
                // If it's not from me, fetch sender details
                if (newMsg.sender_id !== currentUserId) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('name, avatar_url')
                        .eq('id', newMsg.sender_id)
                        .single()
                    
                    if (userData) {
                        newMsg.users = { name: userData.name, avatar_url: userData.avatar_url }
                        if (!otherUserData?.name) {
                            setOtherUserData({
                                name: userData.name,
                                avatar_url: userData.avatar_url,
                                role: isOwner ? 'Programador' : 'Cliente'
                            })
                        }
                    }
                }

                setMessages(prev => {
                    const exists = prev.some(m => m.id === newMsg.id)
                    if (exists) return prev
                    return [...prev, newMsg]
                })
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'proposals',
                filter: `id=eq.${proposalId}`
            }, (payload) => {
                if (payload.new) {
                    const updated = payload.new as ProposalData
                    setProposalData(updated)
                    if (updated.amount) setAgreedValue(updated.amount.toString())
                }
            })
            .subscribe()

        // 2. High-speed silent polling fallback (every 2.5s) to guarantee zero-F5 instant arrival
        const syncInterval = setInterval(async () => {
            try {
                const { data } = await supabase
                    .from('proposal_messages')
                    .select('*, users:sender_id(name, avatar_url)')
                    .eq('proposal_id', proposalId)
                    .order('created_at', { ascending: true })

                if (data && data.length > 0) {
                    setMessages(prev => {
                        if (prev.length === data.length && prev[prev.length - 1]?.id === data[data.length - 1]?.id) {
                            return prev
                        }
                        return data
                    })
                }

                const { data: prop } = await supabase
                    .from('proposals')
                    .select('id, amount, status, counter_amount, counter_message, criador_id')
                    .eq('id', proposalId)
                    .single()

                if (prop) {
                    setProposalData(prop)
                }
            } catch (err) {
                // silent
            }
        }, 2500)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(syncInterval)
        }
    }, [proposalId, currentUserId])

    const fetchOtherUser = async () => {
        try {
            if (isOwner) {
                const { data: prop } = await supabase
                    .from('proposals')
                    .select('criador_id, users:criador_id(name, avatar_url)')
                    .eq('id', proposalId)
                    .single()
                if (prop?.users) {
                    setOtherUserData({
                        name: (prop.users as any).name || 'Programador',
                        avatar_url: (prop.users as any).avatar_url || null,
                        role: 'Programador'
                    })
                }
            } else {
                const { data: jobInfo } = await supabase
                    .from('jobs')
                    .select('cliente_id, users:cliente_id(name, avatar_url)')
                    .eq('id', jobId)
                    .single()
                if (jobInfo?.users) {
                    setOtherUserData({
                        name: (jobInfo.users as any).name || 'Cliente',
                        avatar_url: (jobInfo.users as any).avatar_url || null,
                        role: 'Cliente'
                    })
                }
            }
        } catch (e) {
            // silent
        }
    }

    const loadProposal = async () => {
        try {
            const { data } = await supabase
                .from('proposals')
                .select('id, amount, status, counter_amount, counter_message, criador_id')
                .eq('id', proposalId)
                .single()

            if (data) {
                setProposalData(data)
                if (data.amount) setAgreedValue(data.amount.toString())
            }
        } catch (e) {
            // silent
        }
    }

    const handleAcceptCounter = async () => {
        if (!proposalData?.counter_amount) return
        setProcessingCounter(true)
        try {
            const targetAmount = proposalData.counter_amount
            const { error: propError } = await supabase
                .from('proposals')
                .update({
                    job_id: jobId,
                    amount: targetAmount,
                    status: 'pendente',
                    counter_amount: null,
                    counter_message: null
                })
                .eq('id', proposalId)

            if (propError) throw propError

            // Insert system message into chat
            await supabase.from('proposal_messages').insert({
                proposal_id: proposalId,
                sender_id: currentUserId,
                content: `[CONTRAOFERTA ACEITA] Aceitei sua contraproposta de R$ ${Number(targetAmount).toFixed(2)}. O valor foi atualizado!`
            })

            // Notify client
            const { data: jobInfo } = await supabase
                .from('jobs')
                .select('cliente_id, title')
                .eq('id', jobId)
                .single()

            if (jobInfo?.cliente_id) {
                await supabase.from('notifications').insert({
                    user_id: jobInfo.cliente_id,
                    type: 'contraproposta_aceita',
                    title: 'Contraproposta Aceita!',
                    message: `O produtor aceitou sua oferta de R$ ${Number(targetAmount).toFixed(2)} no pedido "${jobInfo.title}". Conclua o pagamento para iniciar a produção.`,
                    link_url: `/jobs/${jobId}?pay=${proposalId}`
                })
            }

            setProposalData(prev => prev ? ({
                ...prev,
                amount: targetAmount,
                status: 'pendente',
                counter_amount: null,
                counter_message: null
            }) : null)

            toast.success(`Oferta aceita! O valor foi atualizado para R$ ${Number(targetAmount).toFixed(2)}.`)
            onProposalUpdated?.()
        } catch (err: any) {
            toast.error('Erro ao aceitar oferta: ' + err.message)
        } finally {
            setProcessingCounter(false)
        }
    }

    const handleRejectCounter = async () => {
        setProcessingCounter(true)
        try {
            const { error: propError } = await supabase
                .from('proposals')
                .update({
                    status: 'pendente',
                    counter_amount: null,
                    counter_message: null
                })
                .eq('id', proposalId)

            if (propError) throw propError

            await supabase.from('proposal_messages').insert({
                proposal_id: proposalId,
                sender_id: currentUserId,
                content: `[CONTRAOFERTA RECUSADA] O valor original de R$ ${Number(proposalData?.amount || initialAmount).toFixed(2)} foi mantido.`
            })

            setProposalData(prev => prev ? ({
                ...prev,
                status: 'pendente',
                counter_amount: null,
                counter_message: null
            }) : null)

            toast.success('Contraproposta recusada. Valor original mantido.')
            onProposalUpdated?.()
        } catch (err: any) {
            toast.error('Erro ao recusar contraproposta: ' + err.message)
        } finally {
            setProcessingCounter(false)
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const loadMessages = async () => {
        const { data } = await supabase
            .from('proposal_messages')
            .select('*, users:sender_id(name, avatar_url)')
            .eq('proposal_id', proposalId)
            .order('created_at', { ascending: true })

        if (data) setMessages(data)
        setLoading(false)
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleQuickDeal = async () => {
        if (!agreedValue || isNaN(parseFloat(agreedValue))) {
            toast.error('Por favor, insira um valor válido.')
            return
        }

        if (!confirm(`Confirmar fechamento por R$ ${parseFloat(agreedValue).toFixed(2)}? \n\nO pedido será aceito e você será redirecionado para o pagamento.`)) return

        setSending(true)
        try {
            const finalAmount = parseFloat(agreedValue)

            // 1. Update proposal amount and status
            const { error: propError } = await supabase
                .from('proposals')
                .update({ 
                    amount: finalAmount,
                    status: 'aceita' 
                })
                .eq('id', proposalId)

            if (propError) throw propError

            // Insert system message in chat
            await supabase.from('proposal_messages').insert({
                proposal_id: proposalId,
                sender_id: currentUserId,
                content: `[NEGÓCIO FECHADO] Valor acordado: R$ ${finalAmount.toFixed(2)}`
            })

            router.push(`/checkout/${proposalId}`)
        } catch (error: any) {
            console.error('Quick deal error:', error)
            toast.error('Erro ao fechar negócio: ' + error.message)
        } finally {
            setSending(false)
        }
    }

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault()
        const text = newMessage.trim()
        if (!text) return

        setSending(true)
        try {
            const res = await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposalId,
                    senderId: currentUserId,
                    content: text
                })
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao enviar mensagem')

            // Optimistic update: add message to local state immediately
            if (result.message) {
                const optimisticMsg = { ...result.message, users: { name: senderName } }
                setMessages(prev => {
                    const exists = prev.some(m => m.id === result.message.id)
                    if (exists) return prev
                    return [...prev, optimisticMsg as Message]
                })
            }
            
            setNewMessage('')
        } catch (error: any) {
            console.error('[NegotiationChat] Send error:', error)
            toast.error('Erro ao enviar mensagem: ' + (error?.message || 'Erro desconhecido'))
        } finally {
            setSending(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSending(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('proposalId', proposalId)
            formData.append('senderId', currentUserId)
            formData.append('content', 'Enviou um anexo')

            const res = await fetch('/api/chat/upload', {
                method: 'POST',
                body: formData,
            })

            const result = await res.json()

            if (!res.ok) throw new Error(result.error || 'Erro no upload')

            // Optimistic update: add message to local state
            if (result.message) {
                const optimisticMsg = { ...result.message, users: { name: senderName } }
                setMessages(prev => {
                    const exists = prev.some(m => m.id === result.message.id)
                    if (exists) return prev
                    return [...prev, optimisticMsg as Message]
                })
            }

        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error?.message || 'Erro ao enviar arquivo. Verifique se é uma imagem válida.')
        } finally {
            setSending(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const renderAttachment = (url?: string) => {
        if (!url) return null
        const ext = url.split('.').pop()?.toLowerCase() || ''
        const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)

        const getCleanFileName = (rawUrl: string) => {
            try {
                const raw = decodeURIComponent(rawUrl.split('/').pop() || 'arquivo')

                // 1. Remove UUID prefixes (e.g. "ff4cd8ca-20b1-40d5-a596-a0733d3ce8cb_")
                let clean = raw.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]/i, '')

                // 2. Remove timestamp/random hash prefixes (e.g. "1790855437637-saxfc_", "1790855437637_")
                clean = clean.replace(/^\d+[-_][a-z0-9]+[_-]/i, '').replace(/^\d+_/i, '')

                const fileExtension = clean.split('.').pop() || ext || 'arquivo'
                const baseWithoutExt = clean.substring(0, clean.lastIndexOf('.')) || clean

                // If what's left is only random codes/timestamps (such as legacy uploads)
                const isOnlyCodeOrHash = 
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(baseWithoutExt) ||
                    /^\d{10,14}(-[a-z0-9]+)?$/i.test(baseWithoutExt) ||
                    /^[a-z0-9]{5,10}$/i.test(baseWithoutExt)

                if (isOnlyCodeOrHash) {
                    return `anexo_revisao.${fileExtension}`
                }

                return clean || raw
            } catch {
                return 'arquivo'
            }
        }

        const fileName = getCleanFileName(url)

        if (isImage) {
            return (
                <div className="mb-2 overflow-hidden rounded-xl border border-black/20 bg-black/40">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block relative group/img">
                        <img
                            src={url}
                            alt="Anexo"
                            className="max-w-full h-auto object-cover rounded-xl hover:opacity-95 transition-opacity"
                            style={{ maxHeight: '240px' }}
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-black/70 text-white text-[11px] font-medium px-2.5 py-1 rounded-md backdrop-blur-sm flex items-center gap-1.5 shadow">
                                <FileImage className="w-3.5 h-3.5" /> Ver imagem completa
                            </span>
                        </div>
                    </a>
                </div>
            )
        }

        return (
            <div className="mb-2">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-2.5 bg-black/30 hover:bg-black/45 border border-white/10 text-gray-100 p-2.5 rounded-xl transition-all group/file text-left"
                >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover/file:scale-105 transition-transform">
                        <Package className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-xs font-semibold text-white group-hover/file:underline">
                            {fileName}
                        </span>
                        <span className="text-[9.5px] text-gray-400 uppercase tracking-wider font-bold">
                            Arquivo .{(ext).toUpperCase()}
                        </span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-gray-300 group-hover/file:text-white shrink-0 ml-1" />
                </a>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-[#111b21] rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
            {/* WhatsApp Header */}
            <div className="px-4 py-3 bg-[#202c33] border-b border-white/5 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 border border-white/10 flex items-center justify-center text-sm font-bold text-gray-200 shrink-0">
                            {otherUserData?.avatar_url ? (
                                <img src={otherUserData.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>{(otherUserData?.name || 'C').charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#202c33]"></span>
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white truncate leading-tight">
                                {otherUserData?.name || 'Negociação Privada'}
                            </h3>
                            {otherUserData?.role && (
                                <span className="text-[10px] font-semibold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                                    {otherUserData.role}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-0.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Online • Proposta #{proposalId.slice(0, 8)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {(proposalData?.amount || initialAmount > 0) && (
                        <div className="hidden sm:flex items-center gap-1.5 bg-[#111b21] border border-white/10 px-2.5 py-1 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Valor</span>
                            <span className="text-xs font-black text-[#FFAE00]">
                                R$ {(proposalData?.amount || initialAmount).toFixed(2)}
                            </span>
                        </div>
                    )}

                    <button 
                        onClick={async () => {
                            setSyncing(true)
                            await loadMessages()
                            await loadProposal()
                            setSyncing(false)
                        }}
                        disabled={syncing || loading}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors active:rotate-180 duration-500 disabled:opacity-50"
                        title="Sincronizar mensagens"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    </button>

                    {isOwner && (
                        <button 
                            onClick={() => setShowQuickDeal(!showQuickDeal)}
                            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                                showQuickDeal 
                                ? 'bg-[#FFAE00] text-black shadow-lg shadow-[#FFAE00]/20' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                            }`}
                            title="Fechar negócio"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Fechar Negócio</span>
                        </button>
                    )}

                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors ml-1"
                            title="Fechar chat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Producer Counter-Proposal Action Banner */}
            {!isOwner && proposalData?.status === 'contraproposta' && proposalData.counter_amount && (
                <div className="bg-[#FFAE00]/15 border-b border-[#FFAE00]/30 p-3 sm:p-4 animate-in slide-in-from-top duration-300 z-10 shrink-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#FFAE00]/20 text-[#FFAE00] flex items-center justify-center shrink-0 border border-[#FFAE00]/30 shadow-sm">
                                <Handshake className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-[#FFAE00] text-black px-2 py-0.5 rounded-full">
                                        Contraproposta do Cliente
                                    </span>
                                    <span className="text-[11px] text-gray-400">
                                        Original: R$ {(proposalData.amount || initialAmount).toFixed(2)}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-white leading-tight">
                                    O cliente ofereceu <strong className="text-[#FFAE00] text-base">R$ {Number(proposalData.counter_amount).toFixed(2)}</strong> para fechar este trabalho.
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Ao aceitar, o valor da sua proposta é atualizado e o cliente poderá concluir o pagamento.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 self-stretch sm:self-center">
                            <button
                                onClick={handleAcceptCounter}
                                disabled={processingCounter}
                                className="flex-1 sm:flex-none bg-[#FFAE00] hover:bg-yellow-400 text-black font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#FFAE00]/20 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" />
                                {processingCounter ? 'Atualizando...' : `Aceitar Oferta (R$ ${Number(proposalData.counter_amount).toFixed(2)})`}
                            </button>
                            <button
                                onClick={handleRejectCounter}
                                disabled={processingCounter}
                                className="border border-white/10 hover:border-white/20 text-gray-400 hover:text-white font-bold text-xs px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5 active:scale-95 disabled:opacity-50 flex items-center gap-1"
                            >
                                <X className="w-3.5 h-3.5" />
                                Recusar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Buyer Waiting Banner */}
            {isOwner && proposalData?.status === 'contraproposta' && proposalData.counter_amount && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3 flex items-center justify-between z-10 shrink-0">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
                        <span className="text-xs text-yellow-400 font-bold">
                            Você enviou uma contraproposta de <strong>R$ {Number(proposalData.counter_amount).toFixed(2)}</strong>. Aguardando o produtor aceitar.
                        </span>
                    </div>
                </div>
            )}

            {/* Quick Deal Panel (Owner Only) */}
            {isOwner && showQuickDeal && (
                <div className="bg-[#FFAE00]/10 border-b border-[#FFAE00]/20 p-3 animate-in slide-in-from-top duration-300 z-10 shrink-0">
                    <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black text-[#FFAE00] uppercase tracking-widest">Ajuste de Valor Final</h4>
                            <span className="text-[10px] text-gray-400">Acordado no chat</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                <input 
                                    type="number"
                                    placeholder="Valor final acordado..."
                                    value={agreedValue}
                                    onChange={(e) => setAgreedValue(e.target.value)}
                                    className="w-full bg-[#0F1115] border border-[#FFAE00]/30 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFAE00] transition-colors"
                                />
                            </div>
                            <button 
                                onClick={handleQuickDeal}
                                disabled={sending || !agreedValue}
                                className="bg-[#FFAE00] hover:bg-yellow-400 text-[#0F1115] font-black text-[11px] px-4 py-2 rounded-lg transition-all shadow-lg shadow-[#FFAE00]/10 disabled:opacity-50 flex items-center gap-2"
                            >
                                {sending ? 'PROCESSANDO...' : 'ACEITAR E PAGAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area - WhatsApp Web Style Centered Column */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin scrollbar-thumb-gray-700/40 scrollbar-track-transparent bg-[#0b141a]">
                <div className="max-w-2xl mx-auto w-full space-y-2.5">
                    {loading ? (
                        <div className="flex justify-center items-center h-48 text-gray-400 text-xs">
                            <span className="animate-pulse">Carregando mensagens...</span>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2 opacity-70">
                            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                                <Send className="w-4 h-4 text-gray-400" />
                            </div>
                            <p className="text-xs text-center">Nenhuma mensagem ainda.<br/>Inicie a conversa!</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isMe = msg.sender_id === currentUserId
                            const isSystemNotice = msg.content?.startsWith('[CONTRAOFERTA') || 
                                                  msg.content?.startsWith('[SISTEMA]') || 
                                                  msg.content?.includes('NEGÓCIO FECHADO')

                            // Render centered WhatsApp-style pill for system updates
                            if (isSystemNotice) {
                                const cleanSystemContent = msg.content
                                    .replace(/^\[CONTRAOFERTA ACEITA\]\s*/i, 'Contraproposta aceita: ')
                                    .replace(/^\[CONTRAOFERTA RECUSADA\]\s*/i, 'Contraproposta recusada: ')
                                    .replace(/^\[SISTEMA\]\s*/i, '')
                                    .replace(/\[NEGÓCIO FECHADO\]/i, 'Negócio fechado!')
                                    .replace(/🤝\s*/g, '')

                                return (
                                    <div key={msg.id} className="flex justify-center my-2.5 select-none">
                                        <div className="bg-[#182229] border border-white/10 text-gray-300 text-[11px] sm:text-xs px-3.5 py-1.5 rounded-lg shadow-sm max-w-md text-center flex items-center gap-2">
                                            <Handshake className="w-3.5 h-3.5 text-[#FFAE00] shrink-0" />
                                            <span>{cleanSystemContent}</span>
                                            <span className="text-[10px] text-gray-500 ml-1">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                )
                            }

                            const cleanContent = msg.content
                                ? msg.content
                                    .replace(/^\[SOLICITAÇÃO DE AJUSTE NA MÁQUINA\]\s*/i, '')
                                    .replace(/^\[AJUSTE NA MÁQUINA\]\s*/i, '')
                                : ''

                            return (
                                <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {/* Avatar on other user's message */}
                                        {!isMe && (
                                            <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-800 border border-white/10 shrink-0 mb-1 flex items-center justify-center text-[10px] font-bold text-gray-300 select-none">
                                                {msg.users?.avatar_url || otherUserData?.avatar_url ? (
                                                    <img 
                                                        src={msg.users?.avatar_url || otherUserData?.avatar_url || ''} 
                                                        alt="" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                ) : (
                                                    <span>{(msg.users?.name || otherUserData?.name || 'C').charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Speech Bubble */}
                                        <div className={`relative px-3.5 py-2 shadow-sm ${
                                            isMe 
                                                ? 'bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-xs border border-[#02735e]/30' 
                                                : 'bg-[#202c33] text-[#e9edef] rounded-2xl rounded-tl-xs border border-white/5'
                                        }`}>
                                            {/* Contact name header for incoming message */}
                                            {!isMe && (
                                                <p className="text-[11px] font-bold text-sky-400 mb-1 leading-tight select-none">
                                                    {msg.users?.name || otherUserData?.name || 'Contato'}
                                                </p>
                                            )}

                                            {renderAttachment(msg.attachment_url)}

                                            {/* Content & Time Layout (WhatsApp inline/wrap style) */}
                                            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                                                {cleanContent && (
                                                    <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words text-[#e9edef] flex-1 min-w-[60px]">
                                                        {cleanContent}
                                                    </p>
                                                )}
                                                <div className={`flex items-center gap-1 select-none text-[10px] ml-auto shrink-0 pb-0.5 ${
                                                    isMe ? 'text-emerald-200/75' : 'text-gray-400'
                                                }`}>
                                                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {isMe && (
                                                        <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* WhatsApp Input Area */}
            <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 bg-[#202c33] border-t border-white/5 flex gap-2 items-center w-full shrink-0">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 p-2.5 text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-full transition-colors focus:outline-none"
                    title="Anexar arquivo ou imagem"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,application/pdf,.dst,.pes,.jef,.emb,.pxf,.xxx,.exp,.vp3,.zip,.rar"
                />

                <div className="flex-1 min-w-0 relative">
                    <input
                        id="chat-message-input"
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Mensagem"
                        className="w-full bg-[#2a3942] border border-transparent focus:border-white/10 rounded-lg px-4 py-2.5 text-sm text-[#e9edef] placeholder-gray-400 focus:outline-none transition-colors"
                    />
                </div>

                <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#029071] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md focus:outline-none active:scale-95"
                    title="Enviar mensagem"
                >
                    <Send className="w-4 h-4 ml-0.5" />
                </button>
            </form>
        </div>
    )
}
