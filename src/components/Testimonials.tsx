import { Star, CheckCircle, Quote } from 'lucide-react'

const testimonials = [
    {
        content: "Muito bom para quem tem confecção e precisa de matrizes rápidas. O programador me entregou em menos de 2 horas e o bordado no boné ficou perfeito de primeira!",
        author: "Rafael Leite",
        role: "Dono de Confecção",
        location: "São Paulo, SP",
        rating: 5,
        matrixType: "Logo 3D em Boné",
    },
    {
        content: "A qualidade dos profissionais disponíveis é muito acima do esperado. Antes eu sofria esperando dias, aqui recebi 4 propostas em 15 minutos e paguei um preço super justo.",
        author: "Lincoln Tamashiro",
        role: "Bordados Personalizados",
        location: "Curitiba, PR",
        rating: 5,
        matrixType: "Kit Matrizes Uniforme",
    },
    {
        content: "O sistema de garantia traz uma segurança absurda. O dinheiro só foi liberado depois que eu testei o arquivo .PES na minha Brother e conferi os pontos.",
        author: "Jorge Medeiros",
        role: "Ateliê de Bordado",
        location: "Belo Horizonte, MG",
        rating: 5,
        matrixType: "Brasão Escolar .PES",
    },
]

export default function Testimonials() {
    return (
        <section className="bg-[#121418] py-16 sm:py-24 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#FFAE00] bg-[#FFAE00]/10 px-3 py-1 rounded-full border border-[#FFAE00]/20">
                        Quem Usa Recomenda
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 tracking-tight">
                        O que nossos clientes dizem
                    </h2>
                    <p className="mt-2 text-sm sm:text-base text-gray-400">
                        Mais de centenas de confecções, bordadeiras e ateliês contratando com segurança.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {testimonials.map((item, index) => (
                        <div
                            key={index}
                            className="bg-[#16191F] p-6 rounded-2xl border border-white/5 flex flex-col justify-between shadow-xl relative"
                        >
                            <div>
                                {/* Stars & Verified Badge */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex gap-1">
                                        {[...Array(item.rating)].map((_, i) => (
                                            <Star key={i} className="w-4 h-4 text-[#FFAE00] fill-[#FFAE00]" />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Verificado
                                    </span>
                                </div>

                                {/* Content */}
                                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed italic mb-6">
                                    &ldquo;{item.content}&rdquo;
                                </p>
                            </div>

                            {/* Author Details */}
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-white">
                                        {item.author}
                                    </h4>
                                    <p className="text-[11px] text-gray-400">
                                        {item.role} • {item.location}
                                    </p>
                                </div>
                                <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-md">
                                    {item.matrixType}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust Metrics Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-center pt-8 border-t border-white/5">
                    <div>
                        <p className="text-2xl sm:text-3xl font-black text-white">4.9 / 5.0</p>
                        <p className="text-xs text-gray-400 mt-0.5">Avaliação Média</p>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-black text-[#FFAE00]">+5.000</p>
                        <p className="text-xs text-gray-400 mt-0.5">Matrizes Criadas</p>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-black text-white">99.4%</p>
                        <p className="text-xs text-gray-400 mt-0.5">Aprovação na Máquina</p>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-black text-[#FFAE00]">24 Horas</p>
                        <p className="text-xs text-gray-400 mt-0.5">Garantia para Teste</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
