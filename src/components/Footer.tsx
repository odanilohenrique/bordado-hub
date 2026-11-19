import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

export default function Footer() {
    return (
        <footer className="bg-[var(--bg-primary)] text-[var(--text-primary)] border-t border-[var(--border-hairline)] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="inline-block mb-1" aria-label="BordadoHub Início">
                            <BrandLogo variant="stacked" className="h-14 w-auto" />
                        </Link>
                        <p className="mt-3 text-[var(--text-secondary)] text-xs sm:text-sm leading-relaxed">
                            Plataforma brasileira de matrizes de bordado computadorizado. Encomende sob medida ou baixe arquivos testados em .PES, .DST e .JEF na hora.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#0F766E] dark:text-[#14B8A6]">
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                            <span>Custódia Segura e Download Imediato</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold text-[var(--text-primary)] tracking-wider uppercase mb-4">
                            Navegação
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link href="/jobs" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Mural de Pedidos
                                </Link>
                            </li>
                            <li>
                                <Link href="/marketplace" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Marketplace de Matrizes
                                </Link>
                            </li>
                            <li>
                                <Link href="/programadores" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Programadores
                                </Link>
                            </li>
                            <li>
                                <Link href="/how-it-works" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Como Funciona
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold text-[var(--text-primary)] tracking-wider uppercase mb-4">
                            Comece Agora
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link href="/jobs/new" className="text-[#2563EB] dark:text-[#60A5FA] hover:underline font-semibold transition-colors">
                                    Pedir Matriz Sob Medida
                                </Link>
                            </li>
                            <li>
                                <Link href="/marketplace/vender" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Vender Minhas Matrizes
                                </Link>
                            </li>
                            <li>
                                <Link href="/register" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Trabalhar como Programador
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Acessar Minha Conta
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold text-[var(--text-primary)] tracking-wider uppercase mb-4">
                            Segurança &amp; Termos
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link href="/termos" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Termos de Uso
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacidade" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Política de Privacidade
                                </Link>
                            </li>
                            <li>
                                <span className="text-xs text-[var(--text-secondary)]">Suporte: contato@bordadohub.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-[var(--border-hairline)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
                    <p>&copy; {new Date().getFullYear()} BordadoHUB. Todos os direitos reservados.</p>
                    <p>Feito para confecções, ateliês e bordadeiras de todo o Brasil.</p>
                </div>
            </div>
        </footer>
    )
}
