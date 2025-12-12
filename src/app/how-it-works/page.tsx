'use client'

import { Compass, PenTool, CheckCircle, Download, CreditCard } from 'lucide-react'
import Link from 'next/link'

export default function HowItWorks() {
    const steps = [
        {
            icon: Compass,
            title: '1. Explore ou Publique',
            description: 'Navegue pelo Mural de Pedidos para encontrar jobs ou publique seu próprio projeto detalhando o que precisa (tamanho, formato, arquivo de imagem).'
        },
        {
            icon: PenTool,
            title: '2. Receba Propostas',
            description: 'Programadores qualificados enviarão orçamentos e prazos. Você pode negociar valores diretamente pelo chat da plataforma.'
        },
        {
            icon: CheckCircle,
            title: '3. Aprovou? Pague com Segurança',
            description: 'Aceite a melhor proposta. O pagamento fica retido (Escrow) e só é liberado para o programador quando você receber o arquivo e aprovar.'
        },
        {
            icon: Download,
            title: '4. Receba sua Matriz',
            description: 'O programador envia o arquivo final. Você baixa, testa e libera o pagamento. Simples, rápido e seguro.'
        }
    ]

    return (
        <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6]">
            {/* Hero Section */}
            <div className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
                <div className="relative max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFAE00] mb-6 tracking-tight">
                        Transformamos Arte em Pontos
                    </h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
                        O BordadoHub conecta quem precisa de matrizes de bordado perfeitas aos melhores programadores do mercado. Sem complicação, sem risco.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link
                            href="/jobs/new"
                            className="bg-[#FFAE00] text-[#0F1115] px-8 py-3 rounded-lg font-bold text-lg hover:bg-[#D97706] transition-all shadow-lg shadow-[#FFAE00]/20"
                        >
                            Começar Agora
                        </Link>
                        <Link
                            href="/creators"
                            className="bg-transparent border border-gray-600 text-gray-300 px-8 py-3 rounded-lg font-medium hover:border-[#FFAE00] hover:text-[#FFAE00] transition-all"
                        >
                            Ver Programadores
                        </Link>
                    </div>
                </div>
            </div>

            {/* Steps Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, index) => (
                        <div key={index} className="bg-[#1A1D23] p-8 rounded-xl border border-[#FFAE00]/10 hover:border-[#FFAE00]/50 transition-all group">
                            <div className="w-14 h-14 bg-[#0F1115] rounded-full flex items-center justify-center mb-6 border border-[#FFAE00]/20 group-hover:border-[#FFAE00] transition-colors">
                                <step.icon className="w-7 h-7 text-[#FFAE00]" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                            <p className="text-gray-400 leading-relaxed text-sm">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-[#1A1D23] border-y border-[#FFAE00]/10 py-16">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-6">Pronto para começar?</h2>
                    <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                        Junte-se a centenas de clientes e programadores que já estão usando o BordadoHub para agilizar suas produções.
                    </p>
                    <Link
                        href="/register"
                        className="inline-flex items-center gap-2 bg-[#FFAE00] text-[#0F1115] px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#D97706] transition-all hover:scale-105"
                    >
                        Criar Conta Grátis
                        <CreditCard className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
