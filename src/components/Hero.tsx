import Link from 'next/link'
import { ArrowRight, ShieldCheck, Zap, CheckCircle2, Sparkles, Download, Layers } from 'lucide-react'

export default function Hero() {
    return (
        <section className="relative bg-[#0F1115] pt-6 pb-16 sm:pt-12 sm:pb-24 overflow-hidden border-b border-white/5">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#FFAE00]/10 blur-[130px] rounded-full pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                    
                    {/* Left Column: Copy & Actions */}
                    <div className="lg:col-span-7 text-center lg:text-left">
                        {/* Top Pill Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFAE00]/10 border border-[#FFAE00]/25 text-xs font-bold text-[#FFAE00] mb-6 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-[#FFAE00] animate-pulse"></span>
                            <span>A plataforma oficial de matrizes do Brasil</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
                            O Marketplace Completo de{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFAE00] via-yellow-300 to-amber-400">
                                Matrizes de Bordado
                            </span>
                        </h1>

                        {/* Direct Simple Copy */}
                        <div className="space-y-3 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                            <p>
                                <strong className="text-white">Precisa de uma matriz?</strong> Envie sua foto ou logotipo e receba propostas de programadores profissionais em minutos.
                            </p>
                            <p className="text-gray-400 text-sm sm:text-base">
                                <strong className="text-gray-300">É um programador?</strong> Encontre clientes todos os dias, venda suas matrizes e receba pagamentos com segurança total.
                            </p>
                        </div>

                        {/* Large Touch-friendly CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start mb-10">
                            <Link
                                href="/jobs/new"
                                className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#FFAE00] to-yellow-400 hover:from-yellow-400 hover:to-[#FFAE00] text-black font-black text-base sm:text-lg px-8 py-4 rounded-2xl shadow-xl shadow-[#FFAE00]/20 active:scale-95 transition-all text-center"
                            >
                                <span>Comprar Matrizes</span>
                                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                            </Link>

                            <Link
                                href="/register"
                                className="flex items-center justify-center gap-2 bg-[#1A1D23] hover:bg-[#20242C] text-white font-bold text-base sm:text-lg px-8 py-4 rounded-2xl border border-white/10 hover:border-[#FFAE00]/30 transition-all text-center"
                            >
                                <span>Produzir Matrizes</span>
                            </Link>
                        </div>

                        {/* 3 Simplicity & Trust Pillars */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 border-t border-white/10 text-left">
                            <div className="flex items-center gap-2.5 bg-[#16191F]/60 p-2.5 rounded-xl border border-white/5">
                                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                                <div className="text-xs">
                                    <p className="font-bold text-white">Pagamento Seguro</p>
                                    <p className="text-gray-400 text-[11px]">Liberado só após o teste</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 bg-[#16191F]/60 p-2.5 rounded-xl border border-white/5">
                                <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                                <div className="text-xs">
                                    <p className="font-bold text-white">Super Rápido</p>
                                    <p className="text-gray-400 text-[11px]">Propostas em minutos</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 bg-[#16191F]/60 p-2.5 rounded-xl border border-white/5">
                                <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                                <div className="text-xs">
                                    <p className="font-bold text-white">Todas as Máquinas</p>
                                    <p className="text-gray-400 text-[11px]">.DST, .PES, .JEF, .EMB</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: High Converting Visual Card */}
                    <div className="lg:col-span-5 relative">
                        {/* Glassmorphic Showcase Card */}
                        <div className="relative mx-auto max-w-lg bg-[#16191F] border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-bold text-white">Como Funciona na Prática</span>
                                </div>
                                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Testado na Máquina
                                </span>
                            </div>

                            {/* Main Preview Image: Before & After */}
                            <div className="relative rounded-2xl overflow-hidden mb-3.5 border border-white/10 group bg-[#0F1115]">
                                <img
                                    src="/images/hero-before-after.jpg"
                                    alt="Transformação de imagem em matriz de bordado computadorizada"
                                    className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                />
                                <div className="p-3 bg-[#0F1115]/95 border-t border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-white">Sua Imagem ➔ Matriz Bordada</p>
                                        <p className="text-[10px] sm:text-[11px] text-gray-400">Pronta para máquinas Brother, Janome, Barudan, Tajima...</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-[#FFAE00]/15 text-[#FFAE00] px-2 py-1 rounded-lg text-xs font-black shrink-0">
                                        <span>5.0</span>
                                        <Sparkles className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </div>

                            {/* Format Badges & Live Action */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-lg">.DST</span>
                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-lg">.PES</span>
                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-lg">.JEF</span>
                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-lg">.EMB</span>
                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-lg">.EXP</span>
                                </div>
                                <Link
                                    href="/jobs/new"
                                    className="text-xs font-bold text-[#FFAE00] hover:text-yellow-300 flex items-center gap-1 transition-colors shrink-0 ml-2"
                                >
                                    Pedir Matriz <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>

                        {/* Floating Micro Badge */}
                        <div className="hidden sm:flex absolute -bottom-4 -left-4 bg-[#1A1D23] border border-white/10 p-3 rounded-2xl shadow-xl items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#FFAE00]/15 text-[#FFAE00] flex items-center justify-center font-black">
                                <Download className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">+5.000 Matrizes</p>
                                <p className="text-[10px] text-gray-400">Entregues com sucesso</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}
