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
    HardDrive,
    CreditCard,
    Smartphone,
    Handshake
} from 'lucide-react'
import Footer from '@/components/Footer'
import ProgrammerInviteModal from '@/components/ProgrammerInviteModal'

export default function HowItWorksPage() {
    const [faqOpen, setFaqOpen] = useState<number | null>(null)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

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
        <div className="min-h-screen bg-transparent text-[var(--text-primary)]">
            {/* 1. HERO PRINCIPAL */}
            <section className="hero-bg-matte relative pt-12 pb-16 sm:pt-16 sm:pb-20 overflow-hidden border-b border-[var(--border-hairline)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider mb-5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>O Guia Passo a Passo Mais Simples da Internet</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-[var(--text-primary)] tracking-[-0.03em] leading-[1.08] max-w-4xl mx-auto mb-5">
                        Como funciona o{' '}
                        <span className="hero-h1-gradient">
                            BordadoHUB?
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed mb-8">
                        Explicado de um jeito tão simples que qualquer pessoa entende: seja para <strong className="text-[var(--text-primary)] font-semibold">encomendar uma matriz personalizada</strong>, para <strong className="text-[var(--text-primary)] font-semibold">faturar como programador</strong> ou para <strong className="text-[var(--text-primary)] font-semibold">comprar matrizes prontas</strong> com download na hora.
                    </p>

                    {/* Botões Rápidos de Acesso */}
                    <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto">
                        <a
                            href="#compre"
                            className="min-h-[44px] text-xs sm:text-sm font-semibold bg-[var(--btn-glass-bg)] hover:border-[#2563EB]/45 text-[var(--text-primary)] px-4 py-2.5 rounded-lg border border-[var(--border-glass)] transition-colors inline-flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                            <span>Quero Comprar Matriz</span>
                        </a>
                        <a
                            href="#produza"
                            className="min-h-[44px] text-xs sm:text-sm font-semibold bg-[var(--btn-glass-bg)] hover:border-[#0D9488]/45 text-[var(--text-primary)] px-4 py-2.5 rounded-lg border border-[var(--border-glass)] transition-colors inline-flex items-center gap-2"
                        >
                            <Layers className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0" />
                            <span>Quero Programar &amp; Lucrar</span>
                        </a>
                        <a
                            href="#marketplace"
                            className="min-h-[44px] text-xs sm:text-sm font-semibold bg-[var(--btn-glass-bg)] hover:border-[#2563EB]/45 text-[var(--text-primary)] px-4 py-2.5 rounded-lg border border-[var(--border-glass)] transition-colors inline-flex items-center gap-2"
                        >
                            <ShoppingBag className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                            <span>Marketplace de Matrizes</span>
                        </a>
                        <a
                            href="#faq"
                            className="min-h-[44px] text-xs sm:text-sm font-semibold bg-[var(--btn-glass-bg)] hover:border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2.5 rounded-lg border border-[var(--border-hairline)] transition-colors inline-flex items-center gap-2"
                        >
                            <HelpCircle className="w-4 h-4 shrink-0" />
                            <span>Perguntas Frequentes</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* 2. OS 3 GRANDES CARDS FOSCOS ESTILO FLOWNINJA COM LINHA DO TEMPO */}
            <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#0F766E] dark:text-[#14B8A6] bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/25 inline-block mb-3">
                        Escolha o seu objetivo
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-semibold hero-h1-gradient tracking-tight">
                        Veja o passo a passo detalhado para o que você precisa
                    </h2>
                    <p className="mt-2.5 text-sm sm:text-base text-[var(--text-secondary)]">
                        Cada etapa foi desenhada para ser rápida, segura e sem termos complicados.
                    </p>
                </div>

                {/* Grid com 3 Cards Verticais Foscos (Cobalto, Grafite, Teal) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-stretch">
                    
                    {/* CARD 1: COMPRADOR (Matte Cobalt) */}
                    <div
                        id="compre"
                        style={{ background: 'linear-gradient(160deg, #1E3A8A 0%, #0F172A 100%)' }}
                        className="rounded-2xl p-6 sm:p-8 border border-[var(--border-hairline)] flex flex-col justify-between text-white interactive-card"
                    >
                        <div>
                            {/* Topo */}
                            <div className="mb-6 pb-5 border-b border-white/15">
                                <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15 mb-2.5">
                                    Para Bordadeiras e Empresas
                                </span>
                                <h3 className="text-2xl font-semibold text-white tracking-tight mb-2">
                                    1. Quero Comprar Matriz
                                </h3>
                                <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed">
                                    Você tem uma foto de logo, camiseta ou toalha e quer que um profissional transforme em arquivo para sua máquina.
                                </p>
                            </div>

                            {/* Timeline de Cima para Baixo */}
                            <div className="relative pl-7 space-y-6 my-6">
                                <div className="absolute left-[15px] top-3 bottom-5 w-0.5 bg-white/15" />

                                {/* Passo 1 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#2563EB]/25 text-[#93C5FD] border border-[#60A5FA]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <UploadCloud className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#93C5FD] uppercase tracking-wider">Passo 01</span>
                                        <h4 className="text-sm font-semibold text-white">Envie a foto ou imagem</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Pode ser foto do celular, print do WhatsApp ou imagem da internet. Diga o tamanho em centímetros (ex: 10x10cm) e o tipo de tecido.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 2 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#2563EB]/25 text-[#93C5FD] border border-[#60A5FA]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <Users className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#93C5FD] uppercase tracking-wider">Passo 02</span>
                                        <h4 className="text-sm font-semibold text-white">Receba preços e prazos</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Vários programadores verão seu pedido e enviarão propostas com seus valores (ex: R$ 25, R$ 40). Você escolhe o que achar melhor.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 3 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#2563EB]/25 text-[#93C5FD] border border-[#60A5FA]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#93C5FD] uppercase tracking-wider">Passo 03</span>
                                        <h4 className="text-sm font-semibold text-white">Pague com Segurança</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Pague no PIX ou no Cartão de Crédito com facilidade. O dinheiro <strong className="text-white">NÃO</strong> vai direto para o criador; ele fica guardado no BordadoHUB até você testar.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 4 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#2563EB]/25 text-[#93C5FD] border border-[#60A5FA]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <FileCheck2 className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#93C5FD] uppercase tracking-wider">Passo 04</span>
                                        <h4 className="text-sm font-semibold text-white">Baixe e borde na sua máquina</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            O programador entrega o arquivo (.PES, .DST, .JEF etc.). Você passa para o pen drive e coloca para bordar com toda a calma.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 5 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#2563EB]/25 text-[#93C5FD] border border-[#60A5FA]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <Star className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#93C5FD] uppercase tracking-wider">Passo 05</span>
                                        <h4 className="text-sm font-semibold text-white">Aprove ou peça ajustes</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Ficou perfeito? Clique em aprovar e o pagamento é liberado. Precisou de algum ajuste? O programador arruma de graça para você!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="pt-5 mt-4 border-t border-white/15">
                            <Link
                                href="/jobs/new"
                                className="w-full min-h-[48px] bg-white hover:bg-slate-200 text-[#0A0F1D] font-semibold text-sm py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-center"
                            >
                                <span>Pedir Minha Matriz (Grátis)</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {/* CARD 2: PROGRAMADOR (Matte Graphite) */}
                    <div
                        id="produza"
                        style={{ background: 'linear-gradient(160deg, #1E293B 0%, #0A0F1D 100%)' }}
                        className="rounded-2xl p-6 sm:p-8 border border-[var(--border-hairline)] flex flex-col justify-between text-white interactive-card"
                    >
                        <div>
                            {/* Topo */}
                            <div className="mb-6 pb-5 border-b border-white/15">
                                <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15 mb-2.5">
                                    Para Programadores de Matrizes
                                </span>
                                <h3 className="text-2xl font-semibold text-white tracking-tight mb-2">
                                    2. Quero Produzir &amp; Lucrar
                                </h3>
                                <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed">
                                    Você sabe criar matrizes no Wilcom, Embird ou Pe-Design e quer clientes novos todo dia pagando no PIX sem calote.
                                </p>
                            </div>

                            {/* Timeline de Cima para Baixo */}
                            <div className="relative pl-7 space-y-6 my-6">
                                <div className="absolute left-[15px] top-3 bottom-5 w-0.5 bg-white/15" />

                                {/* Passo 1 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#3B82F6]/20 text-[#93C5FD] border border-[#3B82F6]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <Search className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#93C5FD] uppercase tracking-wider">Passo 01</span>
                                        <h4 className="text-sm font-semibold text-white">Acesse o Mural de Pedidos</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Entre na lista de trabalhos abertos. Lá você vê exatamente o que o cliente quer bordar, a foto e o tamanho necessário.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 2 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#3B82F6]/20 text-[#93C5FD] border border-[#3B82F6]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <Send className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#93C5FD] uppercase tracking-wider">Passo 02</span>
                                        <h4 className="text-sm font-semibold text-white">Envie seu preço e prazo</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Você decide quanto cobrar! Diga seu valor (ex: R$ 35,00) e em quantas horas ou dias você entrega a matriz finalizada.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 3 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#3B82F6]/20 text-[#93C5FD] border border-[#3B82F6]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <DollarSign className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#93C5FD] uppercase tracking-wider">Passo 03</span>
                                        <h4 className="text-sm font-semibold text-white">Trabalhe com Garantia</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Quando o cliente aceita, ele paga antes. O saldo fica garantido pelo BordadoHUB, então você tem 100% de certeza que vai receber.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 4 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#3B82F6]/20 text-[#93C5FD] border border-[#3B82F6]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <Layers className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#93C5FD] uppercase tracking-wider">Passo 04</span>
                                        <h4 className="text-sm font-semibold text-white">Programe e faça o upload</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Crie a matriz no seu programa habitual, gere os formatos pedidos pelo cliente e suba os arquivos direto na tela do pedido.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 5 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#3B82F6]/20 text-[#93C5FD] border border-[#3B82F6]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <Coins className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#93C5FD] uppercase tracking-wider">Passo 05</span>
                                        <h4 className="text-sm font-semibold text-white">Receba no seu PIX</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Assim que o cliente aprova o teste, o dinheiro é creditado no seu painel para você transferir direto para sua conta bancária.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="pt-5 mt-4 border-t border-white/15">
                            <Link
                                href="/jobs"
                                className="w-full min-h-[48px] bg-white/10 hover:bg-white/15 text-white font-semibold text-sm py-3 px-4 rounded-lg border border-white/20 flex items-center justify-center gap-2 transition-colors text-center"
                            >
                                <span>Ver Mural &amp; Pegar Pedidos</span>
                                <ArrowRight className="w-4 h-4 text-[#93C5FD]" />
                            </Link>
                        </div>
                    </div>

                    {/* CARD 3: MARKETPLACE (Matte Teal) */}
                    <div
                        id="marketplace"
                        style={{ background: 'linear-gradient(160deg, #115E59 0%, #0A191E 100%)' }}
                        className="rounded-2xl p-6 sm:p-8 border border-[var(--border-hairline)] flex flex-col justify-between text-white interactive-card"
                    >
                        <div>
                            {/* Topo */}
                            <div className="mb-6 pb-5 border-b border-white/15">
                                <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15 mb-2.5">
                                    Matrizes Prontas &amp; Renda Passiva
                                </span>
                                <h3 className="text-2xl font-semibold text-white tracking-tight mb-2">
                                    3. Marketplace de Matrizes
                                </h3>
                                <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed">
                                    Para quem quer comprar matrizes prontas com download imediato ou para criadores que querem vender seus arquivos prontos.
                                </p>
                            </div>

                            {/* Timeline de Cima para Baixo */}
                            <div className="relative pl-7 space-y-6 my-6">
                                <div className="absolute left-[15px] top-3 bottom-5 w-0.5 bg-white/15" />

                                {/* Passo 1 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#14B8A6]/20 text-[#5EEAD4] border border-[#14B8A6]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#5EEAD4] uppercase tracking-wider">Passo 01</span>
                                        <h4 className="text-sm font-semibold text-white">Escolha matrizes prontas</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Pesquise por categorias: batizado, flores, nomes, monogramas, datas especiais, marcas e personagens infantis.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 2 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#14B8A6]/20 text-[#5EEAD4] border border-[#14B8A6]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <Download className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#5EEAD4] uppercase tracking-wider">Passo 02</span>
                                        <h4 className="text-sm font-semibold text-white">Baixe no mesmo segundo</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Confirmou o pagamento no PIX ou Cartão? O botão de download surge na sua tela na hora. Nada de esperar horas por e-mail ou aprovação manual.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 3 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#14B8A6]/20 text-[#5EEAD4] border border-[#14B8A6]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <PackageCheck className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#5EEAD4] uppercase tracking-wider">Passo 03</span>
                                        <h4 className="text-sm font-semibold text-white">Pacotes ou Avulsas</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Compre apenas a matriz que precisa hoje por valor acessível, ou leve pacotes completos de alta demanda com grande desconto.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 4 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#14B8A6]/20 text-[#5EEAD4] border border-[#14B8A6]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <Sparkles className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#5EEAD4] uppercase tracking-wider">Passo 04</span>
                                        <h4 className="text-sm font-semibold text-white">Venda seu acervo</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Se você é programador, coloque matrizes antigas e pacotes à venda. O site vende sozinho enquanto você descansa.
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 5 */}
                                <div className="relative flex items-start gap-3.5">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#14B8A6]/20 text-[#5EEAD4] border border-[#14B8A6]/30 flex items-center justify-center shrink-0 -ml-7">
                                        <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-semibold text-[#5EEAD4] uppercase tracking-wider">Passo 05</span>
                                        <h4 className="text-sm font-semibold text-white">Ganhos no piloto automático</h4>
                                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                                            Cada download realizado credita o valor na sua carteira da plataforma com transparência total de taxas.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="pt-5 mt-4 border-t border-white/15">
                            <Link
                                href="/marketplace"
                                className="w-full min-h-[48px] bg-white hover:bg-slate-200 text-[#0A0F1D] font-semibold text-sm py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-center"
                            >
                                <span>Acessar o Marketplace</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. EXEMPLO PRÁTICO NA VIDA REAL (SIMULAÇÃO ULTRA DIDÁTICA) */}
            <section className="py-14 bg-[var(--bg-surface)] border-y border-[var(--border-hairline)]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 px-3 py-1 rounded-full border border-[#2563EB]/25 inline-block">
                            Exemplo Prático
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] mt-3 tracking-tight">
                            Veja como acontece no mundo real
                        </h2>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5">
                            Acompanhe como a Dona Maria resolveu a encomenda dela sem complicação:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-hairline)] relative flex flex-col">
                            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-semibold text-lg mb-4 border border-[#2563EB]/25">
                                1
                            </div>
                            <h3 className="font-semibold text-[var(--text-primary)] text-base mb-1">A Necessidade</h3>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1">
                                Dona Maria pegou uma encomenda de 20 camisetas de uma oficina mecânica. O cliente mandou a foto do logotipo pelo WhatsApp.
                            </p>
                            <div className="mt-4 flex items-start gap-2.5 bg-[var(--bg-surface-elevated)] p-3 rounded-lg border border-[var(--border-hairline)] text-xs text-[var(--text-primary)] font-medium">
                                <Smartphone className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] shrink-0 mt-0.5" />
                                <span>&quot;Preciso bordar esse logo no peito, 9x7cm, em tecido piquet.&quot;</span>
                            </div>
                        </div>

                        <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-hairline)] relative flex flex-col">
                            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-semibold text-lg mb-4 border border-[#2563EB]/25">
                                2
                            </div>
                            <h3 className="font-semibold text-[var(--text-primary)] text-base mb-1">O Pedido no Site</h3>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1">
                                Ela entrou no BordadoHUB, subiu a foto e em 15 minutos recebeu 3 propostas de programadores experientes.
                            </p>
                            <div className="mt-4 flex items-start gap-2.5 bg-[var(--bg-surface-elevated)] p-3 rounded-lg border border-[var(--border-hairline)] text-xs text-[var(--text-primary)] font-medium">
                                <Handshake className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0 mt-0.5" />
                                <span>Ela escolheu a proposta de R$ 30,00 com entrega em 2 horas.</span>
                            </div>
                        </div>

                        <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-hairline)] relative flex flex-col">
                            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-semibold text-lg mb-4 border border-[#2563EB]/25">
                                3
                            </div>
                            <h3 className="font-semibold text-[var(--text-primary)] text-base mb-1">O Resultado Perfeito</h3>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1">
                                O arquivo chegou, ela colocou no pen drive, bordou a amostra e ficou perfeito sem arrebentar linha. Ela aprovou e todos saíram felizes!
                            </p>
                            <div className="mt-4 flex items-start gap-2.5 bg-[var(--bg-surface-elevated)] p-3 rounded-lg border border-[var(--border-hairline)] text-xs text-[var(--text-primary)] font-medium">
                                <Star className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] fill-current shrink-0 mt-0.5" />
                                <span>Dona Maria avaliou o criador com 5 estrelas!</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. OS 4 PILARES DA SEGURANÇA TOTAL */}
            <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#0F766E] dark:text-[#14B8A6] bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/25 inline-block">
                        Zero Risco Para Você
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-semibold text-[var(--text-primary)] mt-3 tracking-tight">
                        Por que é 100% seguro usar o BordadoHUB?
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2">
                        Eliminamos todos os golpes, calotes e frustrações comuns em grupos de Facebook e WhatsApp.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-hairline)] hover:border-[var(--border-glass)] transition-all interactive-card">
                        <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center mb-4 border border-[#2563EB]/20">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h4 className="font-semibold text-[var(--text-primary)] text-base mb-1.5">Pagamento Protegido</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            O dinheiro nunca vai direto para a conta do programador de início. Fica protegido e só é liberado depois que você aprova o bordado.
                        </p>
                    </div>

                    <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-hairline)] hover:border-[var(--border-glass)] transition-all interactive-card">
                        <div className="w-12 h-12 rounded-xl bg-[#0D9488]/10 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center mb-4 border border-[#0D9488]/20">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h4 className="font-semibold text-[var(--text-primary)] text-base mb-1.5">Ajustes Gratuitos</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            Precisou afinar contorno, mudar compensação ou aumentar tamanho? O programador faz as revisões sem cobrar taxa extra.
                        </p>
                    </div>

                    <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-hairline)] hover:border-[var(--border-glass)] transition-all interactive-card">
                        <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center mb-4 border border-[#2563EB]/20">
                            <HardDrive className="w-6 h-6" />
                        </div>
                        <h4 className="font-semibold text-[var(--text-primary)] text-base mb-1.5">Todas as Máquinas</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            Trabalhamos com todos os formatos existentes: Brother (.PES), Barudan/Tajima (.DST), Janome (.JEF), Bernina (.EXP) e outros.
                        </p>
                    </div>

                    <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-hairline)] hover:border-[var(--border-glass)] transition-all interactive-card">
                        <div className="w-12 h-12 rounded-xl bg-[#0D9488]/10 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center mb-4 border border-[#0D9488]/20">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <h4 className="font-semibold text-[var(--text-primary)] text-base mb-1.5">PIX ou Cartão de Crédito</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            Pague no PIX com confirmação imediata ou parcele no Cartão de Crédito com total segurança e praticidade.
                        </p>
                    </div>
                </div>
            </section>

            {/* 5. PERGUNTAS FREQUENTES (FAQ DIDÁTICO) */}
            <section id="faq" className="py-14 sm:py-20 bg-[var(--bg-surface)] border-t border-[var(--border-hairline)]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center mx-auto mb-3 border border-[#2563EB]/20">
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
                            Ainda ficou alguma dúvida?
                        </h2>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5">
                            Clique nas perguntas abaixo para ver as respostas explicadas de forma simples.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {faqs.map((faq, index) => {
                            const isOpen = faqOpen === index
                            return (
                                <div
                                    key={index}
                                    className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-hairline)] overflow-hidden transition-colors"
                                >
                                    <button
                                        type="button"
                                        aria-expanded={isOpen}
                                        onClick={() => toggleFaq(index)}
                                        className="w-full min-h-[52px] px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[var(--text-primary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors cursor-pointer"
                                    >
                                        <span>{faq.q}</span>
                                        <ChevronDown
                                            className={`w-5 h-5 text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${
                                                isOpen ? 'rotate-180 text-[#2563EB] dark:text-[#60A5FA]' : ''
                                            }`}
                                        />
                                    </button>
                                    {isOpen && (
                                        <div className="px-5 pb-4 pt-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-hairline)] bg-[var(--bg-surface-elevated)]">
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
                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-3xl p-8 sm:p-12 relative overflow-hidden">
                    <div
                        aria-hidden="true"
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ background: 'linear-gradient(90deg, #2563EB 0%, #0D9488 100%)' }}
                    />

                    <h2 className="text-2xl sm:text-4xl font-semibold hero-h1-gradient tracking-tight mb-3">
                        Pronto para transformar seus bordados?
                    </h2>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 leading-relaxed">
                        Junte-se a centenas de bordadeiras e programadores em todo o Brasil. Escolha como quer começar:
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/jobs/new"
                            className="w-full sm:w-auto min-h-[48px] bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] font-semibold text-sm sm:text-base px-8 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <span>Quero Encomendar Matriz</span>
                            <ArrowRight className="w-5 h-5" />
                        </Link>

                        <button
                            type="button"
                            onClick={() => setIsInviteModalOpen(true)}
                            className="w-full sm:w-auto min-h-[48px] bg-[var(--btn-glass-bg)] hover:border-[#2563EB]/45 text-[var(--text-primary)] font-semibold text-sm sm:text-base px-8 py-3 rounded-lg border border-[var(--border-glass)] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>Sou Programador &amp; Quero Produzir</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Modal de Convite de Programador */}
            <ProgrammerInviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />

            {/* 7. FOOTER */}
            <Footer />
        </div>
    )
}
