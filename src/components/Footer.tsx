import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-[#0B0D11] text-white border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="inline-block group mb-1">
                            <Image
                                src="/brand/logo-dark.png"
                                alt="BordadoHub"
                                width={130}
                                height={56}
                                className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
                            />
                        </Link>
                        <p className="mt-3 text-gray-400 text-xs sm:text-sm leading-relaxed">
                            A maior plataforma de matrizes de bordado computadorizado do Brasil. Conectando quem precisa bordar aos melhores programadores do país.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Ambiente 100% Seguro</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-black text-white tracking-widest uppercase mb-4">
                            Navegação
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link href="/jobs" className="text-gray-400 hover:text-white transition-colors">Pedidos de Clientes (Mural)</Link></li>
                            <li><Link href="/programadores" className="text-gray-400 hover:text-white transition-colors">Programadores</Link></li>
                            <li className="flex items-center gap-2 text-gray-500 cursor-not-allowed select-none">
                                <span>Marketplace</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-[#FFAE00]/15 text-[#FFAE00] border border-[#FFAE00]/30 px-1 py-0.2 rounded">Em breve</span>
                            </li>
                            <li><Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">Como Funciona</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-black text-white tracking-widest uppercase mb-4">
                            Comece Agora
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link href="/jobs/new" className="text-[#FFAE00] hover:text-yellow-300 font-bold transition-colors">Pedir uma Matriz</Link></li>
                            <li><Link href="/register" className="text-gray-400 hover:text-white transition-colors">Trabalhar como Criador</Link></li>
                            <li><Link href="/login" className="text-gray-400 hover:text-white transition-colors">Acessar Minha Conta</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-black text-white tracking-widest uppercase mb-4">
                            Segurança & Termos
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link href="/termos" className="text-gray-400 hover:text-white transition-colors">Termos de Uso</Link></li>
                            <li><Link href="/privacidade" className="text-gray-400 hover:text-white transition-colors">Política de Privacidade</Link></li>
                            <li><span className="text-xs text-gray-400">Suporte: contato@bordadohub.com</span></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
                    <p>&copy; {new Date().getFullYear()} BordadoHUB. Todos os direitos reservados.</p>
                    <p className="text-gray-400">Feito para confecções, ateliês e bordadeiras de todo o Brasil.</p>
                </div>
            </div>
        </footer>
    )
}
