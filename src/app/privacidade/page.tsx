import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const metadata = {
    title: 'Política de Privacidade | BordadoHUB',
    description: 'Política de Privacidade e Proteção de Dados do BordadoHUB em conformidade com a LGPD.',
}

export default function PrivacidadePage() {
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D9488]/10 border border-[#0D9488]/20 text-[#0F766E] dark:text-[#14B8A6] text-xs font-semibold uppercase tracking-wider mb-4">
                        <Shield className="w-3.5 h-3.5" /> Proteção de Dados (LGPD)
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight">
                        Política de Privacidade
                    </h1>
                    <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                        Sua privacidade é nossa prioridade. Esta política detalha como tratamos, armazenamos e protegemos seus dados pessoais de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
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
                            <span className="w-2 h-2 rounded-full bg-[#0D9488] dark:bg-[#14B8A6] shrink-0" />
                            1. Dados que Coletamos
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            Para o pleno funcionamento das funcionalidades da plataforma, podemos coletar as seguintes categorias de dados:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-secondary)]">
                            <li><strong className="text-[var(--text-primary)]">Dados Cadastrais:</strong> Nome completo, endereço de e-mail, telefone (opcional) e foto de perfil / avatar.</li>
                            <li><strong className="text-[var(--text-primary)]">Dados de Acesso:</strong> Credenciais autenticadas criptografadas ou dados fornecidos via login social seguro (Google OAuth).</li>
                            <li><strong className="text-[var(--text-primary)]">Dados de Faturamento e Pagamento:</strong> Chave Pix (para saques de programadores), CPF/CNPJ quando exigido pela legislação fiscal e financeira para processamento bancário.</li>
                            <li><strong className="text-[var(--text-primary)]">Arquivos e Conteúdo:</strong> Imagens de referência enviadas para orçamentos, arquivos de matrizes enviados para teste ou venda no marketplace, e histórico de mensagens trocadas nos chats de pedidos.</li>
                        </ul>
                    </section>

                    {/* Section 2 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#0D9488] dark:bg-[#14B8A6] shrink-0" />
                            2. Finalidade do Tratamento dos Dados
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            Utilizamos seus dados estritamente para:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-secondary)]">
                            <li>Processar e intermediar pedidos de matrizes e pagamentos de forma segura.</li>
                            <li>Notificar você em tempo real sobre status de propostas, entregas e mensagens no chat.</li>
                            <li>Prevenir fraudes e garantir a segurança das transações financeiras.</li>
                            <li>Cumprir obrigações legais e regulatórias vigentes no Brasil.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#0D9488] dark:bg-[#14B8A6] shrink-0" />
                            3. Compartilhamento Restrito com Terceiros
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            <strong className="text-[var(--text-primary)]">Nós não vendemos e nunca venderemos seus dados pessoais.</strong> O compartilhamento ocorre apenas com parceiros essenciais para a operação técnica da plataforma:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-secondary)]">
                            <li><strong className="text-[var(--text-primary)]">Instituições de Pagamento:</strong> Asaas (instituição de pagamento regulada pelo Banco Central do Brasil) para processamento e liquidação segura de transações via PIX e cartão de crédito.</li>
                            <li><strong className="text-[var(--text-primary)]">Infraestrutura de Banco de Dados:</strong> Supabase (com criptografia ponta a ponta e certificados SSL/TLS).</li>
                            <li><strong className="text-[var(--text-primary)]">Autoridades Públicas:</strong> Exclusivamente quando houver ordem judicial ou requisição legal formal fundamentada.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#0D9488] dark:bg-[#14B8A6] shrink-0" />
                            4. Segurança e Armazenamento
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            Adotamos práticas modernas de segurança da informação:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-secondary)]">
                            <li>Toda a comunicação entre seu dispositivo e o BordadoHUB é criptografada via HTTPS/TLS.</li>
                            <li>Senhas de acesso são protegidas por algoritmos de hash criptográfico e nunca são armazenadas em texto simples.</li>
                            <li>Dados de cartão de crédito não passam e não ficam salvos em nossos servidores, sendo processados diretamente pelo gateway bancário certificado PCI-DSS.</li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#0D9488] dark:bg-[#14B8A6] shrink-0" />
                            5. Seus Direitos como Titular (LGPD)
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            Você tem o direito de solicitar a qualquer momento:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-secondary)]">
                            <li>Confirmação da existência de tratamento e acesso aos seus dados.</li>
                            <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</li>
                            <li>Exclusão definitiva da sua conta e de dados pessoais associados (resguardados os prazos legais de guarda fiscal/financeira).</li>
                        </ul>
                    </section>

                    {/* Section 6 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#0D9488] dark:bg-[#14B8A6] shrink-0" />
                            6. Conformidade com Serviços Google e Dados do Google OAuth
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-3">
                            O <strong className="text-[var(--text-primary)]">BordadoHUB</strong> oferece a opção de autenticação simplificada através do Google Sign-In (OAuth). Em estrita conformidade com a <em>Google API Services User Data Policy</em> e os <em>Termos de Serviço de APIs do Google</em>:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-secondary)] mb-3">
                            <li><strong className="text-[var(--text-primary)]">Finalidade Única:</strong> Os dados obtidos via Google (nome, endereço de e-mail e foto pública) são utilizados <strong className="text-[var(--text-primary)]">exclusivamente para autenticação, criação e identificação da sua conta</strong> de usuário no marketplace.</li>
                            <li><strong className="text-[var(--text-primary)]">Não Compartilhamento:</strong> Não compartilhamos, transferimos ou vendemos dados de contas do Google para terceiros, anunciantes ou redes de publicidade.</li>
                            <li><strong className="text-[var(--text-primary)]">Sem Uso de IA para Conteúdo Íntimo (AI NCII):</strong> O BordadoHUB é uma plataforma estritamente dedicada à confecção e comércio de arquivos técnicos de bordado computadorizado industrial/artesanal (.DST, .PES, etc.). Nossos sistemas e eventuais ferramentas não utilizam APIs do Google para gerar, modificar ou processar qualquer conteúdo íntimo não consensual (Non-Consensual Intimate Imagery - AI NCII) ou material adulto/ilegal.</li>
                        </ul>
                    </section>

                    {/* Section 7 */}
                    <section className="pt-6 border-t border-[var(--border-hairline)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#0D9488] dark:bg-[#14B8A6] shrink-0" />
                            7. Encarregado de Dados (DPO) e Contato
                        </h2>
                        <p className="text-[var(--text-secondary)]">
                            Para exercer qualquer um dos seus direitos ou esclarecer dúvidas sobre esta Política de Privacidade, envie sua solicitação para: <span className="text-[#0F766E] dark:text-[#14B8A6] font-semibold">contato@bordadohub.com</span>.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    )
}
