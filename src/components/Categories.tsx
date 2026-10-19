'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PenTool, Layers, ShoppingBag, FileCode2, ArrowRight } from 'lucide-react'
import ProgrammerInviteModal from '@/components/ProgrammerInviteModal'

const categories = [
    {
        name: 'Criação de Matrizes',
        description: 'Desenho e programação do zero a partir de fotos, imagens, vetores ou criação de logotipos exclusivos.',
        icon: PenTool,
        tag: 'Sob Encomenda',
        link: '/pedidos',
        cta: 'Pedir Matriz',
        isProgrammerOnly: false
    },
    {
        name: 'Produção de Matrizes',
        description: 'Para programadores profissionais: atenda pedidos sob demanda, pegue encomendas no mural e fature diariamente.',
        icon: Layers,
        tag: 'Para Produtores',
        link: '#',
        cta: 'Ver Demandas',
        isProgrammerOnly: true
    },
    {
        name: 'Marketplace de Matrizes',
        description: 'Compre ou venda pacotes e matrizes prontas com download imediato para usar ou faturar agora mesmo.',
        icon: ShoppingBag,
        tag: 'Pronta Entrega',
        link: '/marketplace',
        cta: 'Ver Matrizes',
        isProgrammerOnly: false
    },
    {
        name: 'Conversão de Formatos',
        description: 'Converta arquivos entre .DST, .PES, .JEF, .EXP e .XXX calibrados com perfeição para sua máquina.',
        icon: FileCode2,
        tag: 'Técnico',
        link: '/pedidos',
        cta: 'Converter Arquivo',
        isProgrammerOnly: false
    },
]

export default function Categories() {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

    return (
        <section className="bg-[#0F1115] py-10 sm:py-14 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FFAE00] bg-[#FFAE00]/10 px-2.5 py-0.5 rounded-full border border-[#FFAE00]/20">
                        Ecossistema Completo
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3 tracking-tight">
                        O que você quer criar, produzir ou negociar hoje?
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-400">
                        O ponto de encontro ideal entre quem precisa de bordados perfeitos e quem produz ou comercializa matrizes.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {categories.map((category) => {
                        const CardContent = (
                            <>
                                <div>
                                    <div className="flex items-center justify-between mb-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-[#FFAE00]/10 text-[#FFAE00] flex items-center justify-center border border-[#FFAE00]/20 group-hover:scale-105 transition-transform">
                                            <category.icon className="w-5 h-5 stroke-[2]" />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full">
                                            {category.tag}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-[#FFAE00] transition-colors mb-2">
                                        {category.name}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                        {category.description}
                                    </p>
                                </div>

                                <div className="pt-4 mt-4 border-t border-white/5 flex items-center text-xs font-bold text-[#FFAE00] gap-1 group-hover:translate-x-1 transition-transform">
                                    <span>{category.cta}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                            </>
                        )

                        if (category.isProgrammerOnly) {
                            return (
                                <button
                                    key={category.name}
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="group text-left bg-[#16191F] hover:bg-[#1C2028] p-5 rounded-xl border border-white/5 hover:border-[#FFAE00]/40 transition-all duration-300 shadow-md flex flex-col justify-between cursor-pointer"
                                >
                                    {CardContent}
                                </button>
                            )
                        }

                        return (
                            <Link
                                key={category.name}
                                href={category.link}
                                className="group bg-[#16191F] hover:bg-[#1C2028] p-5 rounded-xl border border-white/5 hover:border-[#FFAE00]/40 transition-all duration-300 shadow-md flex flex-col justify-between"
                            >
                                {CardContent}
                            </Link>
                        )
                    })}
                </div>
            </div>

            <ProgrammerInviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </section>
    )
}
