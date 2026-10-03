import Link from 'next/link'
import { PenTool, Edit3, FileCode2, Image as ImageIcon, ArrowRight } from 'lucide-react'

const categories = [
    {
        name: 'Criação de Matriz',
        description: 'Desenho completo do zero a partir de uma foto, vetor ou ideia.',
        icon: PenTool,
        tag: 'Mais Pedido',
    },
    {
        name: 'Edição e Ajustes',
        description: 'Alterar tamanho, densidade de pontos ou corrigir falhas de costura.',
        icon: Edit3,
        tag: 'Rápido',
    },
    {
        name: 'Conversão de Formato',
        description: 'Converta arquivos entre .DST, .PES, .JEF, .EMB, .EXP para sua máquina.',
        icon: FileCode2,
        tag: 'Técnico',
    },
    {
        name: 'Logotipos Bordados',
        description: 'Transforme a marca da sua empresa ou uniforme em bordado impecável.',
        icon: ImageIcon,
        tag: 'Empresarial',
    },
]

export default function Categories() {
    return (
        <section className="bg-[#0F1115] py-14 sm:py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#FFAE00] bg-[#FFAE00]/10 px-3 py-1 rounded-full border border-[#FFAE00]/20">
                        Serviços Disponíveis
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 tracking-tight">
                        O que você precisa bordar hoje?
                    </h2>
                    <p className="mt-2 text-sm sm:text-base text-gray-400">
                        Encontre programadores talentosos para qualquer tipo de matriz computadorizada.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {categories.map((category) => (
                        <Link
                            key={category.name}
                            href="/jobs/new"
                            className="group bg-[#16191F] hover:bg-[#1C2028] p-6 rounded-2xl border border-white/5 hover:border-[#FFAE00]/40 transition-all duration-300 shadow-lg flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#FFAE00]/10 text-[#FFAE00] flex items-center justify-center border border-[#FFAE00]/20 group-hover:scale-110 transition-transform">
                                        <category.icon className="w-6 h-6 stroke-[2]" />
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
                                <span>Pedir Agora</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
