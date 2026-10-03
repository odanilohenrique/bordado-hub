import Link from 'next/link'
import { UploadCloud, Users, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'

const steps = [
    {
        number: '01',
        title: 'Peça sua Matriz',
        description: 'Envie a imagem ou logo pelo celular ou PC e informe o tamanho que precisa bordar.',
        icon: UploadCloud,
        highlight: 'Leva menos de 1 minuto',
    },
    {
        number: '02',
        title: 'Receba Propostas',
        description: 'Programadores profissionais competem pelo seu pedido com preços justos e prazos rápidos.',
        icon: Users,
        highlight: 'Você escolhe quem preferir',
    },
    {
        number: '03',
        title: 'Teste na sua Máquina',
        description: 'Baixe os arquivos (.DST, .PES, etc.) e teste o bordado na sua máquina com calma.',
        icon: CheckCircle2,
        highlight: '24 horas para testar',
    },
    {
        number: '04',
        title: 'Pagamento Seguro',
        description: 'O valor só é liberado para o programador depois que você aprovar a matriz funcionando.',
        icon: ShieldCheck,
        highlight: 'Garantia total de satisfação',
    },
]

export default function HowItWorks() {
    return (
        <section className="bg-[#0F1115] py-16 sm:py-24 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#FFAE00] bg-[#FFAE00]/10 px-3 py-1 rounded-full border border-[#FFAE00]/20">
                        Simples e Sem Burocracia
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 tracking-tight">
                        Como funciona o BordadoHUB?
                    </h2>
                    <p className="mt-2 text-sm sm:text-base text-gray-400">
                        Um processo simples de 4 passos pensado para facilitar a vida de quem borda.
                    </p>
                </div>

                {/* 4 Connected Step Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative mb-12">
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            className="bg-[#16191F] p-6 rounded-2xl border border-white/5 relative flex flex-col justify-between shadow-lg"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-5">
                                    <div className="w-12 h-12 rounded-xl bg-[#FFAE00]/10 text-[#FFAE00] flex items-center justify-center border border-[#FFAE00]/20">
                                        <step.icon className="w-6 h-6 stroke-[2]" />
                                    </div>
                                    <span className="text-2xl font-black text-white/20">
                                        {step.number}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-4">
                                    {step.description}
                                </p>
                            </div>

                            <div className="pt-3 border-t border-white/5">
                                <span className="text-[11px] font-bold text-[#FFAE00] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFAE00]" />
                                    {step.highlight}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Assurance Card */}
                <div className="bg-gradient-to-r from-[#1A1D23] via-[#1F242D] to-[#1A1D23] border border-[#FFAE00]/25 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
                    <div className="flex items-center gap-4 text-center sm:text-left">
                        <div className="w-14 h-14 rounded-2xl bg-[#FFAE00]/15 text-[#FFAE00] flex items-center justify-center shrink-0 border border-[#FFAE00]/30 shadow-md">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-lg sm:text-xl font-bold text-white mb-1">
                                Garantia Total BordadoHUB
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
                                Seu dinheiro fica protegido em garantia. Você tem 24h para testar na máquina. Se não ficar perfeito, você solicita ajustes ou recebe seu dinheiro de volta.
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/jobs/new"
                        className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-[#FFAE00] to-yellow-400 text-black font-black text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-[#FFAE00]/20 hover:opacity-95 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                    >
                        <span>Começar Meu Pedido</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </Link>
                </div>
            </div>
        </section>
    )
}
