'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Send, Paperclip, User, FileImage } from 'lucide-react'
import { formatDate } from '@/lib/helpers'

interface Message {
    id: string
    content: string
    attachment_url?: string
    sender_id: string
    created_at: string
}

interface ChatProps {
    proposalId: string
    currentUserId: string
    senderName: string // To display in header if needed
    isOwner: boolean
}

export default function NegotiationChat({ proposalId, currentUserId, isOwner }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadMessages()

        // Subscribe to new messages
        const channel = supabase
            .channel(`proposal_chat:${proposalId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'proposal_messages',
                filter: `proposal_id=eq.${proposalId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [proposalId])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const loadMessages = async () => {
        const { data } = await supabase
            .from('proposal_messages')
            .select('*')
            .eq('proposal_id', proposalId)
            .order('created_at', { ascending: true })

        if (data) setMessages(data)
        setLoading(false)
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!newMessage.trim()) return

        setSending(true)
        try {
            const { error } = await supabase.from('proposal_messages').insert({
                proposal_id: proposalId,
                sender_id: currentUserId,
                content: newMessage.trim()
            })

            if (error) throw error
            setNewMessage('')
        } catch (error) {
            console.error('Error sending message:', error)
            alert('Erro ao enviar mensagem')
        } finally {
            setSending(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSending(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `chat-attachments/${proposalId}/${fileName}`

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('proposal_attachments') // Need to ensure this bucket exists!
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get URL
            const { data: { publicUrl } } = supabase.storage
                .from('proposal_attachments')
                .getPublicUrl(filePath)

            // Send Message with Attachment
            const { error: msgError } = await supabase.from('proposal_messages').insert({
                proposal_id: proposalId,
                sender_id: currentUserId,
                content: '📎 Enviou um anexo',
                attachment_url: publicUrl
            })

            if (msgError) throw msgError

        } catch (error) {
            console.error('Upload error:', error)
            alert('Erro ao enviar arquivo. Verifique se é uma imagem válida.')
        } finally {
            setSending(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    return (
        <div className="flex flex-col h-[400px] bg-[#0F1115] rounded-lg border border-gray-800">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center text-gray-500 text-sm">Carregando chat...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-600 text-sm py-10">
                        Nenhuma mensagem ainda. Inicie a negociação!
                    </div>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.sender_id === currentUserId
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 ${isMe
                                        ? 'bg-[#FFAE00]/20 border border-[#FFAE00]/30 text-white rounded-br-none'
                                        : 'bg-[#1A1D23] border border-gray-700 text-gray-300 rounded-bl-none'
                                    }`}>
                                    {msg.attachment_url && (
                                        <div className="mb-2">
                                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                                <img
                                                    src={msg.attachment_url}
                                                    alt="Anexo"
                                                    className="max-w-full h-auto rounded border border-gray-600 hover:opacity-90 transition-opacity"
                                                    style={{ maxHeight: '150px' }}
                                                />
                                            </a>
                                        </div>
                                    )}
                                    <p className="text-sm">{msg.content}</p>
                                    <p className="text-[10px] opacity-50 mt-1 text-right block">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#1A1D23] border-t border-gray-800 rounded-b-lg flex gap-2 items-center">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-[#FFAE00] transition-colors"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                />

                <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-[#0F1115] border border-gray-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-[#FFAE00]"
                />

                <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="p-2 bg-[#FFAE00] text-[#0F1115] rounded-full hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    )
}
