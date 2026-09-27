'use client'

import { formatDate } from '@/lib/helpers'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, ArrowRight, User, Calendar, Layers, Zap, Image as ImageIcon, Target, Handshake, Sparkles, Send, CheckCircle } from 'lucide-react'

interface Job {
    id: string
    title: string
    status: string
    created_at: string
    deadline?: string
    description?: string
    image_urls?: string[]
    fabric_type?: string
    urgency?: string
    formats?: string[]
    target_programmer_id?: string | null
    target_programmer?: {
        name: string
        avatar_url?: string | null
    } | null
    users?: {
        name: string
        avatar_url: string | null
    }
    my_proposal_status?: string
}

export default function JobCard({ job, hasNegotiation, viewerRole, proposalCount, feedBadge, userLostBid, matchedProducerName }: { job: Job, hasNegotiation?: boolean, viewerRole?: 'client' | 'programmer', proposalCount?: number, feedBadge?: 'accepting' | 'matched', userLostBid?: boolean, matchedProducerName?: string | null }) {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        aberto: { bg: 'bg-[#FFAE00]/10', text: 'text-[#FFAE00]', label: 'Aberto' },
        em_progresso: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Em Progresso' },
        entregue: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Entregue' },
        finalizado: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Finalizado' },
        cancelado: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelado' },
        negociacao: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Em Negociação' },
        // Nossos novos status para os programadores e clientes (referentes à Proposals)
        pendente: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Proposta Enviada' },
        contraproposta: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Requer Ação: Contraproposta!' },
        aceita: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Aceito - Em Produção' },
        recusada: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: 'Proposta Recusada' },
        
        // Status do Cliente
        aguardando_propostas: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Aguardando Programadores' },
        com_propostas: { bg: 'bg-[#FFAE00] shadow-[0_0_20px_rgba(255,174,0,0.8)] border border-white animate-pulse', text: 'text-black font-black', label: '🎯 VEJA AS PROPOSTAS!' },
        acao_necessaria: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Sua Vez: Responda no Chat!' }
    }

    const config = statusConfig[job.my_proposal_status || job.status] || statusConfig.aberto

    // Handle potential array return from join (though single select should trigger object)
    const client = Array.isArray(job.users) ? job.users[0] : job.users
    const mainImage = job.image_urls && job.image_urls.length > 0 ? job.image_urls[0] : null
    const isUrgent = job.urgency === 'alta' || job.urgency === 'urgente'

    // ===== SHOWCASE CARD for matched jobs (no details, just vitrine) =====
    if (feedBadge === 'matched') {
        return (
            <div className="block group">
                <div className="bg-[#1A1D23] border border-[#FFAE00]/30 rounded-xl overflow-hidden transition-all duration-300 md:flex shadow-[0_0_30px_rgba(255,174,0,0.08)] hover:shadow-[0_0_40px_rgba(255,174,0,0.15)]">
                    {/* Image Section */}
                    <div className="w-full md:w-72 h-56 md:h-auto bg-[#0F1115] relative flex-shrink-0 border-b md:border-b-0 md:border-r border-[#FFAE00]/20">
                        {mainImage ? (
                            <Image
                                src={mainImage}
                                alt={job.title}
                                fill
                                className="object-contain p-3"
                                unoptimized
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
                                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                <span className="text-xs uppercase tracking-widest opacity-50">Sem Imagem</span>
                            </div>
                        )}
                    </div>

                    {/* Showcase Content */}
                    <div className="flex-1 p-6 lg:p-8 flex flex-col items-center justify-center text-center min-h-[200px] relative">
                        {/* Subtle glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#FFAE00]/5 rounded-full blur-3xl"></div>
                        
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 mb-4">
                                <Handshake className="w-6 h-6 text-[#FFAE00]" />
                                <span className="text-[10px] font-black text-[#FFAE00] uppercase tracking-[0.2em] bg-[#FFAE00]/10 px-3 py-1 rounded-full border border-[#FFAE00]/20">Negócio Fechado</span>
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">{job.title}</h3>
                            <p className="text-gray-400 text-sm">
                                A matriz está sendo produzida por <strong className="text-[#FFAE00] text-base">{matchedProducerName || 'um profissional'}</strong>
                            </p>

                            {userLostBid && (
                                <div className="mt-5 bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-2.5 inline-block">
                                    <p className="text-xs font-bold text-blue-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/> Dessa vez não foi, mas não desista!</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Novos pedidos chegam a todo momento.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    // ===== END SHOWCASE CARD =====

    return (
        <Link
            href={`/jobs/${job.id}`}
            className="block group"
        >
            <div className={`bg-[#1A1D23] border ${viewerRole === 'client' ? 'border-indigo-500/20 hover:border-indigo-500/50 hover:shadow-[0_0_25px_rgba(99,102,241,0.12)]' : 'border-[#2A2D35] hover:border-[#FFAE00]/40 hover:shadow-[0_0_25px_rgba(255,174,0,0.08)]'} rounded-xl overflow-hidden transition-all duration-300 md:flex ${hasNegotiation ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#0F1115]' : ''}`}>

                {/* Image Section (Left) */}
                <div className="w-full md:w-64 h-48 md:h-auto bg-[#0F1115] relative flex-shrink-0 border-b md:border-b-0 md:border-r border-white/5">
                    {mainImage ? (
                        <Image
                            src={mainImage}
                            alt={job.title}
                            fill
                            className="object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-700/60 min-h-[180px]">
                            <ImageIcon className="w-10 h-10 mb-2" />
                            <span className="text-[10px] uppercase tracking-[0.15em]">Sem Imagem</span>
                        </div>
                    )}
                    {/* Status Overlay (Mobile Only) */}
                    <div className="absolute top-3 right-3 md:hidden">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${config.bg} ${config.text}`}>
                            {config.label}
                        </span>
                    </div>
                </div>

                {/* Details Section (Right) */}
                <div className="flex-1 p-5 lg:p-6 flex flex-col">

                    {/* Top Row: Title & Status */}
                    <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white group-hover:text-[#FFAE00] transition-colors leading-snug">
                                {job.title}
                            </h3>
                            {/* Direct Request Badge */}
                            {job.target_programmer_id && (
                                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full mt-1.5">
                                    <Target className="w-3 h-3" />
                                    Solicitação direta para: <span className="text-white font-bold">{job.target_programmer?.name || 'Programador'}</span>
                                </div>
                            )}
                            {/* Client Info */}
                            {viewerRole !== 'client' && client && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                    <div className="w-5 h-5 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center border border-gray-700">
                                        {client.avatar_url ? (
                                            <img src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-3 h-3 text-gray-500" />
                                        )}
                                    </div>
                                    <span className="truncate max-w-[140px] text-gray-400">{client.name}</span>
                                    <span className="text-gray-700">•</span>
                                    <span className="flex items-center gap-1 text-gray-600">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(job.created_at)}
                                    </span>
                                </div>
                            )}
                            
                            {viewerRole === 'client' && job.target_programmer && (
                                <div className="flex items-center gap-2 text-xs text-indigo-400 mt-2">
                                    <div className="w-5 h-5 rounded-full bg-indigo-900/50 overflow-hidden flex items-center justify-center border border-indigo-700/50">
                                        {job.target_programmer.avatar_url ? (
                                            <img src={job.target_programmer.avatar_url} alt={job.target_programmer.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-3 h-3 text-indigo-400" />
                                        )}
                                    </div>
                                    <span className="truncate max-w-[140px]">Programador: {job.target_programmer.name}</span>
                                </div>
                            )}

                            {viewerRole === 'client' && !job.target_programmer && (
                                <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(job.created_at)}
                                </div>
                            )}
                        </div>

                        {/* Status (Desktop) */}
                        <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
                                {config.label}
                            </span>
                            {isUrgent && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse">
                                    <Zap className="w-3 h-3" /> Urgente
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Specs Row — inline chips */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {job.formats && job.formats.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-white/[0.03] border border-white/5 rounded-full px-2.5 py-1">
                                <Layers className="w-3 h-3 text-[#FFAE00]/50" />
                                <span>{job.formats.join(', ')}</span>
                            </div>
                        )}
                        {job.fabric_type && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-white/[0.03] border border-white/5 rounded-full px-2.5 py-1">
                                <div className="w-2.5 h-2.5 rounded-sm bg-[#FFAE00]/20 border border-[#FFAE00]/30"></div>
                                <span>{job.fabric_type}</span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {job.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                            &quot;{job.description}&quot;
                        </p>
                    )}

                    {/* Feed Badge: Aceitando Propostas */}
                    {feedBadge === 'accepting' && (
                        <div className="flex items-center gap-3 mb-3 bg-gradient-to-r from-green-500/[0.07] to-transparent border border-green-500/15 rounded-lg px-3 py-2">
                            <div className="w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                                <Send className="w-3.5 h-3.5 text-green-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-green-400">Aceitando Propostas</p>
                                {proposalCount !== undefined && proposalCount > 0 ? (
                                    <p className="text-[10px] text-gray-500">{proposalCount} proposta{proposalCount > 1 ? 's' : ''} recebida{proposalCount > 1 ? 's' : ''}</p>
                                ) : (
                                    <p className="text-[10px] text-gray-500">Seja o primeiro a enviar!</p>
                                )}
                            </div>
                            <Sparkles className="w-3.5 h-3.5 text-green-500/30" />
                        </div>
                    )}

                    {/* Bottom Row */}
                    <div className="mt-auto flex items-center justify-between pt-2">
                        {hasNegotiation ? (
                            <div className="flex items-center gap-2 text-[#FFAE00] font-bold text-xs bg-[#FFAE00]/10 px-3 py-1.5 rounded-full border border-[#FFAE00]/20 animate-pulse">
                                <span className="w-1.5 h-1.5 bg-[#FFAE00] rounded-full shadow-[0_0_8px_#FFAE00]"></span>
                                Proposta em Andamento
                            </div>
                        ) : (
                            <span className="text-gray-700 text-[10px] hidden sm:inline-block font-mono">
                                #{job.id.slice(0, 8)}
                            </span>
                        )}

                        {viewerRole === 'client' ? (
                            job.status === 'entregue' ? (
                                <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg shadow-green-500/20 active:scale-95 ml-auto animate-pulse">
                                    Baixar & Avaliar 🚀
                                    <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                            ) : job.status === 'em_progresso' ? (
                                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-95 ml-auto">
                                    Acompanhar Produção
                                    <Clock className="w-3.5 h-3.5" />
                                </button>
                            ) : job.status === 'finalizado' ? (
                                <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10 px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 ml-auto">
                                    Ver Matriz (Concluído)
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            ) : proposalCount && proposalCount > 0 ? (
                                <button className="flex items-center gap-2 bg-[#FFAE00] hover:bg-[#FFB92E] text-[#0F1115] px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg shadow-[#FFAE00]/20 active:scale-95 ml-auto">
                                    Ver Propostas ({proposalCount})
                                    <Sparkles className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-95 ml-auto">
                                    Acompanhar Pedido
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            )
                        ) : viewerRole === 'programmer' ? (
                            job.my_proposal_status === 'aceita' || job.status === 'em_progresso' ? (
                                <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg shadow-green-500/10 active:scale-95 ml-auto">
                                    Entregar Matriz
                                    <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                            ) : job.status === 'entregue' ? (
                                <button className="flex items-center gap-2 bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg font-bold text-xs ml-auto">
                                    Matriz Entregue
                                    <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                            ) : job.status === 'finalizado' ? (
                                <button className="flex items-center gap-2 bg-gray-800 text-gray-400 border border-white/10 px-4 py-2 rounded-lg font-bold text-xs ml-auto">
                                    Finalizado
                                </button>
                            ) : (
                                <button className="flex items-center gap-2 bg-[#FFAE00] hover:bg-[#FFB92E] text-[#0F1115] px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg shadow-[#FFAE00]/10 active:scale-95 ml-auto">
                                    Enviar Proposta
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            )
                        ) : (
                            <button className="flex items-center gap-2 bg-[#FFAE00] hover:bg-[#FFB92E] text-[#0F1115] px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg shadow-[#FFAE00]/10 active:scale-95 ml-auto">
                                {job.status === 'aberto' ? 'Enviar Proposta' : 'Ver Detalhes'}
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </Link>
    )
}
