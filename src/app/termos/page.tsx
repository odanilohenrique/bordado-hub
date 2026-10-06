import Link from 'next/link'
import { FileText, ArrowLeft, ShieldCheck, Scale, CheckCircle2, AlertCircle } from 'lucide-react'

export const metadata = {
    title: 'Termos de Uso | BordadoHUB',
    description: 'Termos e Condições Gerais de Uso da plataforma BordadoHUB.',
}

export default function TermosPage() {
    return (
        <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Back to Home */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#FFAE00] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar para o início
                    </Link>
                </div>

                {/* Header */}
                <div className="bg-[#16191F] border border-white/5 rounded-3xl p-8 sm:p-10 mb-8 relative overflow-hidden shadow-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFAE00]/10 border border-[#FFAE00]/20 text-[#FFAE00] text-xs font-bold uppercase tracking-wider mb-4">
                        <Scale className="w-3.5 h-3.5" /> Documento Legal
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        Termos e Condições Gerais de Uso
                    </h1>
                    <p className="mt-3 text-sm sm:text-base text-gray-400 max-w-2xl leading-relaxed">
                        Bem-vindo ao BordadoHUB. Ao acessar, cadastrar-se ou utilizar nossa plataforma, você concorda expressamente com os termos e regras descritos abaixo.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-6 border-t border-white/5">
                        <span>Última atualização: Outubro de 2026</span>
                        <span>•</span>
                        <span>Versão 2.1</span>
                    </div>
                </div>

                {/* Content Sections */}
                <div className="space-y-8 bg-[#16191F]/50 border border-white/5 rounded-3xl p-6 sm:p-10 text-sm leading-relaxed text-gray-300">
                    
                    {/* Section 1 */}
                    <section>
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#FFAE00]" />
                            1. O Que é o BordadoHUB
                        </h2>
                        <p className="text-gray-400 mb-3">
                            O <strong>BordadoHUB</strong> é uma plataforma tecnológica de intermediação digital que conecta clientes (pessoas físicas ou jurídicas que necessitam de arquivos computadorizados de bordado) a programadores de matrizes de bordado independentes (prestadores de serviços e criadores de conteúdo digital), bem como provê um <strong>Marketplace</strong> para compra e venda de matrizes prontas.
                        </p>
                        <p className="text-gray-400">
                            O BordadoHUB não produz diretamente matrizes por conta própria, atuando como viabilizador tecnológico, intermediador de propostas, provedor de infraestrutura de pagamentos e custódia de segurança (garantia).
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#FFAE00]" />
                            2. Cadastro e Responsabilidades da Conta
                        </h2>
                        <ul className="space-y-2 list-disc list-inside text-gray-400">
                            <li>O usuário deve ter capacidade civil legal (maior de 18 anos ou emancipado) para contratar ou prestar serviços.</li>
                            <li>As informações cadastrais (nome, e-mail, dados de contato e faturamento) devem ser exatas, verdadeiras e atualizadas.</li>
                            <li>A senha e credenciais de acesso são estritamente pessoais e intransferíveis, cabendo ao usuário a total responsabilidade por qualquer atividade realizada sob sua conta.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#FFAE00]" />
                            3. Fluxo de Pedidos Sob Encomenda e Garantia de 24 Horas
                        </h2>
                        <div className="bg-[#0F1115] border border-[#FFAE00]/20 rounded-2xl p-5 mb-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-[#FFAE00] mb-2">
                                <ShieldCheck className="w-4 h-4" /> Sistema de Custódia Segura (Escrow)
                            </div>
                            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                Para proteção mútua, o pagamento do cliente é retido com segurança na plataforma e somente é transferido ao programador após a aprovação da matriz ou após o prazo de 24 horas de teste sem solicitação de revisão.
                            </p>
                        </div>
                        <ul className="space-y-2.5 text-gray-400">
                            <li><strong>Entrega e Teste:</strong> Uma vez que o programador envia o arquivo (.DST, .PES, .JEF, etc.), o cliente possui até <strong>24 horas corridas</strong> para realizar o teste de bordado em sua máquina física.</li>
                            <li><strong>Taxa de Intermediação:</strong> O BordadoHub aplica uma taxa de intermediação de 5% sobre cada venda concluída, cobrada de forma proporcional de ambas as partes: 5% adicionados ao total do comprador no checkout e 5% retidos da comissão do produtor no repasse (garantindo 95% de recebimento líquido).</li>
                            <li><strong>Solicitação de Ajustes:</strong> Caso a matriz apresente falhas técnicas de bordado (como cortes excessivos, repuxo ou quebra de agulha), o cliente pode solicitar ajustes fundamentados através do sistema antes da aprovação final.</li>
                            <li><strong>Finalização Automática:</strong> Não havendo manifestação ou solicitação de revisão no prazo de 24 horas após a entrega, o pedido é finalizado automaticamente e o saldo liberado ao programador.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#FFAE00]" />
                            4. Marketplace e Lojinhas de Matrizes
                        </h2>
                        <p className="text-gray-400 mb-3">
                            No Marketplace, criadores podem disponibilizar matrizes individuais ou pacotes/coleções para aquisição e download imediato.
                        </p>
                        <div className="space-y-3 text-gray-400">
                            <p>
                                <strong>Licença de Uso:</strong> A compra de uma matriz no marketplace confere ao comprador uma licença não exclusiva para confeccionar e comercializar peças físicas bordadas (camisetas, bonés, uniformes, toalhas, etc.). É <strong>terminantemente proibida</strong> a revenda, compartilhamento gratuito, redistribuição ou rateio do arquivo digital bruto.
                            </p>
                            <p>
                                <strong>Comissão da Plataforma:</strong> Sobre cada venda concluída no Marketplace, o BordadoHUB retém uma taxa de comissão de intermediação e custos operacionais previamente estipulada, repassando o valor líquido para a carteira virtual do criador.
                            </p>
                        </div>
                    </section>

                    {/* Section 5 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#FFAE00]" />
                            5. Propriedade Intelectual e Direitos Autorais
                        </h2>
                        <p className="text-gray-400 mb-3">
                            O cliente e o criador declaram ter plenos direitos ou autorização sobre as marcas, logotipos e ilustrações enviadas para digitalização ou colocadas à venda.
                        </p>
                        <p className="text-gray-400">
                            O BordadoHUB repudia a violação de direitos autorais e reserva-se o direito de suspender ou remover anúncios e contas que comprovadamente violem patentes, marcas registradas ou propriedade intelectual de terceiros.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#FFAE00]" />
                            6. Cancelamento e Reembolsos
                        </h2>
                        <p className="text-gray-400 mb-3">
                            Pedidos sob encomenda podem ser cancelados com reembolso integral caso o programador não tenha iniciado ou ultrapasse excessivamente o prazo acordado sem justificativa. Para produtos digitais no marketplace com download liberado, o reembolso só é aplicável em caso de vício comprovado no arquivo que impossibilite o uso na máquina e que não possa ser corrigido pelo vendedor.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#FFAE00]" />
                            7. Conteúdos Proibidos e Conformidade com APIs do Google
                        </h2>
                        <p className="text-gray-400 mb-3">
                            O <strong>BordadoHUB</strong> é uma plataforma profissional voltada exclusivamente para o setor têxtil e de bordado computadorizado. É expressamente proibido enviar, solicitar ou comercializar:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-gray-400 mb-3">
                            <li>Conteúdo sexualmente explícito, pornográfico, pedofilia ou imagens íntimas sem consentimento (AI NCII - Non-Consensual Intimate Imagery), em estrita conformidade com os Termos de Serviço da Google API.</li>
                            <li>Material de ódio, violência, discriminação ou promoção de atividades ilegais.</li>
                            <li>Arquivos maliciosos, scripts ou vírus sob pretexto de arquivos de bordado.</li>
                        </ul>
                        <p className="text-gray-400">
                            O descumprimento resultará no banimento imediato da conta, cancelamento de saldos retidos e comunicação às autoridades legais pertinentes.
                        </p>
                    </section>

                    {/* Section 8 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#FFAE00]" />
                            8. Contato e Suporte
                        </h2>
                        <p className="text-gray-400">
                            Para qualquer dúvida, disputa ou esclarecimento relativo a estes termos, entre em contato através do e-mail oficial: <span className="text-[#FFAE00] font-semibold">contato@bordadohub.com</span>.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    )
}
