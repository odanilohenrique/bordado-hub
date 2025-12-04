import Link from 'next/link'

export default function Hero() {
    return (
        <div className="relative bg-[#0F1115] overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="relative z-10 pb-8 bg-[#0F1115] sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
                    <svg
                        className="hidden lg:block absolute right-0 inset-y-0 h-full w-48 text-[#0F1115] transform translate-x-1/2"
                        fill="currentColor"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        <polygon points="50,0 100,0 50,100 0,100" />
                    </svg>

                    <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                        <div className="sm:text-center lg:text-left">
                            <h1 className="text-4xl tracking-tight font-extrabold text-[#F3F4F6] sm:text-5xl md:text-6xl">
                                <span className="block xl:inline">O Marketplace Completo de</span>{' '}
                                <span className="block text-[#FFAE00] xl:inline">Matrizes de Bordado</span>
                            </h1>
                            <p className="mt-3 text-base text-gray-300 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                                <strong>Precisa de uma matriz?</strong> Publique seu pedido e receba propostas de programadores profissionais em minutos.
                                <br /><br />
                                <strong>É um programador?</strong> Encontre clientes, venda suas matrizes e receba com segurança.
                            </p>
                            <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                                <div className="rounded-md shadow">
                                    <Link
                                        href="/jobs/new"
                                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-[#0F1115] bg-[#FFAE00] hover:bg-[#D97706] md:py-4 md:text-lg md:px-10 transition-colors font-bold"
                                    >
                                        Comprar Matrizes
                                    </Link>
                                </div>
                                <div className="mt-3 sm:mt-0 sm:ml-3">
                                    <Link
                                        href="/register"
                                        className="w-full flex items-center justify-center px-8 py-3 border border-[#FFAE00]/20 text-base font-medium rounded-md text-[#FFAE00] bg-[#1A1D23] hover:bg-[#FFAE00]/10 md:py-4 md:text-lg md:px-10 transition-colors"
                                    >
                                        Produzir Matrizes
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
                <img
                    className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
                    src="/images/carousel1.png"
                    alt="Bordado em destaque"
                />
            </div>
        </div>
    )
}
