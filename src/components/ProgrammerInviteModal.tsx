'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Lock, Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowRight, Phone, Mail, User, Code2 } from 'lucide-react'

interface ProgrammerInviteModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function ProgrammerInviteModal({ isOpen, onClose }: ProgrammerInviteModalProps) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [softwares, setSoftwares] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const formatWhatsapp = (val: string) => {
        const numbers = val.replace(/\D/g, '').slice(0, 11)
        if (numbers.length <= 2) return numbers
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const rawPhone = whatsapp.replace(/\D/g, '')
            if (rawPhone.length < 10) {
                throw new Error('Informe um número de WhatsApp válido com DDD.')
            }

            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    whatsapp: whatsapp.trim(),
                    softwares: softwares.trim()
                })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao registrar na lista de espera.')
            }

            setSuccess(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleResetAndClose = () => {
        setName('')
        setEmail('')
        setWhatsapp('')
        setSoftwares('')
        setSuccess(false)
        setError(null)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-[#12151C] border border-[#FFAE00]/30 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-gray-100 max-h-[92vh] overflow-y-auto">
                {/* Glow decorativo suave */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFAE00]/10 rounded-full blur-3xl pointer-events-none -z-10" />

                {/* Botão Fechar */}
                <button
                    onClick={handleResetAndClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                    aria-label="Fechar"
                >
                    <X className="w-5 h-5" />
                </button>

                {success ? (
                    /* Tela de Sucesso */
                    <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Inscrição Confirmada!</h3>
                            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
                                Você já está na nossa <strong>Lista de Espera VIP de Programadores</strong>. Entraremos em contato diretamente pelo seu WhatsApp assim que liberarmos a próxima turma de convites!
                            </p>
                        </div>

                        <div className="pt-4 space-y-3">
                            <button
                                onClick={handleResetAndClose}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FFAE00] to-yellow-400 hover:brightness-110 active:scale-95 text-black font-black text-sm rounded-xl transition-all shadow-lg shadow-[#FFAE00]/15"
                            >
                                Entendido, obrigado!
                            </button>

                            <Link
                                href="/profile/me"
                                onClick={handleResetAndClose}
                                className="block text-xs text-gray-400 hover:text-[#FFAE00] transition-colors py-1"
                            >
                                Já recebeu um convite? Ative seu perfil aqui
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Formulário de Coleta da Waitlist */
                    <div className="space-y-5">
                        {/* Header do Modal */}
                        <div className="text-left space-y-2.5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFAE00]/10 border border-[#FFAE00]/30 text-[11px] font-bold text-[#FFAE00]">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Acesso Exclusivo por Convite</span>
                            </div>

                            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                Produção de Matrizes
                            </h3>

                            <div className="bg-[#0B0D11] border border-white/10 rounded-xl p-3.5 text-xs text-gray-300 space-y-1.5 leading-relaxed">
                                <p>
                                    Para garantir a máxima qualidade técnica aos clientes, o cadastro de novos programadores é <strong className="text-white">restrito a profissionais selecionados via convite individual</strong>.
                                </p>
                                <p className="text-[#FFAE00] font-semibold text-[11px] flex items-center gap-1.5 pt-0.5">
                                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                    Em breve abriremos novas vagas para o público geral!
                                </p>
                            </div>
                        </div>

                        {/* Formulário */}
                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            {/* Nome */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-[#FFAE00]" />
                                    Seu Nome Completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Carlos Silva"
                                    className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-[#FFAE00]" />
                                    Seu E-mail
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all"
                                />
                            </div>

                            {/* WhatsApp */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-[#FFAE00]" />
                                    WhatsApp com DDD (para envio do convite)
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
                                    placeholder="(11) 99999-9999"
                                    maxLength={15}
                                    className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all font-mono"
                                />
                            </div>

                            {/* Softwares (Opcional) */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <Code2 className="w-3.5 h-3.5 text-[#FFAE00]" />
                                    Softwares que domina (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={softwares}
                                    onChange={(e) => setSoftwares(e.target.value)}
                                    placeholder="Ex: Wilcom, Embird, Tajima DGML..."
                                    className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all"
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Botão de Envio */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FFAE00] to-yellow-400 hover:brightness-110 active:scale-[0.99] text-black font-black text-sm rounded-xl transition-all shadow-lg shadow-[#FFAE00]/15 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Cadastrando na lista...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Entrar na Lista de Espera</span>
                                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Link para quem já tem convite */}
                        <div className="pt-3 border-t border-white/5 text-center">
                            <p className="text-xs text-gray-400">
                                Já recebeu seu código de convite?{' '}
                                <Link
                                    href="/profile/me"
                                    onClick={handleResetAndClose}
                                    className="text-[#FFAE00] hover:underline font-bold"
                                >
                                    Ativar meu perfil de programador
                                </Link>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
