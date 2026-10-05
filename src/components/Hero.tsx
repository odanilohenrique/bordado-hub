import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck, Zap, CheckCircle2, Sparkles, Download, Layers } from 'lucide-react'

export default function Hero() {
    return (
        <section className="relative bg-[#0F1115] pt-6 pb-16 sm:pt-12 sm:pb-24 overflow-hidden border-b border-white/5">
            {/* Ambient Background Glow (GPU accelerated and lightweight on mobile) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] h-[250px] bg-[#FFAE00]/10 blur-[60px] md:blur-[100px] rounded-full pointer-events-none -z-10 transform-gpu" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                    
                    {/* Left Column: Copy & Actions */}
                    <div className="lg:col-span-7 text-center lg:text-left">
                        {/* Top Pill Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFAE00]/10 border border-[#FFAE00]/25 text-[11px] font-bold text-[#FFAE00] mb-4 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFAE00] animate-pulse"></span>
                            <span>A plataforma oficial de matrizes do Brasil</span>
                            <ArrowRight className="w-3 h-3" />
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-[1.15] mb-4">
                            O Marketplace Completo de{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFAE00] via-yellow-300 to-amber-400">
                                Matrizes de Bordado
                            </span>
                        </h1>

                        {/* Direct Simple Copy */}
                        <div className="space-y-2 text-xs sm:text-sm text-gray-300 max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">
                            <p>
                                <strong className="text-white">Precisa de uma matriz?</strong> Envie sua foto ou logotipo e receba propostas de programadores profissionais em minutos.
                            </p>
                            <p className="text-gray-400 text-xs sm:text-[13px]">
                                <strong className="text-gray-300">É um programador?</strong> Encontre clientes todos os dias, venda suas matrizes e receba pagamentos com segurança total.
                            </p>
                        </div>

                        {/* Sleek Touch-friendly CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                            <Link
                                href="/jobs/new"
                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#FFAE00] to-yellow-400 hover:from-yellow-400 hover:to-[#FFAE00] text-black font-black text-sm px-6 py-3 rounded-xl shadow-lg shadow-[#FFAE00]/15 active:scale-95 transition-all text-center"
                            >
                                <span>Comprar Matrizes</span>
                                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                            </Link>

                            <Link
                                href="/register"
                                className="flex items-center justify-center gap-2 bg-[#1A1D23] hover:bg-[#20242C] text-white font-bold text-sm px-6 py-3 rounded-xl border border-white/10 hover:border-[#FFAE00]/30 transition-all text-center"
                            >
                                <span>Produzir Matrizes</span>
                            </Link>
                        </div>

                        {/* 3 Simplicity & Trust Pillars */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-5 border-t border-white/10 text-left">
                            <div className="flex items-center gap-2 bg-[#16191F]/60 p-2 rounded-xl border border-white/5">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div className="text-[11px]">
                                    <p className="font-bold text-white">Pagamento Seguro</p>
                                    <p className="text-gray-400 text-[10px]">Liberado após o teste</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-[#16191F]/60 p-2 rounded-xl border border-white/5">
                                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                                <div className="text-[11px]">
                                    <p className="font-bold text-white">Super Rápido</p>
                                    <p className="text-gray-400 text-[10px]">Propostas em minutos</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-[#16191F]/60 p-2 rounded-xl border border-white/5">
                                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                                <div className="text-[11px]">
                                    <p className="font-bold text-white">Todas as Máquinas</p>
                                    <p className="text-gray-400 text-[10px]">.DST, .PES, .JEF, .EXP</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: High Converting Visual Card */}
                    <div className="lg:col-span-5 relative">
                        {/* Glassmorphic Showcase Card */}
                        <div className="relative mx-auto max-w-md bg-[#16191F] border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-bold text-white">Exemplos Reais Produzidos</span>
                                </div>
                                <span className="bg-[#FFAE00]/10 border border-[#FFAE00]/30 text-[#FFAE00] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Arquivos de Leitura
                                </span>
                            </div>

                            {/* Main Preview Image: Before & After */}
                            <div className="relative rounded-xl overflow-hidden mb-3 border border-white/10 group bg-[#0F1115]">
                                <Image
                                    src="/images/antes-depois.jpg"
                                    alt="Exemplos reais de imagem convertida em matriz de bordado"
                                    width={991}
                                    height={1024}
                                    priority
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                                    className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.01]"
                                />
                                <div className="p-2.5 bg-[#0F1115]/95 border-t border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-white">Imagem do Cliente ➔ Matriz Bordada</p>
                                        <p className="text-[10px] text-gray-400">Pronta para carregar direto no pendrive da máquina</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-[#FFAE00]/15 text-[#FFAE00] px-2 py-0.5 rounded-lg text-xs font-black shrink-0">
                                        <span>100%</span>
                                        <Sparkles className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>

                            {/* Format Badges & Live Action */}
                            <div className="flex items-center justify-between pt-0.5">
                                <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded-md">.DST</span>
                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded-md">.PES</span>
                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded-md">.JEF</span>
                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded-md">.EXP</span>
                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded-md">.XXX</span>
                                </div>
                                <Link
                                    href="/jobs/new"
                                    className="text-xs font-bold text-[#FFAE00] hover:text-yellow-300 flex items-center gap-1 transition-colors shrink-0 ml-2"
                                >
                                    Pedir Matriz <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}
