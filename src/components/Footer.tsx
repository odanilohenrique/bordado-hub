import Link from 'next/link'
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-1">
                        <span className="text-2xl font-bold text-white">BordadoHub</span>
                        <p className="mt-4 text-gray-400 text-sm">
                            Conectando profissionais de bordado a empresas e clientes em todo o Brasil.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">BordadoHub</h3>
                        <ul className="mt-4 space-y-4">
                            <li><Link href="#" className="text-base text-gray-300 hover:text-white">Como funciona</Link></li>
                            <li><Link href="#" className="text-base text-gray-300 hover:text-white">Blog</Link></li>
                            <li><Link href="#" className="text-base text-gray-300 hover:text-white">Central de ajuda</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Para Clientes</h3>
                        <ul className="mt-4 space-y-4">
                            <li><Link href="/register" className="text-base text-gray-300 hover:text-white">Cadastre-se</Link></li>
                            <li><Link href="/jobs/new" className="text-base text-gray-300 hover:text-white">Publicar Projeto</Link></li>
                            <li><Link href="#" className="text-base text-gray-300 hover:text-white">Encontrar Criadores</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Siga-nos</h3>
                        <div className="mt-4 flex space-x-6">
                            <Link href="#" className="text-gray-400 hover:text-white">
                                <span className="sr-only">Facebook</span>
                                <Facebook className="h-6 w-6" />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-white">
                                <span className="sr-only">Instagram</span>
                                <Instagram className="h-6 w-6" />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-white">
                                <span className="sr-only">Twitter</span>
                                <Twitter className="h-6 w-6" />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-white">
                                <span className="sr-only">LinkedIn</span>
                                <Linkedin className="h-6 w-6" />
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="mt-8 border-t border-gray-700 pt-8 md:flex md:items-center md:justify-between">
                    <p className="text-base text-gray-400">
                        &copy; {new Date().getFullYear()} BordadoHub. Todos os direitos reservados.
                    </p>
                </div>
            </div>
        </footer>
    )
}
