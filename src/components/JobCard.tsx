'use client'

import { formatDate } from '@/lib/helpers'
import Link from 'next/link'
import { Clock, ArrowRight } from 'lucide-react'

interface Job {
    id: string
    title: string
    status: string
    created_at: string
    deadline?: string
    description?: string
}

export default function JobCard({ job }: { job: Job }) {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        aberto: { bg: 'bg-[#FFAE00]/20', text: 'text-[#FFAE00]', label: 'Aberto' },
        em_progresso: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Em Progresso' },
        entregue: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Entregue' },
        finalizado: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Finalizado' },
        cancelado: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelado' },
    }

    const config = statusConfig[job.status] || statusConfig.aberto

    return (
        <Link
            href={`/jobs/${job.id}`}
            className="block group"
        >
            <div className="bg-[#1A1D23] border border-[#FFAE00]/20 rounded-xl p-6 hover:border-[#FFAE00]/50 hover:shadow-lg hover:shadow-[#FFAE00]/10 transition-all duration-300 hover:scale-[1.02]">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-[#F3F4F6] group-hover:text-[#FFAE00] transition-colors">
                        {job.title}
                    </h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border border-current/30`}>
                        {config.label}
                    </span>
                </div>

                {/* Description */}
                {job.description && (
                    <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                        {job.description}
                    </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-[#FFAE00]/10">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(job.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[#FFAE00] text-sm font-medium group-hover:gap-3 transition-all">
                        Ver detalhes
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </Link>
    )
}
