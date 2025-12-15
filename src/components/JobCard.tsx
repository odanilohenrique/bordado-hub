'use client'

import { formatDate } from '@/lib/helpers'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, ArrowRight, User, Calendar, Layers, Zap, Image as ImageIcon } from 'lucide-react'

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
    users?: {
        name: string
        avatar_url: string | null
    }
}

export default function JobCard({ job, hasNegotiation }: { job: Job, hasNegotiation?: boolean }) {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        aberto: { bg: 'bg-[#FFAE00]/10', text: 'text-[#FFAE00]', label: 'Aberto' },
        em_progresso: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Em Progresso' },
        entregue: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Entregue' },
        finalizado: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Finalizado' },
        cancelado: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelado' },
        negociacao: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Em Negociação' }
    }

    const config = statusConfig[job.status] || statusConfig.aberto

    // Handle potential array return from join (though single select should trigger object)
    const client = Array.isArray(job.users) ? job.users[0] : job.users
    const mainImage = job.image_urls && job.image_urls.length > 0 ? job.image_urls[0] : null
    const isUrgent = job.urgency === 'alta' || job.urgency === 'urgente'

    return (
        <Link
            href={`/jobs/${job.id}`}
            className="block group"
        >
            <div className={`bg-[#1A1D23] border border-[#FFAE00]/20 rounded-xl overflow-hidden hover:border-[#FFAE00] hover:shadow-[0_0_20px_rgba(255,174,0,0.15)] transition-all duration-300 md:flex ${hasNegotiation ? 'ring-2 ring-[#FFAE00] ring-offset-2 ring-offset-[#0F1115]' : ''}`}>

                {/* Image Section (Left) */}
                <div className="w-full md:w-72 h-48 md:h-auto bg-[#0F1115] relative flex-shrink-0 border-b md:border-b-0 md:border-r border-[#FFAE00]/10 group-hover:opacity-90 transition-opacity">
                    {mainImage ? (
                        <Image
                            src={mainImage}
                            alt={job.title}
                            fill
                            className="object-contain p-2"
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
                            <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                            <span className="text-xs uppercase tracking-widest opacity-50">Sem Imagem</span>
                        </div>
                    )}
                    {/* Status Overlay (Mobile Only) */}
                    <div className="absolute top-3 right-3 md:hidden">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide backdrop-blur-md border border-white/10 ${config.bg} ${config.text}`}>
                            {config.label}
                        </span>
                    </div>
                </div>

                {/* Details Section (Right) */}
                <div className="flex-1 p-5 lg:p-6 flex flex-col min-h-[220px]">

                    {/* Top Row: Title & Desktop Status */}
                    <div className="flex justify-between items-start mb-2 gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#F3F4F6] group-hover:text-[#FFAE00] transition-colors leading-tight mb-1">
                                {job.title}
                            </h3>
                            {/* Client Info Mobile/Desktop */}
                            {client && (
                                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                    <div className="w-5 h-5 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center border border-gray-600">
                                        {client.avatar_url ? (
                                            <img src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-3 h-3 text-gray-400" />
                                        )}
                                    </div>
                                    <span className="truncate max-w-[150px]">{client.name}</span>
                                    <span className="text-gray-600">•</span>
                                    <span className="flex items-center gap-1 text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(job.created_at)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Status (Desktop) */}
                        <div className="hidden md:flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${config.bg} ${config.text} border border-current/20`}>
                                {config.label}
                            </span>
                            {isUrgent && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-wider animate-pulse">
                                    <Zap className="w-3 h-3" /> Urgente
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="h-px w-full bg-gray-800/50 my-3"></div>

                    {/* Middle: Specs */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4 text-sm">
                        {/* Format */}
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Formatos</span>
                            <div className="flex items-center gap-2 text-gray-300">
                                <Layers className="w-4 h-4 text-[#FFAE00]/60" />
                                {job.formats && job.formats.length > 0
                                    ? <span className="font-medium">{job.formats.join(', ')}</span>
                                    : <span className="text-gray-600 italic">Não especificado</span>
                                }
                            </div>
                        </div>

                        {/* Fabric */}
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tecido</span>
                            <div className="flex items-center gap-2 text-gray-300">
                                <div className="w-4 h-4 rounded-sm border border-[#FFAE00]/60 bg-[#FFAE00]/10"></div>
                                {job.fabric_type
                                    ? <span className="font-medium">{job.fabric_type}</span>
                                    : <span className="text-gray-600 italic">Qualquer</span>
                                }
                            </div>
                        </div>
                    </div>

                    {/* Description (Truncated) */}
                    {job.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 bg-[#0F1115]/50 p-2 rounded border border-white/5 italic">
                            &quot;{job.description}&quot;
                        </p>
                    )}

                    {/* Bottom Row: Actions */}
                    <div className="mt-auto flex items-center justify-between pt-3 md:pt-0">
                        {hasNegotiation ? (
                            <div className="flex items-center gap-2 text-[#FFAE00] font-bold text-sm bg-[#FFAE00]/10 px-3 py-1.5 rounded-lg border border-[#FFAE00]/20 animate-pulse">
                                <span className="w-2 h-2 bg-[#FFAE00] rounded-full shadow-[0_0_10px_#FFAE00]"></span>
                                Proposta em Andamento
                            </div>
                        ) : (
                            <span className="text-gray-600 text-xs hidden sm:inline-block">
                                ID: {job.id.slice(0, 8)}...
                            </span>
                        )}

                        <button className="flex items-center gap-2 bg-[#FFAE00] hover:bg-[#FFB92E] text-[#0F1115] px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-[#FFAE00]/10 transform active:scale-95 ml-auto">
                            Ver Detalhes
                            <ArrowRight className="w-4 h-4.5" />
                        </button>
                    </div>

                </div>
            </div>
        </Link>
    )
}
