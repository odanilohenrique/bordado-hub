'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Sparkles,
    UploadCloud,
    Users,
    ShieldCheck,
    CheckCircle2,
    ArrowRight,
    Search,
    Send,
    DollarSign,
    Layers,
    FileCheck2,
    ShoppingBag,
    Download,
    Coins,
    PackageCheck,
    Star,
    HelpCircle,
    ChevronDown,
    Zap,
    ThumbsUp,
    Smartphone,
    HardDrive,
    AlertCircle,
    CreditCard
} from 'lucide-react'
import Footer from '@/components/Footer'

export default function HowItWorksPage() {
    const [faqOpen, setFaqOpen] = useState<number | null>(null)

    const toggleFaq = (index: number) => {
        setFaqOpen(faqOpen === index ? null : index)
    }

    const faqs = [
        {
            q: 'Eu preciso pagar alguma coisa para pedir um orçamento?',
            a: 'Não! Publicar um pedido no mural é 100% gratuito. Você coloca sua imagem, tamanho e os programadores enviam os preços para você escolher o melhor.'
        },
        {
            q: 'Como a matriz chega até a minha máquina de bordar?',
            a: 'O programador envia o arquivo pronto no formato da sua máquina (como .PES, .DST, .JEF, .XXX, etc.). Você baixa o arquivo para o seu computador ou celular, passa para um Pen Drive e espeta direto na sua máquina de bordar.'
        },
        {
            q: 'E se a matriz der errado ou a linha ficar arrebentando?',
            a: 'Você tem garantia! Todo pedido inclui ajustes gratuitos com o programador. Ele altera a densidade, pontos ou compensação para você sem cobrar nada a mais. E se mesmo assim não funcionar, seu dinheiro é devolvido integralmente.'
        },
        {
            q: 'O programador pode sumir com o meu dinheiro?',
            a: 'De jeito nenhum! Quando você paga pelo PIX ou Cartão de Crédito, o dinheiro não vai direto para o programador. Ele fica seguro em uma conta de garantia do BordadoHUB. O programador só recebe o dinheiro depois que você bordar e aprovar o resultado.'
        },
        {
            q: 'Eu sei programar matrizes no Wilcom/Embird. Como começo a ganhar dinheiro?',
            a: 'É só criar sua conta grátis, ativar o seu Perfil de Programador, colocar algumas fotos dos seus trabalhos no portfólio e entrar no Mural de Pedidos. Todos os dias clientes postam dezenas de matrizes precisando de orçamento.'
        },
        {
            q: 'Como o programador recebe o pagamento dele?',
            a: 'Assim que o cliente aprova a matriz, o dinheiro é liberado no seu saldo do BordadoHUB e você pode transferir direto para sua chave PIX no seu banco de preferência.'
        },
        {
            q: 'O que é o Marketplace de Matrizes?',
            a: 'É como uma loja de matrizes prontas. Se você não quer esperar alguém desenhar uma matriz personalizada, você entra no Marketplace, escolhe pacotes prontos (flores, brasões, temas infantis, etc.), paga no PIX ou Cartão de Crédito e o download é liberado no mesmo segundo.'
        }
    ]

    return (
        <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6]">
            {/* 1. HERO PRINCIPAL */}
            <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-20 overflow-hidden border-b border-white/5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FFAE00]/10 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFAE00]/10 border border-[#FFAE00]/25 text-xs font-black text-[#FFAE00] uppercase tracking-wider mb-5 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>O Guia Passo a Passo Mais Simples da Internet</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto mb-5">
                        Como funciona o{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFAE00] via-yellow-300 to-amber-400">
                            BordadoHUB?
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
                        Explicado de um jeito tão simples que qualquer pessoa entende: seja para <strong className="text-white">encomendar uma matriz personalizada</strong>, para <strong className="text-white">faturar como programador</strong> ou para <strong className="text-white">comprar matrizes prontas</strong> com download na hora.
                    </p>

                    {/* Botões Rápidos de Acesso */}
                    <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl mx-auto">
                        <a
                            href="#compre"
                            className="text-xs sm:text-sm font-bold bg-[#1C2028] hover:bg-[#252A36] text-[#FFAE00] px-4 py-2.5 rounded-xl border border-[#FFAE00]/20 hover:border-[#FFAE00] transition-all flex items-center gap-1.5"
                        >
                            <span>🧵 Quero Comprar Matriz</span>
                        </a>
                        <a
                            href="#produza"
                            className="text-xs sm:text-sm font-bold bg-[#1C2028] hover:bg-[#252A36] text-emerald-400 px-4 py-2.5 rounded-xl border border-emerald-500/20 hover:border-emerald-500 transition-all flex items-center gap-1.5"
                        >
                            <span>💻 Quero Programar & Lucrar</span>
                        </a>
                        <a
                            href="#marketplace"
                            className="text-xs sm:text-sm font-bold bg-[#1C2028] hover:bg-[#252A36] text-indigo-400 px-4 py-2.5 rounded-xl border border-indigo-500/20 hover:border-indigo-500 transition-all flex items-center gap-1.5"
                        >
                            <span>🛍️ Marketplace de Matrizes</span>
                        </a>
                        <a
                            href="#faq"
                            className="text-xs sm:text-sm font-bold bg-[#16191F] hover:bg-[#20242D] text-gray-300 px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/30 transition-all flex items-center gap-1.5"
                        >
                            <span>❓ Perguntas Frequentes</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* 2. OS 3 GRANDES CARDS COM FUNDO CREME DEGRADÊ E LINHA DO TEMPO */}
            <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#FFAE00] bg-[#FFAE00]/10 px-3 py-1 rounded-full border border-[#FFAE00]/25 inline-block mb-3">
                        Escolha o seu objetivo
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                        Veja o passo a passo detalhado para o que você precisa
                    </h2>
                    <p className="mt-2.5 text-sm sm:text-base text-gray-400">
                        Cada etapa foi desenhada para ser rápida, segura e sem termos complicados.
                    </p>
                </div>

                {/* Grid com 3 Cards Verticais Creme */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-stretch">
                    
                    {/* CARD 1: COMPRADOR */}
                    <div
                        id="compre"
                        className="bg-gradient-to-b from-[#FFFDF8] via-[#FAF6EC] to-[#F4EBD9] rounded-2xl p-6 sm:p-8 border border-[#E3D6BF] shadow-2xl shadow-black/40 hover:border-[#FFAE00] transition-all flex flex-col justify-between"
                    >
                        <div>
                            {/* Topo */}
                            <div className="mb-6 pb-5 border-b border-[#E7DBC5]">
                                <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 mb-2.5">
                                    Para Bordadeiras e Empresas
                                </span>
                                <h3 className="text-2xl font-black text-amber-950 tracking-tight mb-2">
                                    1. Quero Comprar Matriz
                                </h3>
                                <p className="text-xs sm:text-[13px] text-gray-700 font-medium leading-relaxed">
                                    Você tem uma foto de logo, camiseta ou toalha e quer que um profissional transforme em arquivo para sua máquina.
                                </p>
                            </div>

                            {/* Timeline de Cima para Baixo */}
                            <div className="relative pl-7 space-y-6 my-6">
                                <div className="absolute left-[15px] top-3 bottom-5 w-0.5 bg-gradient-to-b from-[#D8C7A7] via-[#DFD1B7] to-[#D8C7A7]" />

                                {/* Passo 1 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <UploadCloud className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 01</span>
                                        <h4 className="text-sm font-bold text-gray-950">Envie a foto ou imagem</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Pode ser foto do celular, print do WhatsApp ou imagem da internet. Diga o tamanho em centímetros (ex: 10x10cm) e o tipo de tecido.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 2 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <Users className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 02</span>
                                        <h4 className="text-sm font-bold text-gray-950">Receba preços e prazos</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Vários programadores verão seu pedido e enviarão propostas com seus valores (ex: R$ 25, R$ 40). Você escolhe o que achar melhor.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 3 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 03</span>
                                        <h4 className="text-sm font-bold text-gray-950">Pague com Segurança</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Pague no PIX ou no Cartão de Crédito com facilidade. O dinheiro <strong className="text-gray-950">NÃO</strong> vai direto para o criador; ele fica guardado no BordadoHUB até você testar.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 4 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <FileCheck2 className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 04</span>
                                        <h4 className="text-sm font-bold text-gray-950">Baixe e borde na sua máquina</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            O programador entrega o arquivo (.PES, .DST, .JEF etc.). Você passa para o pen drive e coloca para bordar com toda a calma.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 5 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <Star className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 05</span>
                                        <h4 className="text-sm font-bold text-gray-950">Aprove ou peça ajustes</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Ficou perfeito? Clique em aprovar e o pagamento é liberado. Precisou de algum ajuste? O programador arruma de graça para você!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="pt-5 mt-4 border-t border-[#E7DBC5]">
                            <Link
                                href="/jobs/new"
                                className="w-full bg-gradient-to-r from-[#FFAE00] to-amber-500 hover:from-amber-500 hover:to-[#FFAE00] text-black font-black text-sm py-3.5 px-4 rounded-xl shadow-md shadow-[#FFAE00]/25 flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
                            >
                                <span>Pedir Minha Matriz (Grátis)</span>
                                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                            </Link>
                        </div>
                    </div>

                    {/* CARD 2: PROGRAMADOR */}
                    <div
                        id="produza"
                        className="bg-gradient-to-b from-[#FFFDF8] via-[#FAF6EC] to-[#F4EBD9] rounded-2xl p-6 sm:p-8 border border-[#E3D6BF] shadow-2xl shadow-black/40 hover:border-emerald-600 transition-all flex flex-col justify-between"
                    >
                        <div>
                            {/* Topo */}
                            <div className="mb-6 pb-5 border-b border-[#E7DBC5]">
                                <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300/80 mb-2.5">
                                    Para Programadores de Matrizes
                                </span>
                                <h3 className="text-2xl font-black text-emerald-950 tracking-tight mb-2">
                                    2. Quero Produzir & Lucrar
                                </h3>
                                <p className="text-xs sm:text-[13px] text-gray-700 font-medium leading-relaxed">
                                    Você sabe criar matrizes no Wilcom, Embird ou Pe-Design e quer clientes novos todo dia pagando no PIX sem calote.
                                </p>
                            </div>

                            {/* Timeline de Cima para Baixo */}
                            <div className="relative pl-7 space-y-6 my-6">
                                <div className="absolute left-[15px] top-3 bottom-5 w-0.5 bg-gradient-to-b from-[#D8C7A7] via-[#DFD1B7] to-[#D8C7A7]" />

                                {/* Passo 1 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <Search className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 01</span>
                                        <h4 className="text-sm font-bold text-gray-950">Acesse o Mural de Pedidos</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Entre na lista de trabalhos abertos. Lá você vê exatamente o que o cliente quer bordar, a foto e o tamanho necessário.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 2 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <Send className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 02</span>
                                        <h4 className="text-sm font-bold text-gray-950">Envie seu preço e prazo</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Você decide quanto cobrar! Diga seu valor (ex: R$ 35,00) e em quantas horas ou dias você entrega a matriz finalizada.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 3 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <DollarSign className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 03</span>
                                        <h4 className="text-sm font-bold text-gray-950">Trabalhe com Garantia</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Quando o cliente aceita, ele paga antes. O saldo fica garantido pelo BordadoHUB, então você tem 100% de certeza que vai receber.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 4 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <Layers className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 04</span>
                                        <h4 className="text-sm font-bold text-gray-950">Programe e faça o upload</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Crie a matriz no seu programa habitual, gere os formatos pedidos pelo cliente e suba os arquivos direto na tela do pedido.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 5 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <Coins className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 05</span>
                                        <h4 className="text-sm font-bold text-gray-950">Receba no seu PIX</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Assim que o cliente aprova o teste, o dinheiro é creditado no seu painel para você transferir direto para sua conta bancária.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="pt-5 mt-4 border-t border-[#E7DBC5]">
                            <Link
                                href="/jobs"
                                className="w-full bg-[#181B22] hover:bg-[#232732] text-white font-bold text-sm py-3.5 px-4 rounded-xl border border-black/15 shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
                            >
                                <span>Ver Mural & Pegar Pedidos</span>
                                <ArrowRight className="w-4 h-4 stroke-[2.5] text-[#FFAE00]" />
                            </Link>
                        </div>
                    </div>

                    {/* CARD 3: MARKETPLACE */}
                    <div
                        id="marketplace"
                        className="bg-gradient-to-b from-[#FFFDF8] via-[#FAF6EC] to-[#F4EBD9] rounded-2xl p-6 sm:p-8 border border-[#E3D6BF] shadow-2xl shadow-black/40 hover:border-indigo-600 transition-all flex flex-col justify-between"
                    >
                        <div>
                            {/* Topo */}
                            <div className="mb-6 pb-5 border-b border-[#E7DBC5]">
                                <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300/80 mb-2.5">
                                    Matrizes Prontas & Renda Passiva
                                </span>
                                <h3 className="text-2xl font-black text-indigo-950 tracking-tight mb-2">
                                    3. Marketplace de Matrizes
                                </h3>
                                <p className="text-xs sm:text-[13px] text-gray-700 font-medium leading-relaxed">
                                    Para quem quer comprar matrizes prontas com download imediato ou para criadores que querem vender seus arquivos prontos.
                                </p>
                            </div>

                            {/* Timeline de Cima para Baixo */}
                            <div className="relative pl-7 space-y-6 my-6">
                                <div className="absolute left-[15px] top-3 bottom-5 w-0.5 bg-gradient-to-b from-[#D8C7A7] via-[#DFD1B7] to-[#D8C7A7]" />

                                {/* Passo 1 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 01</span>
                                        <h4 className="text-sm font-bold text-gray-950">Escolha matrizes prontas</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Pesquise por categorias: batizado, flores, nomes, monogramas, datas especiais, marcas e personagens infantis.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 2 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <Download className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 02</span>
                                        <h4 className="text-sm font-bold text-gray-950">Baixe no mesmo segundo</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Confirmou o pagamento no PIX ou Cartão? O botão de download surge na sua tela na hora. Nada de esperar horas por e-mail ou aprovação manual.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 3 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <PackageCheck className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 03</span>
                                        <h4 className="text-sm font-bold text-gray-950">Pacotes ou Avulsas</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Compre apenas a matriz que precisa hoje por valor acessível, ou leve pacotes completos de alta demanda com grande desconto.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 4 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <Sparkles className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 04</span>
                                        <h4 className="text-sm font-bold text-gray-950">Venda seu acervo</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Se você é programador, coloque matrizes antigas e pacotes à venda. O site vende sozinho enquanto você descansa.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 5 */}
                                <div className="relative flex items-start gap-3.5 group">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center justify-center shrink-0 -ml-7 shadow-xs">
                                        <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-black text-[#A18861] uppercase tracking-wider">Passo 05</span>
                                        <h4 className="text-sm font-bold text-gray-950">Ganhos no piloto automático</h4>
                                        <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                            Cada download realizado credita o valor na sua carteira da plataforma com transparência total de taxas.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="pt-5 mt-4 border-t border-[#E7DBC5]">
                            <Link
                                href="/jobs"
                                className="w-full bg-gradient-to-r from-indigo-700 to-indigo-900 hover:from-indigo-800 hover:to-indigo-950 text-white font-black text-sm py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
                            >
                                <span>Acessar o Marketplace</span>
                                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. EXEMPLO PRÁTICO NA VIDA REAL (SIMULAÇÃO ULTRA DIDÁTICA) */}
            <section className="py-14 bg-[#14171E] border-y border-white/5">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#FFAE00] bg-[#FFAE00]/10 px-2.5 py-0.5 rounded-full border border-[#FFAE00]/20">
                            Exemplo Prático
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
                            Veja como acontece no mundo real
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">
                            Acompanhe como a Dona Maria resolveu a encomenda dela sem complicação:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-[#1A1D24] p-5 rounded-2xl border border-white/5 relative">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#FFAE00] flex items-center justify-center font-black text-lg mb-4 border border-[#FFAE00]/20">
                                1
                            </div>
                            <h3 className="font-bold text-white text-base mb-1">A Necessidade</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Dona Maria pegou uma encomenda de 20 camisetas de uma oficina mecânica. O cliente mandou a foto do logotipo pelo WhatsApp.
                            </p>
                            <div className="mt-3 bg-black/30 p-2.5 rounded-lg border border-white/5 text-[11px] text-amber-300 font-medium">
                                📱 &quot;Preciso bordar esse logo no peito, 9x7cm, em tecido piquet.&quot;
                            </div>
                        </div>

                        <div className="bg-[#1A1D24] p-5 rounded-2xl border border-white/5 relative">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#FFAE00] flex items-center justify-center font-black text-lg mb-4 border border-[#FFAE00]/20">
                                2
                            </div>
                            <h3 className="font-bold text-white text-base mb-1">O Pedido no Site</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Ela entrou no BordadoHUB, subiu a foto e em 15 minutos recebeu 3 propostas de programadores experientes.
                            </p>
                            <div className="mt-3 bg-black/30 p-2.5 rounded-lg border border-white/5 text-[11px] text-emerald-300 font-medium">
                                🤝 Ela escolheu a proposta de R$ 30,00 com entrega em 2 horas.
                            </div>
                        </div>

                        <div className="bg-[#1A1D24] p-5 rounded-2xl border border-white/5 relative">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#FFAE00] flex items-center justify-center font-black text-lg mb-4 border border-[#FFAE00]/20">
                                3
                            </div>
                            <h3 className="font-bold text-white text-base mb-1">O Resultado Perfeito</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                O arquivo chegou, ela colocou no pen drive, bordou a amostra e ficou perfeito sem arrebentar linha. Ela aprovou e todos saíram felizes!
                            </p>
                            <div className="mt-3 bg-black/30 p-2.5 rounded-lg border border-white/5 text-[11px] text-sky-300 font-medium">
                                ⭐ Dona Maria avaliou o criador com 5 estrelas!
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. OS 4 PILARES DA SEGURANÇA TOTAL */}
            <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Zero Risco Para Você
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
                        Por que é 100% seguro usar o BordadoHUB?
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-2">
                        Eliminamos todos os golpes, calotes e frustrações comuns em grupos de Facebook e WhatsApp.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-[#16191F] p-6 rounded-2xl border border-white/5 hover:border-[#FFAE00]/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-[#FFAE00]/10 text-[#FFAE00] flex items-center justify-center mb-4 border border-[#FFAE00]/20">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-white text-base mb-1.5">Pagamento Protegido</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            O dinheiro nunca vai direto para a conta do programador de início. Fica protegido e só é liberado depois que você aprova o bordado.
                        </p>
                    </div>

                    <div className="bg-[#16191F] p-6 rounded-2xl border border-white/5 hover:border-[#FFAE00]/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-white text-base mb-1.5">Ajustes Gratuitos</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Precisou afinar contorno, mudar compensação ou aumentar tamanho? O programador faz as revisões sem cobrar taxa extra.
                        </p>
                    </div>

                    <div className="bg-[#16191F] p-6 rounded-2xl border border-white/5 hover:border-[#FFAE00]/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4 border border-sky-500/20">
                            <HardDrive className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-white text-base mb-1.5">Todas as Máquinas</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Trabalhamos com todos os formatos existentes: Brother (.PES), Barudan/Tajima (.DST), Janome (.JEF), Bernina (.EXP) e outros.
                        </p>
                    </div>

                    <div className="bg-[#16191F] p-6 rounded-2xl border border-white/5 hover:border-[#FFAE00]/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-white text-base mb-1.5">PIX ou Cartão de Crédito</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Pague no PIX com confirmação imediata ou parcele no Cartão de Crédito com total segurança e praticidade.
                        </p>
                    </div>
                </div>
            </section>

            {/* 5. PERGUNTAS FREQUENTES (FAQ DIDÁTICO) */}
            <section id="faq" className="py-14 sm:py-20 bg-[#12151B] border-t border-white/5">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <div className="w-10 h-10 rounded-full bg-[#FFAE00]/10 text-[#FFAE00] flex items-center justify-center mx-auto mb-3 border border-[#FFAE00]/20">
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            Ainda ficou alguma dúvida?
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1.5">
                            Clique nas perguntas abaixo para ver as respostas explicadas de forma simples.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {faqs.map((faq, index) => {
                            const isOpen = faqOpen === index
                            return (
                                <div
                                    key={index}
                                    className="bg-[#181B22] rounded-xl border border-white/5 overflow-hidden transition-all duration-200"
                                >
                                    <button
                                        onClick={() => toggleFaq(index)}
                                        className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-[#FFAE00] transition-colors"
                                    >
                                        <span>{faq.q}</span>
                                        <ChevronDown
                                            className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                                                isOpen ? 'rotate-180 text-[#FFAE00]' : ''
                                            }`}
                                        />
                                    </button>
                                    {isOpen && (
                                        <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/5 bg-[#14171E]/60">
                                            {faq.a}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* 6. CTA FINAL DUPLO */}
            <section className="py-16 sm:py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="bg-gradient-to-r from-[#171A21] via-[#1F242F] to-[#171A21] border border-[#FFAE00]/30 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-[#FFAE00]/10 blur-[80px] rounded-full pointer-events-none" />

                    <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                        Pronto para transformar seus bordados?
                    </h2>
                    <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                        Junte-se a centenas de bordadeiras e programadores em todo o Brasil. Escolha como quer começar:
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/jobs/new"
                            className="w-full sm:w-auto bg-gradient-to-r from-[#FFAE00] to-yellow-400 hover:from-yellow-400 hover:to-[#FFAE00] text-black font-black text-base px-8 py-4 rounded-xl shadow-lg shadow-[#FFAE00]/25 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2"
                        >
                            <span>Quero Encomendar Matriz</span>
                            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                        </Link>

                        <Link
                            href="/jobs"
                            className="w-full sm:w-auto bg-[#14171E] hover:bg-[#1A1E27] text-white font-bold text-base px-8 py-4 rounded-xl border border-white/10 hover:border-[#FFAE00]/40 transition-all flex items-center justify-center gap-2"
                        >
                            <span>Sou Programador & Quero Produzir</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* 7. FOOTER */}
            <Footer />
        </div>
    )
}
