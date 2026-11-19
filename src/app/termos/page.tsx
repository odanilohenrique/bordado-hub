import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Scale } from 'lucide-react'

export const metadata = {
    title: 'Termos de Uso | BordadoHUB',
    description: 'Termos e Condições Gerais de Uso da plataforma BordadoHUB.',
}

export default function TermosPage() {
    return (
        <div className="w-full py-4 text-[var(--text-primary)]">
            <div className="max-w-4xl mx-auto">
                {/* Back to Home */}
                <div className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 rounded-lg text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar para o início
                    </Link>
                </div>

                {/* Header */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 sm:p-10 mb-8 relative overflow-hidden">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold uppercase tracking-wider mb-4">
                        <Scale className="w-3.5 h-3.5" /> Documento Legal
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight">
                        Termos e Condições Gerais de Uso
                    </h1>
                    <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                        Bem-vindo ao BordadoHUB. Ao acessar, cadastrar-se ou utilizar nossa plataforma, você concorda expressamente com os termos e regras descritos abaixo.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)] pt-6 border-t border-[var(--border-hairline)]">
                        <span>Última atualização: Outubro de 2026</span>
                        <span>•</span>
                        <span>Versão 2.1</span>
                    </div>
                </div>

                {/* Content Sections */}
                <div className="space-y-8 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 sm:p-10 text-sm leading-relaxed text-[var(--text-secondary)]">
                    
                    {/* Section 1 */}
                    <section>
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] shrink-0" />
                            1. O Que é o BordadoHUB
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            O <strong className="text-[var(--text-primary)]">BordadoHUB</strong> é uma plataforma tecnológica de intermediação digital que conecta clientes (pessoas físicas ou jurídicas que necessitam de arquivos computadorizados de bordado) a programadores de matrizes de bordado independentes (prestadores de serviços e criadores de conteúdo digital), bem como provê um <strong className="text-[var(--text-primary)]">Marketplace</strong> para compra e venda de matrizes prontas.
                        </p>
                        <p className="text-[var(--text-secondary)]">
                            O BordadoHUB não produz diretamente matrizes por conta própria, atuando como viabilizador tecnológico, intermediador de propostas, provedor de infraestrutura de pagamentos e custódia de segurança (garantia).
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] shrink-0" />
                            2. Cadastro e Responsabilidades da Conta
                        </h2>
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-secondary)]">
                            <li>O usuário deve ter capacidade civil legal (maior de 18 anos ou emancipado) para contratar ou prestar serviços.</li>
                            <li>As informações cadastrais (nome, e-mail, dados de contato e faturamento) devem ser exatas, verdadeiras e atualizadas.</li>
                            <li>A senha e credenciais de acesso são estritamente pessoais e intransferíveis, cabendo ao usuário a total responsabilidade por qualquer atividade realizada sob sua conta.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] shrink-0" />
                            3. Fluxo de Pedidos Sob Encomenda e Garantia de 24 Horas
                        </h2>
                        <div className="bg-[var(--bg-surface-elevated)] border border-[#2563EB]/25 rounded-2xl p-5 mb-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-[#2563EB] dark:text-[#60A5FA] mb-2">
                                <ShieldCheck className="w-4 h-4" /> Sistema de Custódia Segura (Escrow)
                            </div>
                            <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
                                Para proteção mútua, o pagamento do cliente é retido com segurança na plataforma e somente é transferido ao programador após a aprovação da matriz ou após o prazo de 24 horas de teste sem solicitação de revisão.
                            </p>
                        </div>
                        <ul className="space-y-2.5 text-[var(--text-secondary)]">
                            <li><strong className="text-[var(--text-primary)]">Entrega e Teste:</strong> Uma vez que o programador envia o arquivo (.DST, .PES, .JEF, etc.), o cliente possui até <strong className="text-[var(--text-primary)]">24 horas corridas</strong> para realizar o teste de bordado em sua máquina física.</li>
                            <li><strong className="text-[var(--text-primary)]">Taxa de Intermediação:</strong> O BordadoHub aplica uma taxa de intermediação de 10% sobre o valor da proposta, descontada exclusivamente do repasse ao produtor (garantindo 90% de recebimento líquido). O comprador não paga nenhuma taxa adicional sobre o valor acordado.</li>
                            <li><strong className="text-[var(--text-primary)]">Solicitação de Ajustes:</strong> Caso a matriz apresente falhas técnicas de bordado (como cortes excessivos, repuxo ou quebra de agulha), o cliente pode solicitar ajustes fundamentados através do sistema antes da aprovação final.</li>
                            <li><strong className="text-[var(--text-primary)]">Finalização Automática:</strong> Não havendo manifestação ou solicitação de revisão no prazo de 24 horas após a entrega, o pedido é finalizado automaticamente e o saldo liberado ao programador.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] shrink-0" />
                            4. Marketplace e Lojinhas de Matrizes
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            No Marketplace, criadores podem disponibilizar matrizes individuais ou pacotes/coleções para aquisição e download imediato.
                        </p>
                        <div className="space-y-3 text-[var(--text-secondary)]">
                            <p>
                                <strong className="text-[var(--text-primary)]">Licença de Uso:</strong> A compra de uma matriz no marketplace confere ao comprador uma licença não exclusiva para confeccionar e comercializar peças físicas bordadas (camisetas, bonés, uniformes, toalhas, etc.). É <strong className="text-[var(--text-primary)]">terminantemente proibida</strong> a revenda, compartilhamento gratuito, redistribuição ou rateio do arquivo digital bruto.
                            </p>
                            <p>
                                <strong className="text-[var(--text-primary)]">Comissão da Plataforma:</strong> Sobre cada venda concluída no Marketplace, o BordadoHUB aplica uma participação da plataforma de <strong className="text-[var(--text-primary)]">15% (quinze por cento)</strong> sobre o valor da venda acrescida de <strong className="text-[var(--text-primary)]">R$ 1,00 (um real)</strong> referente ao custo operacional da transação PIX, repassando o valor líquido diretamente para a carteira virtual do criador.
                            </p>
                        </div>
                    </section>

                    {/* Section 5 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] shrink-0" />
                            5. Propriedade Intelectual e Direitos Autorais
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            O cliente e o criador declaram ter plenos direitos ou autorização sobre as marcas, logotipos e ilustrações enviadas para digitalização ou colocadas à venda.
                        </p>
                        <p className="text-[var(--text-secondary)]">
                            O BordadoHUB repudia a violação de direitos autorais e reserva-se o direito de suspender ou remover anúncios e contas que comprovadamente violem patentes, marcas registradas ou propriedade intelectual de terceiros.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] shrink-0" />
                            6. Cancelamento e Reembolsos
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            Pedidos sob encomenda podem ser cancelados com reembolso integral caso o programador não tenha iniciado ou ultrapasse excessivamente o prazo acordado sem justificativa. Para produtos digitais no marketplace com download liberado, o reembolso só é aplicável em caso de vício comprovado no arquivo que impossibilite o uso na máquina e que não possa ser corrigido pelo vendedor.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] shrink-0" />
                            7. Conteúdos Proibidos e Conformidade com APIs do Google
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            O <strong className="text-[var(--text-primary)]">BordadoHUB</strong> é uma plataforma profissional voltada exclusivamente para o setor têxtil e de bordado computadorizado. É expressamente proibido enviar, solicitar ou comercializar:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-secondary)] mb-3">
                            <li>Conteúdo sexualmente explícito, pornográfico, pedofilia ou imagens íntimas sem consentimento (AI NCII - Non-Consensual Intimate Imagery), em estrita conformidade com os Termos de Serviço da Google API.</li>
                            <li>Material de ódio, violência, discriminação ou promoção de atividades ilegais.</li>
                            <li>Arquivos maliciosos, scripts ou vírus sob pretexto de arquivos de bordado.</li>
                        </ul>
                        <p className="text-[var(--text-secondary)]">
                            O descumprimento resultará no banimento imediato da conta, cancelamento de saldos retidos e comunicação às autoridades legais pertinentes.
                        </p>
                    </section>

                    {/* Section 8 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] shrink-0" />
                            8. Contato e Suporte
                        </h2>
                        <p className="text-[var(--text-secondary)]">
                            Para qualquer dúvida, disputa ou esclarecimento relativo a estes termos, entre em contato através do e-mail oficial: <span className="text-[#2563EB] dark:text-[#60A5FA] font-semibold">contato@bordadohub.com</span>.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    )
}
