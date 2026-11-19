'use client'

import { formatDate } from '@/lib/helpers'
import Link from 'next/link'
import { setCached } from '@/lib/clientCache'
import Image from 'next/image'
import { Clock, ArrowRight, User, Calendar, Layers, Zap, Image as ImageIcon, Target, Handshake, Sparkles, Send, CheckCircle, Wrench, Package, Maximize2, Trash2 } from 'lucide-react'

interface Job {
    id: string
    title: string
    status: string
    created_at: string
    deadline?: string
    description?: string
    dimensions?: string
    order_type?: string
    items_count?: number
    image_urls?: string[]
    fabric_type?: string
    urgency?: string
    formats?: string[]
    revision_notes?: string
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
    isOwner?: boolean
}

export default function JobCard({ job, hasNegotiation, viewerRole, proposalCount, feedBadge, userLostBid, matchedProducerName, onDelete }: { job: Job, hasNegotiation?: boolean, viewerRole?: 'client' | 'programmer', proposalCount?: number, feedBadge?: 'accepting' | 'matched', userLostBid?: boolean, matchedProducerName?: string | null, onDelete?: (jobId: string, jobTitle: string) => void }) {
    const isRevision = Boolean(job.revision_notes)
    const isDeletable = (job.isOwner || viewerRole === 'client') && 
        (job.status === 'cancelado' || job.status === 'aberto' || job.status === 'aguardando_pagamento')

    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        aberto: { bg: 'bg-[#2563EB]/10 border border-[#2563EB]/25', text: 'text-[#2563EB] dark:text-[#60A5FA]', label: 'Aberto' },
        em_progresso: { bg: 'bg-[#2563EB]/10 border border-[#2563EB]/25', text: 'text-[#2563EB] dark:text-[#60A5FA]', label: 'Em Produção' },
        em_revisao: { bg: 'bg-[#DC2626]/10 border border-[#DC2626]/30', text: 'text-[#DC2626] dark:text-[#F87171] font-semibold', label: 'Revisão Solicitada' },
        entregue: { 
            bg: isRevision ? 'bg-[#0D9488]/15 border border-[#0D9488]/30' : 'bg-[#0D9488]/10 border border-[#0D9488]/25', 
            text: isRevision ? 'text-[#0F766E] dark:text-[#14B8A6] font-semibold' : 'text-[#0F766E] dark:text-[#14B8A6]', 
            label: isRevision ? 'Matriz Revisada Entregue' : 'Matriz Entregue' 
        },
        finalizado: { bg: 'bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)]', text: 'text-[var(--text-secondary)]', label: 'Concluído & Pago' },
        concluido: { bg: 'bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)]', text: 'text-[var(--text-secondary)]', label: 'Concluído & Pago' },
        cancelado: { bg: 'bg-[#DC2626]/10 border border-[#DC2626]/20', text: 'text-[#DC2626] dark:text-[#F87171]', label: 'Cancelado' },
        negociacao: { bg: 'bg-[#2563EB]/10 border border-[#2563EB]/25', text: 'text-[#2563EB] dark:text-[#60A5FA]', label: 'Em Negociação' },
        // Nossos status de propostas
        pendente: { bg: 'bg-[var(--bg-surface-elevated)] border border-[var(--border-glass)]', text: 'text-[var(--text-primary)]', label: 'Proposta Enviada' },
        contraproposta: { bg: 'bg-[#DC2626]/10 border border-[#DC2626]/30', text: 'text-[#DC2626] dark:text-[#F87171] font-semibold', label: 'Requer Ação: Contraproposta' },
        aceita: { bg: 'bg-[#0D9488]/10 border border-[#0D9488]/25', text: 'text-[#0F766E] dark:text-[#14B8A6]', label: 'Aceito - Em Produção' },
        recusada: { bg: 'bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)]', text: 'text-[var(--text-secondary)]', label: 'Proposta Recusada' },
        
        // Status do Cliente
        aguardando_propostas: { bg: 'bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)]', text: 'text-[var(--text-secondary)]', label: 'Aguardando Propostas' },
        com_propostas: { bg: 'bg-[#2563EB] border border-[#2563EB]', text: 'text-white font-semibold', label: 'VEJA AS PROPOSTAS' },
        acao_necessaria: { bg: 'bg-[#DC2626]/10 border border-[#DC2626]/30', text: 'text-[#DC2626] dark:text-[#F87171] font-semibold', label: 'Sua Vez: Responda no Chat' }
    }

    // Se a proposta foi aceita, o status real a exibir é o ciclo do trabalho (em_progresso, em_revisao, entregue, finalizado, concluido)
    const activeStatusKey = (job.my_proposal_status === 'aceita') 
        ? (job.status || 'em_progresso')
        : (job.my_proposal_status || job.status || 'aberto')

    const config = statusConfig[activeStatusKey] || statusConfig.aberto

    // Handle potential array return from join (though single select should trigger object)
    const client = Array.isArray(job.users) ? job.users[0] : job.users
    const mainImage = job.image_urls && job.image_urls.length > 0 ? job.image_urls[0] : null
    const isUrgent = job.urgency === 'alta' || job.urgency === 'urgente'

    // ===== SHOWCASE CARD for matched jobs (no details, just vitrine) =====
    if (feedBadge === 'matched') {
        const isWinningProducer = job.my_proposal_status === 'aceita'
        const isPaid = job.status === 'em_progresso' || job.status === 'entregue' || job.status === 'em_revisao' || job.status === 'finalizado' || job.status === 'concluido'

        return (
            <div className="block group">
                <div className="bg-[var(--bg-surface)] border border-[#0D9488]/30 dark:border-[#14B8A6]/30 rounded-2xl overflow-hidden transition-colors md:flex">
                    {/* Image Section */}
                    <div className="w-full md:w-72 h-56 md:h-auto bg-[var(--bg-surface-elevated)] relative flex-shrink-0 border-b md:border-b-0 md:border-r border-[var(--border-hairline)]">
                        {mainImage ? (
                            <Image
                                src={mainImage}
                                alt={job.title}
                                fill
                                unoptimized={mainImage.toLowerCase().endsWith('.svg')}
                                sizes="(max-width: 768px) 100vw, 288px"
                                className="object-contain p-3"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
                                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                <span className="text-xs uppercase tracking-widest opacity-60">Sem Imagem</span>
                            </div>
                        )}
                    </div>

                    {/* Showcase Content */}
                    <div className="flex-1 p-6 lg:p-8 flex flex-col items-center justify-center text-center min-h-[200px] relative">
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 mb-4">
                                <Handshake className="w-5 h-5 text-[#0F766E] dark:text-[#14B8A6]" />
                                <span className="text-[11px] font-semibold text-[#0F766E] dark:text-[#14B8A6] uppercase tracking-wider bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/25">
                                    {isPaid ? 'Negócio Fechado • Em Produção' : 'Negócio Fechado • Aguardando Pagamento'}
                                </span>
                            </div>
                            <h3 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] mb-3 tracking-tight">{job.title}</h3>
                            <p className="text-[var(--text-secondary)] text-sm">
                                {isPaid ? (
                                    <>A matriz está sendo produzida por <strong className="text-[#2563EB] dark:text-[#60A5FA] font-semibold">{matchedProducerName || 'um profissional'}</strong></>
                                ) : (
                                    <>Proposta aceita! Aguardando o cliente concluir o pagamento.</>
                                )}
                            </p>

                            {/* Winning Producer Special Action */}
                            {isWinningProducer ? (
                                <div className="mt-5">
                                    {isPaid ? (
                                        <Link
                                            href={`/jobs/${job.id}`}
                                            className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-lg transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Você foi o escolhido! Entregar Matriz
                                        </Link>
                                    ) : (
                                        <div className="bg-[#2563EB]/10 border border-[#2563EB]/25 rounded-lg px-4 py-2.5 text-xs text-[#2563EB] dark:text-[#60A5FA] font-semibold inline-flex items-center gap-2">
                                            <Clock className="w-4 h-4 shrink-0" />
                                            Sua proposta foi aceita! Aguarde a liberação do pagamento para iniciar.
                                        </div>
                                    )}
                                </div>
                            ) : userLostBid ? (
                                <div className="mt-5 bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg px-4 py-2.5 inline-block">
                                    <p className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/> Dessa vez não foi, mas não desista!</p>
                                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Novos pedidos chegam a todo momento.</p>
                                </div>
                            ) : null}
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
            onMouseEnter={() => {
                try { setCached(`job_detail_${job.id}`, { job }, 120000) } catch {}
            }}
            onTouchStart={() => {
                try { setCached(`job_detail_${job.id}`, { job }, 120000) } catch {}
            }}
            onClick={() => {
                try { setCached(`job_detail_${job.id}`, { job }, 120000) } catch {}
            }}
        >
            <div className={`bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[#2563EB]/40 rounded-2xl overflow-hidden transition-all duration-200 md:flex interactive-card ${hasNegotiation ? 'ring-2 ring-[#DC2626] dark:ring-[#EF4444] ring-offset-2 ring-offset-[var(--bg-primary)]' : ''}`}>

                {/* Image Section (Left) */}
                <div className="w-full md:w-64 h-48 md:h-auto bg-[var(--bg-surface-elevated)] relative flex-shrink-0 border-b md:border-b-0 md:border-r border-[var(--border-hairline)]">
                    {mainImage ? (
                        <Image
                            src={mainImage}
                            alt={job.title}
                            fill
                            unoptimized={mainImage.toLowerCase().endsWith('.svg')}
                            sizes="(max-width: 768px) 100vw, 256px"
                            className="object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-secondary)] min-h-[180px]">
                            <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
                            <span className="text-[10px] uppercase tracking-[0.15em] opacity-60 font-semibold">Sem Imagem</span>
                        </div>
                    )}
                    {/* Status Overlay (Mobile Only) */}
                    <div className="absolute top-3 right-3 md:hidden flex items-center gap-1.5 z-10">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md ${config.bg} ${config.text}`}>
                            {config.label}
                        </span>
                        {onDelete && isDeletable && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onDelete(job.id, job.title)
                                }}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#DC2626]/15 hover:bg-[#DC2626]/25 text-[#DC2626] dark:text-[#EF4444] border border-[#DC2626]/30 backdrop-blur-md transition-colors cursor-pointer"
                                title="Excluir este pedido"
                                aria-label="Excluir este pedido"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Details Section (Right) */}
                <div className="flex-1 p-5 lg:p-6 flex flex-col">

                    {/* Top Row: Title & Status */}
                    <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors leading-snug">
                                {job.title}
                            </h3>
                            {/* Direct Request Badge */}
                            {job.target_programmer_id && (
                                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 border border-[#2563EB]/20 px-2.5 py-0.5 rounded-full mt-1.5 mr-2">
                                    <Target className="w-3 h-3" />
                                    Solicitação direta para: <span className="text-[var(--text-primary)] font-semibold">{job.target_programmer?.name || 'Programador'}</span>
                                </div>
                            )}
                            {/* Kit Badge */}
                            {(job.order_type === 'kit' || (job.items_count && job.items_count > 1) || job.title?.startsWith('[Kit')) && (
                                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0F766E] dark:text-[#14B8A6] bg-[#0D9488]/10 border border-[#0D9488]/25 px-2.5 py-0.5 rounded-full mt-1.5">
                                    <Package className="w-3 h-3" />
                                    Kit com {job.items_count || (job.title?.match(/\[Kit\s*(\d+)/i)?.[1] ? Number(job.title.match(/\[Kit\s*(\d+)/i)?.[1]) : 2)} Matrizes
                                </div>
                            )}
                            {/* Client Info */}
                            {viewerRole !== 'client' && client && (
                                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-2">
                                    <div className="w-5 h-5 rounded-full bg-[var(--bg-surface-elevated)] overflow-hidden flex items-center justify-center border border-[var(--border-hairline)]">
                                        {client.avatar_url ? (
                                            <img src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-3 h-3 text-[var(--text-secondary)]" />
                                        )}
                                    </div>
                                    <span className="truncate max-w-[140px] text-[var(--text-secondary)]">{client.name}</span>
                                    <span className="opacity-40">•</span>
                                    <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(job.created_at)}
                                    </span>
                                </div>
                            )}
                            
                            {viewerRole === 'client' && job.target_programmer && (
                                <div className="flex items-center gap-2 text-xs text-[#2563EB] dark:text-[#60A5FA] mt-2">
                                    <div className="w-5 h-5 rounded-full bg-[#2563EB]/10 overflow-hidden flex items-center justify-center border border-[#2563EB]/25">
                                        {job.target_programmer.avatar_url ? (
                                            <img src={job.target_programmer.avatar_url} alt={job.target_programmer.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" />
                                        )}
                                    </div>
                                    <span className="truncate max-w-[140px] font-medium">Programador: {job.target_programmer.name}</span>
                                </div>
                            )}

                            {viewerRole === 'client' && !job.target_programmer && (
                                <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] mt-2">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(job.created_at)}
                                </div>
                            )}
                        </div>

                        {/* Status (Desktop) */}
                        <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.text}`}>
                                    {config.label}
                                </span>
                                {onDelete && isDeletable && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            onDelete(job.id, job.title)
                                        }}
                                        className="min-h-[36px] min-w-[44px] px-3 rounded-lg bg-[#DC2626]/10 hover:bg-[#DC2626]/20 text-[#DC2626] dark:text-[#EF4444] border border-[#DC2626]/25 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                                        title="Excluir este pedido definitivamente"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Excluir</span>
                                    </button>
                                )}
                            </div>
                            {isUrgent && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#DC2626] dark:text-[#F87171] bg-[#DC2626]/10 border border-[#DC2626]/20 px-2.5 py-0.5 rounded-full">
                                    <Zap className="w-3 h-3" /> Urgente
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Specs Row — inline chips */}
                    {(() => {
                        const formattedDimensions = (() => {
                            if (!job.dimensions) return null
                            const trimmed = job.dimensions.trim()
                            if (trimmed.startsWith('[')) {
                                try {
                                    const parsed = JSON.parse(trimmed)
                                    if (Array.isArray(parsed) && parsed.length > 0) {
                                        if (parsed.length === 1) {
                                            return parsed[0]?.size || 'Sob medida'
                                        }
                                        const sizes = parsed.map((p: any) => p.size).filter(Boolean).slice(0, 2).join(', ')
                                        return `${parsed.length} Matrizes${sizes ? ` (${sizes}${parsed.length > 2 ? '...' : ''})` : ''}`
                                    }
                                } catch {}
                            }
                            return job.dimensions
                        })()

                        return (
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {job.formats && job.formats.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-full px-2.5 py-1">
                                        <Layers className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" />
                                        <span>{job.formats.join(', ')}</span>
                                    </div>
                                )}
                                {job.fabric_type && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-full px-2.5 py-1">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]/20 border border-[#2563EB]/30"></div>
                                        <span>{job.fabric_type}</span>
                                    </div>
                                )}
                                {formattedDimensions && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-full px-2.5 py-1 max-w-full">
                                        <Maximize2 className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                                        <span className="truncate max-w-[280px]" title={formattedDimensions}>{formattedDimensions}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })()}

                    {/* Description */}
                    {job.description && (
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3 leading-relaxed">
                            &quot;{job.description}&quot;
                        </p>
                    )}

                    {/* Feed Badge: Aceitando Propostas */}
                    {feedBadge === 'accepting' && (
                        <div className="flex items-center gap-3 mb-3 bg-[#0D9488]/[0.07] border border-[#0D9488]/20 rounded-lg px-3 py-2">
                            <div className="w-7 h-7 rounded-full bg-[#0D9488]/15 flex items-center justify-center shrink-0">
                                <Send className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6]">Aceitando Propostas</p>
                                {proposalCount !== undefined && proposalCount > 0 ? (
                                    <p className="text-[11px] text-[var(--text-secondary)]">{proposalCount} proposta{proposalCount > 1 ? 's' : ''} recebida{proposalCount > 1 ? 's' : ''}</p>
                                ) : (
                                    <p className="text-[11px] text-[var(--text-secondary)]">Seja o primeiro a enviar!</p>
                                )}
                            </div>
                            <Sparkles className="w-3.5 h-3.5 text-[#0D9488]/50" />
                        </div>
                    )}

                    {/* Bottom Row */}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                        {hasNegotiation ? (
                            <div className="flex items-center gap-2 text-[#2563EB] dark:text-[#60A5FA] font-semibold text-xs bg-[#2563EB]/10 px-3 py-1.5 rounded-full border border-[#2563EB]/25">
                                <span className="w-1.5 h-1.5 bg-[#2563EB] dark:bg-[#3B82F6] rounded-full"></span>
                                Proposta em Andamento
                            </div>
                        ) : (
                            <span className="text-[var(--text-secondary)] text-[11px] hidden sm:inline-block font-mono opacity-70">
                                #{job.id.slice(0, 8)}
                            </span>
                        )}

                        {/* Smart Button Logic */}
                        {job.isOwner || viewerRole === 'client' ? (
                            job.status === 'entregue' ? (
                                <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                    {isRevision ? 'Avaliar Matriz Revisada' : 'Baixar & Avaliar'}
                                    <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                            ) : job.status === 'em_progresso' ? (
                                <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                    Acompanhar Produção
                                    <Clock className="w-3.5 h-3.5" />
                                </button>
                            ) : job.status === 'finalizado' ? (
                                <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[var(--btn-glass-bg)] hover:border-[var(--border-glass)] text-[var(--text-primary)] border border-[var(--border-hairline)] px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                    Ver Matriz (Concluído)
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            ) : proposalCount && proposalCount > 0 ? (
                                <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                    Ver Propostas ({proposalCount})
                                    <Sparkles className="w-3.5 h-3.5" />
                                </button>
                            ) : job.status === 'cancelado' ? (
                                <div className="flex items-center gap-2 ml-auto">
                                    {onDelete && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                onDelete(job.id, job.title)
                                            }}
                                            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] bg-[#DC2626]/10 hover:bg-[#DC2626]/20 text-[#DC2626] dark:text-[#EF4444] border border-[#DC2626]/25 px-3.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                                            title="Excluir permanentemente do banco de dados"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Excluir Pedido
                                        </button>
                                    )}
                                    <button className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] bg-[var(--btn-glass-bg)] hover:border-[var(--border-glass)] text-[var(--text-primary)] border border-[var(--border-hairline)] px-3.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer">
                                        Ver Detalhes
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[var(--btn-glass-bg)] hover:border-[var(--border-glass)] text-[var(--text-primary)] border border-[var(--border-hairline)] px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                    Meu Pedido
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            )
                        ) : job.my_proposal_status === 'pendente' ? (
                            <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-glass)] text-[var(--text-primary)] border border-[var(--border-hairline)] px-4 rounded-lg font-semibold text-xs ml-auto transition-colors cursor-pointer">
                                Proposta Enviada
                                <Clock className="w-3.5 h-3.5" />
                            </button>
                        ) : job.my_proposal_status === 'contraproposta' ? (
                            <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                Contraproposta Recebida
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        ) : job.my_proposal_status === 'aceita' ? (
                            job.status === 'em_revisao' ? (
                                <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                    Enviar Correção
                                    <Wrench className="w-3.5 h-3.5" />
                                </button>
                            ) : job.status === 'entregue' ? (
                                <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0F766E] dark:text-[#14B8A6] border border-[#0D9488]/25 px-4 rounded-lg font-semibold text-xs ml-auto transition-colors cursor-pointer">
                                    {isRevision ? 'Matriz Revisada Enviada' : 'Aguardando Aprovação'}
                                    <Clock className="w-3.5 h-3.5" />
                                </button>
                            ) : job.status === 'em_progresso' ? (
                                <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                    Entregar Matriz
                                    <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                            ) : (job.status === 'finalizado' || job.status === 'concluido') ? (
                                <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0F766E] dark:text-[#14B8A6] border border-[#0D9488]/25 px-4 rounded-lg font-semibold text-xs ml-auto transition-colors cursor-pointer">
                                    Concluído & Pago
                                    <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-glass)] text-[var(--text-primary)] border border-[var(--border-hairline)] px-4 rounded-lg font-semibold text-xs ml-auto transition-colors cursor-pointer">
                                    Aguardando Pagamento
                                    <Clock className="w-3.5 h-3.5" />
                                </button>
                            )
                        ) : (viewerRole === 'programmer' && job.status === 'em_progresso') ? (
                            <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                Entregar Matriz
                                <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                        ) : (viewerRole === 'programmer' && (job.status === 'finalizado' || job.status === 'concluido')) ? (
                            <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0F766E] dark:text-[#14B8A6] border border-[#0D9488]/25 px-4 rounded-lg font-semibold text-xs ml-auto transition-colors cursor-pointer">
                                Concluído & Pago
                                <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                        ) : job.status === 'em_revisao' && viewerRole === 'programmer' ? (
                            <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                Entregar Revisão
                                <Wrench className="w-3.5 h-3.5" />
                            </button>
                        ) : job.status === 'entregue' && viewerRole === 'programmer' ? (
                            <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0F766E] dark:text-[#14B8A6] border border-[#0D9488]/25 px-4 rounded-lg font-semibold text-xs ml-auto transition-colors cursor-pointer">
                                {isRevision ? 'Matriz Revisada Enviada' : 'Aguardando Aprovação'}
                                <Clock className="w-3.5 h-3.5" />
                            </button>
                        ) : job.status === 'aberto' ? (
                            <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                Enviar Proposta
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] bg-[var(--btn-glass-bg)] hover:border-[var(--border-glass)] text-[var(--text-primary)] border border-[var(--border-hairline)] px-4 rounded-lg font-semibold text-xs transition-colors ml-auto cursor-pointer">
                                Ver Detalhes
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </Link>
    )
}
