'use client'

import { useState, useEffect } from 'react'
import { X, Lock, Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowRight, Phone, Mail, User, Code2, Key, Check } from 'lucide-react'

interface ProgrammerAccessModalProps {
    isOpen: boolean
    onClose: () => void
    userProfile: {
        id: string
        name?: string
        email?: string
    } | null
    onProgrammerActivated: (updatedProfile: any) => void
    onConfigureProfile?: () => void
    defaultCode?: string
}

const COMMON_SOFTWARES = ['Wilcom', 'Embird', 'Tajima DGML', 'PE-Design', 'Pulse']

export default function ProgrammerAccessModal({
    isOpen,
    onClose,
    userProfile,
    onProgrammerActivated,
    onConfigureProfile,
    defaultCode = ''
}: ProgrammerAccessModalProps) {
    // Aba ativa: 'waitlist' (Não tenho convite) ou 'invite' (Já tenho um código)
    const [activeTab, setActiveTab] = useState<'waitlist' | 'invite'>('waitlist')

    // Campos da Waitlist
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [selectedSoftwares, setSelectedSoftwares] = useState<string[]>([])
    const [customSoftware, setCustomSoftware] = useState('')
    const [waitlistLoading, setWaitlistLoading] = useState(false)
    const [waitlistSuccess, setWaitlistSuccess] = useState(false)
    const [waitlistError, setWaitlistError] = useState<string | null>(null)

    // Campos de Ativação por Código
    const [code, setCode] = useState(defaultCode)
    const [activateLoading, setActivateLoading] = useState(false)
    const [activateSuccess, setActivateSuccess] = useState(false)
    const [activateError, setActivateError] = useState<string | null>(null)

    // Preenche dados do usuário logado e detecta código de convite
    useEffect(() => {
        if (userProfile) {
            if (userProfile.name) setName(userProfile.name)
            if (userProfile.email) setEmail(userProfile.email)
        }

        if (defaultCode) {
            setCode(defaultCode.toUpperCase().trim())
            setActiveTab('invite')
        }
    }, [userProfile, defaultCode])

    if (!isOpen) return null

    const formatWhatsapp = (val: string) => {
        const numbers = val.replace(/\D/g, '').slice(0, 11)
        if (numbers.length <= 2) return numbers
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
    }

    const toggleSoftware = (sw: string) => {
        setSelectedSoftwares(prev =>
            prev.includes(sw) ? prev.filter(s => s !== sw) : [...prev, sw]
        )
    }

    // Envio para lista de espera VIP
    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setWaitlistLoading(true)
        setWaitlistError(null)

        try {
            const rawPhone = whatsapp.replace(/\D/g, '')
            if (rawPhone.length < 10) {
                throw new Error('Por favor, informe seu WhatsApp completo com DDD.')
            }

            const allSoftwares = [...selectedSoftwares]
            if (customSoftware.trim()) {
                allSoftwares.push(customSoftware.trim())
            }

            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim() || userProfile?.name || 'Candidato Programador',
                    email: email.trim().toLowerCase() || userProfile?.email,
                    whatsapp: whatsapp.trim(),
                    softwares: allSoftwares.join(', ') || null
                })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao registrar solicitação.')
            }

            setWaitlistSuccess(true)
        } catch (err: any) {
            setWaitlistError(err.message || 'Erro ao registrar na lista de espera.')
        } finally {
            setWaitlistLoading(false)
        }
    }

    // Validação e ativação direta via código de convite
    const handleActivateWithCode = async (e: React.FormEvent) => {
        e.preventDefault()
        const cleanCode = code.toUpperCase().replace(/\s+/g, '')

        if (!cleanCode) {
            setActivateError('Por favor, digite o código de convite.')
            return
        }

        if (!userProfile?.id) {
            setActivateError('Usuário não autenticado. Por favor, recarregue a página.')
            return
        }

        setActivateLoading(true)
        setActivateError(null)

        try {
            // 1. Valida se o convite é legítimo e ativo
            const validateRes = await fetch('/api/invites/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: cleanCode })
            })

            const validateData = await validateRes.json()
            if (!validateRes.ok || !validateData.valid) {
                throw new Error(validateData.message || 'Código de convite inválido ou expirado.')
            }

            // 2. Atualiza o perfil ativando o modo programador
            const updateRes = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userProfile.id,
                    is_programmer: true,
                    invite_code: cleanCode
                })
            })

            const updateData = await updateRes.json()
            if (!updateRes.ok) {
                throw new Error(updateData.error || 'Falha ao ativar perfil de programador.')
            }

            setActivateSuccess(true)
            if (onProgrammerActivated) {
                onProgrammerActivated(updateData.user || { is_programmer: true, role: 'criador' })
            }
        } catch (err: any) {
            setActivateError(err.message || 'Falha na validação do convite.')
        } finally {
            setActivateLoading(false)
        }
    }

    const handleClose = () => {
        setWaitlistSuccess(false)
        setActivateSuccess(false)
        setWaitlistError(null)
        setActivateError(null)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 overflow-hidden text-[var(--text-primary)] max-h-[92vh] overflow-y-auto">
                {/* Botão Fechar */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--btn-glass-bg)] transition-all"
                    aria-label="Fechar"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Sucesso: Waitlist */}
                {waitlistSuccess ? (
                    <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/30 text-[var(--teal-text)] flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Solicitação Recebida!</h3>
                            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
                                Seus dados foram adicionados com sucesso à nossa <strong className="text-[var(--text-primary)]">Lista de Espera VIP de Programadores</strong>.
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                                Nossa equipe entrará em contato diretamente pelo seu WhatsApp para enviar seu convite individual assim que liberarmos a próxima turma!
                            </p>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleClose}
                                className="w-full min-h-[48px] py-3 px-4 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] active:scale-95 text-[var(--btn-primary-text)] font-semibold text-sm rounded-lg transition-all cursor-pointer"
                            >
                                Entendido, obrigado!
                            </button>
                        </div>
                    </div>
                ) : activateSuccess ? (
                    /* Sucesso: Ativação por Código */
                    <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/30 text-[var(--cobalt-text)] flex items-center justify-center mx-auto">
                            <Sparkles className="w-8 h-8" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Perfil de Programador Liberado!</h3>
                            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
                                Parabéns! Seu código de convite foi validado e sua conta agora tem permissão oficial para programar matrizes, enviar propostas e receber pagamentos.
                            </p>
                        </div>

                        <div className="pt-4 flex flex-col gap-2.5">
                            <button
                                onClick={() => {
                                    handleClose()
                                    if (onConfigureProfile) {
                                        onConfigureProfile()
                                    }
                                }}
                                className="w-full min-h-[48px] py-3 px-4 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] active:scale-95 text-[var(--btn-primary-text)] font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Configurar Portfólio & Informações Agora</span>
                                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Conteúdo Principal do Modal */
                    <div className="space-y-5">
                        {/* Header */}
                        <div className="text-left space-y-2 pr-8">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/25 text-[11px] font-bold text-[var(--cobalt-text)]">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Acesso Exclusivo a Programadores</span>
                            </div>

                            <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                                Produzir Matrizes no BordadoHUB
                            </h3>

                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                Para garantir alta qualidade e clientes recorrentes, o cadastro de programadores é feito por convite.
                            </p>
                        </div>

                        {/* Abas Alternadoras: Lista VIP vs Já Tenho Convite */}
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--border-hairline)]">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab('waitlist')
                                    setWaitlistError(null)
                                    setActivateError(null)
                                }}
                                className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                                    activeTab === 'waitlist'
                                        ? 'bg-[#2563EB] text-white border border-[#2563EB]'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                Quero um Convite
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab('invite')
                                    setWaitlistError(null)
                                    setActivateError(null)
                                }}
                                className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                                    activeTab === 'invite'
                                        ? 'bg-[#2563EB] text-white border border-[#2563EB]'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <Key className="w-3.5 h-3.5" />
                                Já Tenho Convite
                            </button>
                        </div>

                        {/* ABA 1: QUERO UM CONVITE (LISTA DE ESPERA VIP) */}
                        {activeTab === 'waitlist' && (
                            <form onSubmit={handleWaitlistSubmit} className="space-y-3.5 animate-in fade-in duration-150">
                                <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl p-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Cadastre seu WhatsApp abaixo. Nossa equipe avalia os inscritos e envia convites exclusivos semanalmente.
                                </div>

                                {/* Nome (Preenchido) */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-[var(--cobalt-text)]" />
                                        Seu Nome
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ex: Carlos Silva"
                                        className="w-full min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
                                    />
                                </div>

                                {/* E-mail (Preenchido) */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-[var(--cobalt-text)]" />
                                        Seu E-mail
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="w-full min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
                                    />
                                </div>

                                {/* WhatsApp com DDD (Obrigatório) */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-[var(--cobalt-text)]" />
                                        WhatsApp com DDD (para envio do convite)
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
                                        placeholder="(11) 99999-9999"
                                        maxLength={15}
                                        className="w-full min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all font-mono"
                                    />
                                </div>

                                {/* Softwares que domina */}
                                <div className="space-y-1.5 pt-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                                        <Code2 className="w-3.5 h-3.5 text-[var(--cobalt-text)]" />
                                        Softwares que Você Utiliza
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {COMMON_SOFTWARES.map((sw) => {
                                            const isSelected = selectedSoftwares.includes(sw)
                                            return (
                                                <button
                                                    type="button"
                                                    key={sw}
                                                    onClick={() => toggleSoftware(sw)}
                                                    className={`min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-[#2563EB] text-white border border-[#2563EB] font-bold'
                                                            : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-hairline)] hover:border-[var(--border-glass)] hover:text-[var(--text-primary)]'
                                                    }`}
                                                >
                                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                    {sw}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <input
                                        type="text"
                                        value={customSoftware}
                                        onChange={(e) => setCustomSoftware(e.target.value)}
                                        placeholder="Outro software? Digite aqui..."
                                        className="w-full min-h-[44px] mt-1.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
                                    />
                                </div>

                                {waitlistError && (
                                    <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{waitlistError}</span>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={waitlistLoading}
                                        className="w-full min-h-[48px] py-3 px-4 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] active:scale-[0.99] text-[var(--btn-primary-text)] font-semibold text-xs sm:text-sm rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                    >
                                        {waitlistLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Registrando solicitação...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Solicitar Convite no WhatsApp</span>
                                                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="pt-1 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('invite')}
                                        className="min-h-[44px] inline-flex items-center justify-center px-3 text-xs text-[var(--text-secondary)] hover:text-[var(--cobalt-text)] transition-colors cursor-pointer"
                                    >
                                        Já possui um código? <strong className="underline ml-1">Ativar agora</strong>
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ABA 2: JÁ TENHO CONVITE (DIGITAÇÃO DO CÓDIGO) */}
                        {activeTab === 'invite' && (
                            <form onSubmit={handleActivateWithCode} className="space-y-4 animate-in fade-in duration-150">
                                <div className="bg-[var(--bg-surface-elevated)] border border-[#2563EB]/25 rounded-xl p-3.5 space-y-1">
                                    <div className="flex items-center gap-2 text-[var(--cobalt-text)] text-xs font-bold">
                                        <Key className="w-3.5 h-3.5" />
                                        <span>Insira seu Código de Convite</span>
                                    </div>
                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                        Digite o código de 8 dígitos que você recebeu para liberar instantaneamente seu perfil profissional.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Código de Convite
                                    </label>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => {
                                            setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))
                                            setActivateError(null)
                                        }}
                                        placeholder="EX: K8X2M9P4"
                                        maxLength={16}
                                        autoFocus
                                        className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-base text-center font-mono font-bold tracking-widest text-[var(--text-primary)] uppercase placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
                                    />
                                </div>

                                {activateError && (
                                    <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{activateError}</span>
                                    </div>
                                )}

                                <div className="pt-1">
                                    <button
                                        type="submit"
                                        disabled={activateLoading || !code.trim()}
                                        className="w-full min-h-[48px] py-3 px-4 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] active:scale-[0.99] text-[var(--btn-primary-text)] font-semibold text-xs sm:text-sm rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {activateLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Verificando e Ativando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                <span>Validar e Ativar Meu Acesso</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="pt-1 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('waitlist')}
                                        className="min-h-[44px] inline-flex items-center justify-center px-3 text-xs text-[var(--text-secondary)] hover:text-[var(--cobalt-text)] transition-colors cursor-pointer"
                                    >
                                        Não tem um código? <strong className="underline ml-1">Entrar na lista de espera</strong>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
