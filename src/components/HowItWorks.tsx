'use client'

import { useState } from 'react'
import Link from 'next/link'
import ProgrammerInviteModal from '@/components/ProgrammerInviteModal'
import {
    Sparkles,
    UploadCloud,
    Users,
    CheckCircle2,
    ShieldCheck,
    ArrowRight,
    Search,
    Send,
    DollarSign,
    Layers,
    FileCheck2,
    ShoppingBag,
    Download,
    Coins,
    PackageCheck,
    Star
} from 'lucide-react'

interface TimelineStep {
    step: string
    title: string
    description: string
    icon: any
}

interface WorkflowColumn {
    id: string
    badge: string
    badgeColor: string
    title: string
    tagline: string
    accentColor: string
    iconBg: string
    steps: TimelineStep[]
    ctaText: string
    ctaLink: string
    ctaVariant: 'primary' | 'dark' | 'outline'
}

const workflows: WorkflowColumn[] = [
    {
        id: 'compre',
        badge: 'Para Quem Precisa Bordar',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300/80',
        title: 'Compre Matrizes',
        tagline: 'Transforme qualquer foto, vetor ou ideia em bordado perfeito na sua máquina.',
        accentColor: 'text-amber-800',
        iconBg: 'bg-amber-100 text-amber-800 border-amber-300',
        steps: [
            {
                step: '01',
                title: 'Envie sua imagem ou logo',
                description: 'Faça upload da foto pelo celular ou PC e informe tamanho em centímetros e tipo de tecido.',
                icon: UploadCloud,
            },
            {
                step: '02',
                title: 'Receba propostas de criadores',
                description: 'Programadores profissionais competem com prazos ágeis e preços sob medida para você.',
                icon: Users,
            },
            {
                step: '03',
                title: 'Escolha a melhor e pague seguro',
                description: 'O valor do pagamento fica retido em garantia protegida — ninguém recebe antes da sua aprovação.',
                icon: ShieldCheck,
            },
            {
                step: '04',
                title: 'Receba sua matriz e teste na máquina',
                description: 'Baixe nos formatos compatíveis (.PES, .DST, .JEF, .EXP) e teste o bordado com total calma.',
                icon: FileCheck2,
            },
            {
                step: '05',
                title: 'Aprove e avalie o criador',
                description: 'Precisa de ajustes? É gratuito. Aprovou o resultado? O pagamento é liberado e você avalia o serviço.',
                icon: Star,
            },
        ],
        ctaText: 'Pedir Matriz Sob Encomenda',
        ctaLink: '/jobs/new',
        ctaVariant: 'primary',
    },
    {
        id: 'produza',
        badge: 'Para Programadores e Designers',
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300/80',
        title: 'Produza Matrizes',
        tagline: 'Monetize seu talento programando para clientes e oficinas de bordado de todo o Brasil.',
        accentColor: 'text-emerald-900',
        iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        steps: [
            {
                step: '01',
                title: 'Explore o mural de pedidos abertos',
                description: 'Acesse dezenas de pedidos postados diariamente por confecções, ateliês e bordadeiras.',
                icon: Search,
            },
            {
                step: '02',
                title: 'Envie sua proposta personalizada',
                description: 'Informe seu valor justo, prazo de entrega e mostre a qualidade do seu portfólio.',
                icon: Send,
            },
            {
                step: '03',
                title: 'Cliente aceita e pagamento garantido',
                description: 'Trabalhe com 100% de tranquilidade: o cliente paga antes e o saldo fica garantido na plataforma.',
                icon: DollarSign,
            },
            {
                step: '04',
                title: 'Desenvolva e entregue os arquivos',
                description: 'Crie no seu software preferido (Wilcom, Embird, Pe-Design) e suba a entrega final direto no painel.',
                icon: Layers,
            },
            {
                step: '05',
                title: 'Receba direto via PIX na sua conta',
                description: 'Assim que o cliente confirma o bordado, o valor é liquidado para você sem burocracia.',
                icon: Coins,
            },
        ],
        ctaText: 'Ver Pedidos e Começar a Produzir',
        ctaLink: '/jobs',
        ctaVariant: 'dark',
    },
    {
        id: 'marketplace',
        badge: 'Catálogo & Renda Recorrente',
        badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300/80',
        title: 'Marketplace de Matrizes',
        tagline: 'Compre matrizes prontas com download imediato ou venda seu acervo pessoal.',
        accentColor: 'text-indigo-950',
        iconBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        steps: [
            {
                step: '01',
                title: 'Navegue por coleções prontas',
                description: 'Encontre temas populares: brasões, florais, infantis, marcas, alfabetos e datas comemorativas.',
                icon: ShoppingBag,
            },
            {
                step: '02',
                title: 'Download imediato 24 horas por dia',
                description: 'Comprou, baixou no mesmo segundo no formato certo para bordar agora sem esperar.',
                icon: Download,
            },
            {
                step: '03',
                title: 'Pacotes temáticos ou matrizes avulsas',
                description: 'Adquira arquivos individuais para peças rápidas ou pacotes completos com super desconto.',
                icon: PackageCheck,
            },
            {
                step: '04',
                title: 'Venda suas matrizes e ganhe no piloto',
                description: 'Disponibilize suas criações no catálogo e construa uma renda passiva que rende todos os dias.',
                icon: Sparkles,
            },
            {
                step: '05',
                title: 'Controle de vendas e repasse automático',
                description: 'Acompanhe vendas em tempo real pelo seu painel com saques rápidos e taxas transparentes.',
                icon: CheckCircle2,
            },
        ],
        ctaText: 'Acessar Catálogo & Matrizes',
        ctaLink: '/jobs',
        ctaVariant: 'primary',
    },
]

export default function HowItWorks() {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

    return (
        <section className="bg-[#0F1115] py-14 sm:py-20 border-b border-white/5 relative overflow-hidden">
            {/* Sutil brilho de ambientação */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#FFAE00]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Principal */}
                <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#FFAE00] bg-[#FFAE00]/10 px-3 py-1 rounded-full border border-[#FFAE00]/25 shadow-sm inline-block mb-3">
                        Simples, Transparente e Confiável
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                        Como funciona o BordadoHUB?
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-gray-300 leading-relaxed">
                        Criamos um ecossistema completo pensado tanto para quem quer encomendar matrizes perfeitas quanto para quem vive de criar ou comercializar arquivos de bordado.
                    </p>
                </div>

                {/* 3 Colunas com Fundo Creme e Efeito Degradê (Conforme Solicitado) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch mb-12">
                    {workflows.map((workflow) => (
                        <div
                            key={workflow.id}
                            className="bg-gradient-to-b from-[#FFFDF8] via-[#FBF6EC] to-[#F4EBD9] rounded-2xl p-6 sm:p-7 border border-[#E3D6BF] shadow-2xl shadow-black/40 hover:shadow-[#FFAE00]/10 hover:border-[#D4AF37]/60 transition-all duration-300 flex flex-col justify-between group"
                        >
                            <div>
                                {/* Topo do Card */}
                                <div className="mb-5 pb-5 border-b border-[#E7DBC5]">
                                    <span
                                        className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${workflow.badgeColor} mb-2.5 shadow-xs`}
                                    >
                                        {workflow.badge}
                                    </span>
                                    <h3 className={`text-xl sm:text-2xl font-black ${workflow.accentColor} tracking-tight mb-1.5`}>
                                        {workflow.title}
                                    </h3>
                                    <p className="text-xs sm:text-[13px] text-gray-600 leading-relaxed font-medium">
                                        {workflow.tagline}
                                    </p>
                                </div>

                                {/* Linha do Tempo Vertical (Timeline de Cima para Baixo) */}
                                <div className="relative pl-6 sm:pl-7 space-y-5 my-6">
                                    {/* Linha vertical conectora de fundo */}
                                    <div className="absolute left-[13px] sm:left-[15px] top-3 bottom-5 w-0.5 bg-gradient-to-b from-[#D8C7A7] via-[#DFD1B7] to-[#D8C7A7]" />

                                    {workflow.steps.map((item, idx) => (
                                        <div key={item.step} className="relative flex items-start gap-3.5 group/item">
                                            {/* Bolinha / Ícone na linha do tempo */}
                                            <div
                                                className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${workflow.iconBg} -ml-6 sm:-ml-7 transition-transform group-hover/item:scale-110`}
                                            >
                                                <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                                            </div>

                                            {/* Conteúdo do Passo */}
                                            <div className="pt-0.5">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-[10px] font-black text-[#A18861] tracking-wider uppercase">
                                                        Passo {item.step}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-gray-900 leading-snug">
                                                    {item.title}
                                                </h4>
                                                <p className="text-xs text-gray-600 leading-relaxed mt-0.5 font-normal">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CTA no Rodapé do Card */}
                            <div className="pt-5 mt-4 border-t border-[#E7DBC5]">
                                {workflow.id === 'produza' ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsInviteModalOpen(true)}
                                        className="w-full bg-[#181B22] hover:bg-[#222630] text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl border border-black/10 shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all text-center cursor-pointer"
                                    >
                                        <span>{workflow.ctaText}</span>
                                        <ArrowRight className="w-4 h-4 stroke-[2.5] text-[#FFAE00]" />
                                    </button>
                                ) : workflow.ctaVariant === 'primary' ? (
                                    <Link
                                        href={workflow.ctaLink}
                                        className="w-full bg-gradient-to-r from-[#FFAE00] to-amber-500 hover:from-amber-500 hover:to-[#FFAE00] text-black font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md shadow-[#FFAE00]/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
                                    >
                                        <span>{workflow.ctaText}</span>
                                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                                    </Link>
                                ) : (
                                    <Link
                                        href={workflow.ctaLink}
                                        className="w-full bg-[#181B22] hover:bg-[#222630] text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl border border-black/10 shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
                                    >
                                        <span>{workflow.ctaText}</span>
                                        <ArrowRight className="w-4 h-4 stroke-[2.5] text-[#FFAE00]" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Card Inferior de Garantia & Confiança */}
                <div className="bg-gradient-to-r from-[#171A21] via-[#1E232D] to-[#171A21] border border-[#FFAE00]/30 rounded-2xl p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xl">
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="w-13 h-13 rounded-2xl bg-[#FFAE00]/15 text-[#FFAE00] flex items-center justify-center shrink-0 border border-[#FFAE00]/35 shadow-inner">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div>
                            <h4 className="text-base sm:text-lg font-black text-white mb-0.5 tracking-tight">
                                Garantia Total de Entrega & Pagamento Protegido
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
                                No BordadoHUB, o valor nunca é repassado às cegas. Você tem prazo garantido para baixar, testar na máquina de bordar e solicitar qualquer ajuste sem custos adicionais.
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/jobs/new"
                        className="w-full md:w-auto shrink-0 bg-gradient-to-r from-[#FFAE00] to-yellow-400 hover:from-yellow-400 hover:to-[#FFAE00] text-black font-black text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-[#FFAE00]/25 hover:opacity-95 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                    >
                        <span>Começar Agora</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </Link>
                </div>
            </div>

            <ProgrammerInviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </section>
    )
}
