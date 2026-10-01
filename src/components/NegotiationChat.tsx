'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Send, Paperclip, User, FileImage, RefreshCw, CheckCircle2, DollarSign, Package, Download, FileText, Handshake, AlertCircle, X, Check, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/helpers'
import { toast } from 'sonner'

interface Message {
    id: string
    content: string
    attachment_url?: string
    sender_id: string
    created_at: string
    users?: { name: string }
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
    senderName: string // To display in header if needed
    isOwner: boolean
    jobId: string
    initialAmount: number
    onProposalUpdated?: () => void
}

export default function NegotiationChat({ proposalId, currentUserId, senderName, isOwner, jobId, initialAmount, onProposalUpdated }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [showQuickDeal, setShowQuickDeal] = useState(false)
    const [agreedValue, setAgreedValue] = useState(initialAmount?.toString() || '')
    const [proposalData, setProposalData] = useState<ProposalData | null>(null)
    const [processingCounter, setProcessingCounter] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadMessages()
        loadProposal()

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
                
                // If it's not from me, fetch sender name
                if (newMsg.sender_id !== currentUserId) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('name')
                        .eq('id', newMsg.sender_id)
                        .single()
                    
                    if (userData) {
                        newMsg.users = { name: userData.name }
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
                    .select('*, users:sender_id(name)')
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
            .select('*, users:sender_id(name)')
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

            // Optional: Insert a system message in chat
            await supabase.from('proposal_messages').insert({
                proposal_id: proposalId,
                sender_id: currentUserId,
                content: `🤝 NEGÓCIO FECHADO! Valor acordado: R$ ${finalAmount.toFixed(2)}`
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
            formData.append('content', '📎 Enviou um anexo')

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

    return (
        <div className="flex flex-col h-[450px] bg-[#0F1115]/50 rounded-xl border border-gray-800/80 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-[#1A1D23] border-b border-gray-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Chat da Negociação
                        {(proposalData?.amount || initialAmount > 0) && (
                            <span className="text-[11px] font-black text-[#FFAE00] bg-[#FFAE00]/10 px-2 py-0.5 rounded-md border border-[#FFAE00]/20 ml-1">
                                R$ {(proposalData?.amount || initialAmount).toFixed(2)}
                            </span>
                        )}
                    </span>
                    <div className="flex items-center gap-1.5 border-l border-gray-800 ml-2 pl-3">
                        <button 
                            onClick={async () => {
                                setSyncing(true)
                                await loadMessages()
                                await loadProposal()
                                setSyncing(false)
                            }}
                            disabled={syncing || loading}
                            className="p-1.5 text-gray-500 hover:text-[#FFAE00] hover:bg-[#FFAE00]/5 rounded-md transition-all active:rotate-180 duration-500 disabled:opacity-50"
                            title="Sincronizar mensagens"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                        </button>

                        {isOwner && (
                            <button 
                                onClick={() => setShowQuickDeal(!showQuickDeal)}
                                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded transition-all ${
                                    showQuickDeal 
                                    ? 'bg-[#FFAE00] text-black shadow-[0_0_10px_rgba(255,174,0,0.3)]' 
                                    : 'text-gray-400 hover:text-[#FFAE00] hover:bg-[#FFAE00]/5'
                                }`}
                                title="Fechar negócio agora"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                FECHAR NEGÓCIO
                            </button>
                        )}
                    </div>
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Ao Vivo</span>
            </div>

            {/* Producer Counter-Proposal Action Banner */}
            {!isOwner && proposalData?.status === 'contraproposta' && proposalData.counter_amount && (
                <div className="bg-[#FFAE00]/15 border-b border-[#FFAE00]/30 p-3 sm:p-4 animate-in slide-in-from-top duration-300">
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
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3 flex items-center justify-between">
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
                <div className="bg-[#FFAE00]/10 border-b border-[#FFAE00]/20 p-3 animate-in slide-in-from-top duration-300">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black text-[#FFAE00] uppercase tracking-widest">Ajuste de Valor Final</h4>
                            <span className="text-[10px] text-gray-500">Acordado no chat</span>
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


            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                {loading ? (
                    <div className="flex justify-center items-center h-full text-gray-500 text-sm">
                        <span className="animate-pulse">Carregando mensagens...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3 opacity-80">
                        <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center">
                            <Send className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-center">Nenhuma mensagem ainda.<br/>Inicie a negociação!</p>
                    </div>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.sender_id === currentUserId
                        return (
                            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${isMe
                                        ? 'bg-[#FFAE00]/10 border border-[#FFAE00]/20 text-gray-100 rounded-br-sm'
                                        : 'bg-[#1A1D23] border border-gray-800 text-gray-200 rounded-bl-sm'
                                    }`}>
                                    {!isMe && (
                                        <p className="text-[10px] font-bold text-[#FFAE00] mb-1 uppercase tracking-tighter">
                                            {msg.users?.name || 'Sistema'}
                                        </p>
                                    )}
                                    {isMe && (
                                        <p className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tighter text-right">
                                            Você
                                        </p>
                                    )}
                                    {msg.attachment_url && (() => {
                                        const url = msg.attachment_url
                                        const ext = url.split('.').pop()?.toLowerCase() || ''
                                        const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)
                                        const rawFileName = decodeURIComponent(url.split('/').pop() || 'arquivo')
                                        const fileName = rawFileName.replace(/^\d+-[a-z0-9]+_/i, '')

                                        if (isImage) {
                                            return (
                                                <div className="mb-2 overflow-hidden rounded-lg">
                                                    <a href={url} target="_blank" rel="noopener noreferrer">
                                                        <img
                                                            src={url}
                                                            alt="Anexo"
                                                            className="max-w-full h-auto object-cover rounded-lg border border-white/10 hover:scale-105 transition-transform duration-300"
                                                            style={{ maxHeight: '200px' }}
                                                        />
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
                                                    className="inline-flex items-center gap-2.5 bg-[#0F1115] hover:bg-[#FFAE00]/10 border border-[#FFAE00]/30 hover:border-[#FFAE00] text-gray-200 px-3.5 py-2.5 rounded-xl transition-all text-xs font-semibold group shadow"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-[#FFAE00]/10 text-[#FFAE00] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className="truncate max-w-[200px] text-white group-hover:text-[#FFAE00] transition-colors">{fileName}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Baixar Arquivo (.{(ext).toUpperCase()})</span>
                                                    </div>
                                                    <Download className="w-4 h-4 text-gray-400 group-hover:text-[#FFAE00] ml-1 shrink-0" />
                                                </a>
                                            </div>
                                        )
                                    })()}
                                    {(() => {
                                        const cleanContent = msg.content
                                            ? msg.content.replace(/^\[SOLICITAÇÃO DE AJUSTE NA MÁQUINA\]\s*/i, '').replace(/^\[AJUSTE NA MÁQUINA\]\s*/i, '')
                                            : ''
                                        return cleanContent ? (
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{cleanContent}</p>
                                        ) : null
                                    })()}
                                    <span className="text-[10px] opacity-40 mt-1 block text-right font-medium">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#1A1D23] border-t border-gray-800/80 flex gap-2 items-center w-full">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 p-2.5 text-gray-400 hover:text-[#FFAE00] hover:bg-[#FFAE00]/10 rounded-full transition-all focus:outline-none"
                    title="Anexar Imagem ou Matriz de Bordado"
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
                        placeholder="Digite sua mensagem ou anexe arquivos..."
                        className="w-full bg-[#0F1115] border border-gray-700/50 rounded-full px-5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00]/50 transition-colors shadow-inner"
                    />
                </div>

                <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="flex-shrink-0 p-3 bg-[#FFAE00] text-[#0F1115] rounded-full hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md focus:outline-none"
                >
                    <Send className="w-4 h-4 ml-[2px]" />
                </button>
            </form>
        </div>
    )
}
