import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, Database, FileCheck } from 'lucide-react'

export const metadata = {
    title: 'Política de Privacidade | BordadoHUB',
    description: 'Política de Privacidade e Proteção de Dados do BordadoHUB em conformidade com a LGPD.',
}

export default function PrivacidadePage() {
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                        <Shield className="w-3.5 h-3.5" /> Proteção de Dados (LGPD)
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        Política de Privacidade
                    </h1>
                    <p className="mt-3 text-sm sm:text-base text-gray-400 max-w-2xl leading-relaxed">
                        Sua privacidade é nossa prioridade. Esta política detalha como tratamos, armazenamos e protegemos seus dados pessoais de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
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
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            1. Dados que Coletamos
                        </h2>
                        <p className="text-gray-400 mb-3">
                            Para o pleno funcionamento das funcionalidades da plataforma, podemos coletar as seguintes categorias de dados:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-gray-400">
                            <li><strong>Dados Cadastrais:</strong> Nome completo, endereço de e-mail, telefone (opcional) e foto de perfil / avatar.</li>
                            <li><strong>Dados de Acesso:</strong> Credenciais autenticadas criptografadas ou dados fornecidos via login social seguro (Google OAuth).</li>
                            <li><strong>Dados de Faturamento e Pagamento:</strong> Chave Pix (para saques de programadores), CPF/CNPJ quando exigido pela legislação fiscal e financeira para processamento bancário.</li>
                            <li><strong>Arquivos e Conteúdo:</strong> Imagens de referência enviadas para orçamentos, arquivos de matrizes enviados para teste ou venda no marketplace, e histórico de mensagens trocadas nos chats de pedidos.</li>
                        </ul>
                    </section>

                    {/* Section 2 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            2. Finalidade do Tratamento dos Dados
                        </h2>
                        <p className="text-gray-400 mb-3">
                            Utilizamos seus dados estritamente para:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-gray-400">
                            <li>Processar e intermediar pedidos de matrizes e pagamentos de forma segura.</li>
                            <li>Notificar você em tempo real sobre status de propostas, entregas e mensagens no chat.</li>
                            <li>Prevenir fraudes e garantir a segurança das transações financeiras.</li>
                            <li>Cumprir obrigações legais e regulatórias vigentes no Brasil.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            3. Compartilhamento Restrito com Terceiros
                        </h2>
                        <p className="text-gray-400 mb-3">
                            <strong>Nós não vendemos e nunca venderemos seus dados pessoais.</strong> O compartilhamento ocorre apenas com parceiros essenciais para a operação técnica da plataforma:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-gray-400">
                            <li><strong>Instituições de Pagamento:</strong> Asaas e Mercado Pago para liquidação de Pix, boletos e cartões.</li>
                            <li><strong>Infraestrutura de Banco de Dados:</strong> Supabase (com criptografia ponta a ponta e certificados SSL/TLS).</li>
                            <li><strong>Autoridades Públicas:</strong> Exclusivamente quando houver ordem judicial ou requisição legal formal fundamentada.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            4. Segurança e Armazenamento
                        </h2>
                        <p className="text-gray-400 mb-3">
                            Adotamos práticas modernas de segurança da informação:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-gray-400">
                            <li>Toda a comunicação entre seu dispositivo e o BordadoHUB é criptografada via HTTPS/TLS.</li>
                            <li>Senhas de acesso são protegidas por algoritmos de hash criptográfico e nunca são armazenadas em texto simples.</li>
                            <li>Dados de cartão de crédito não passam e não ficam salvos em nossos servidores, sendo processados diretamente pelo gateway bancário certificado PCI-DSS.</li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            5. Seus Direitos como Titular (LGPD)
                        </h2>
                        <p className="text-gray-400 mb-3">
                            Você tem o direito de solicitar a qualquer momento:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-gray-400">
                            <li>Confirmação da existência de tratamento e acesso aos seus dados.</li>
                            <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</li>
                            <li>Exclusão definitiva da sua conta e de dados pessoais associados (resguardados os prazos legais de guarda fiscal/financeira).</li>
                        </ul>
                    </section>

                    {/* Section 6 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            6. Conformidade com Serviços Google e Dados do Google OAuth
                        </h2>
                        <p className="text-gray-400 mb-3">
                            O <strong>BordadoHUB</strong> oferece a opção de autenticação simplificada através do Google Sign-In (OAuth). Em estrita conformidade com a <em>Google API Services User Data Policy</em> e os <em>Termos de Serviço de APIs do Google</em>:
                        </p>
                        <ul className="space-y-2 list-disc list-inside text-gray-400 mb-3">
                            <li><strong>Finalidade Única:</strong> Os dados obtidos via Google (nome, endereço de e-mail e foto pública) são utilizados <strong>exclusivamente para autenticação, criação e identificação da sua conta</strong> de usuário no marketplace.</li>
                            <li><strong>Não Compartilhamento:</strong> Não compartilhamos, transferimos ou vendemos dados de contas do Google para terceiros, anunciantes ou redes de publicidade.</li>
                            <li><strong>Sem Uso de IA para Conteúdo Íntimo (AI NCII):</strong> O BordadoHUB é uma plataforma estritamente dedicada à confecção e comércio de arquivos técnicos de bordado computadorizado industrial/artesanal (.DST, .PES, etc.). Nossos sistemas e eventuais ferramentas não utilizam APIs do Google para gerar, modificar ou processar qualquer conteúdo íntimo não consensual (Non-Consensual Intimate Imagery - AI NCII) ou material adulto/ilegal.</li>
                        </ul>
                    </section>

                    {/* Section 7 */}
                    <section className="pt-6 border-t border-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            7. Encarregado de Dados (DPO) e Contato
                        </h2>
                        <p className="text-gray-400">
                            Para exercer qualquer um dos seus direitos ou esclarecer dúvidas sobre esta Política de Privacidade, envie sua solicitação para: <span className="text-emerald-400 font-semibold">contato@bordadohub.com</span>.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    )
}
