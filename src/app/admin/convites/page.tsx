'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import { Key, Shield, Plus, Copy, Check, Users, Sparkles, AlertCircle, RefreshCw, Lock, Phone, Mail, MessageSquare, Link2, ExternalLink, CheckCircle2 } from 'lucide-react'

interface Invite {
    id: string
    code: string
    created_at: string
    used_at: string | null
    used_by: string | null
    max_uses: number
    current_uses: number
    active: boolean
}

interface WaitlistCandidate {
    id: string
    name: string
    email: string
    whatsapp: string
    softwares?: string | null
    created_at: string
    status: 'pendente' | 'convidado' | 'rejeitado'
}

export default function AdminInvitesPage() {
    const [adminSecret, setAdminSecret] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [activeTab, setActiveTab] = useState<'invites' | 'waitlist'>('invites')
    const [invites, setInvites] = useState<Invite[]>([])
    const [waitlist, setWaitlist] = useState<WaitlistCandidate[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)

    // Form para criar convite
    const [customCode, setCustomCode] = useState('')
    const [maxUses, setMaxUses] = useState(1)
    const [creating, setCreating] = useState(false)
    const [lastGeneratedInvite, setLastGeneratedInvite] = useState<{ code: string; url: string } | null>(null)
    const [linkCodeInput, setLinkCodeInput] = useState('')

    useEffect(() => {
        const savedSecret = sessionStorage.getItem('bh_admin_secret')
        if (savedSecret) {
            setAdminSecret(savedSecret)
            fetchData(savedSecret)
        }
    }, [])

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (!adminSecret.trim()) return
        fetchData(adminSecret.trim())
    }

    const fetchData = async (secret: string) => {
        setLoading(true)
        setError(null)
        try {
            // Busca convites e waitlist em paralelo
            const [invitesRes, waitlistRes] = await Promise.all([
                fetch('/api/invites', {
                    headers: { 'Authorization': `Bearer ${secret.trim()}` }
                }),
                fetch('/api/waitlist', {
                    headers: { 'Authorization': `Bearer ${secret.trim()}` }
                })
            ])

            const invitesData = await invitesRes.json()
            if (!invitesRes.ok) {
                throw new Error(invitesData.error || 'Falha ao autenticar ou buscar convites.')
            }

            const waitlistData = await waitlistRes.json()

            const list = invitesData.invites || []
            setInvites(list)
            setWaitlist(waitlistData.waitlist || [])
            if (list.length > 0) {
                setLinkCodeInput(prev => prev || list[0].code)
            }
            setIsAuthenticated(true)
            sessionStorage.setItem('bh_admin_secret', secret.trim())
        } catch (err: any) {
            setError(err.message)
            setIsAuthenticated(false)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        setError(null)

        try {
            const res = await fetch('/api/invites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminSecret.trim()}`
                },
                body: JSON.stringify({
                    code: customCode.trim() ? customCode.trim().toUpperCase() : undefined,
                    max_uses: maxUses
                })
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao gerar convite.')
            }

            const newCode = data.invite.code
            const newUrl = getInviteUrl(newCode)
            setLastGeneratedInvite({ code: newCode, url: newUrl })
            setLinkCodeInput(newCode)
            setCustomCode('')
            setMaxUses(1)
            fetchData(adminSecret)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setCreating(false)
        }
    }

    const copyToClipboard = (text: string, code: string) => {
        navigator.clipboard.writeText(text)
        setCopiedCode(code)
        setTimeout(() => setCopiedCode(null), 2500)
    }

    const getInviteUrl = (code: string) => {
        if (typeof window === 'undefined') return ''
        return `${window.location.origin}/profile/me?convite=${code}`
    }

    const shareOnWhatsApp = (code: string) => {
        const url = getInviteUrl(code)
        const text = encodeURIComponent(
            `Olá! Aqui é da equipe do BordadoHUB.\n\nSegue seu convite exclusivo para ativar seu perfil de programador:\n\nLink de ativação (código já aplicado):\n${url}\n\nCódigo: ${code}\n\nAo clicar no link, o código já fica preenchido e seu perfil de programador é ativado na hora. Seja bem-vindo!`
        )
        window.open(`https://wa.me/?text=${text}`, '_blank')
    }

    const openWhatsAppInvite = (candidate: WaitlistCandidate) => {
        const cleanPhone = candidate.whatsapp.replace(/\D/g, '')
        const text = encodeURIComponent(
            `Olá ${candidate.name}! Aqui é da equipe do BordadoHUB.\n\nVocê se cadastrou na nossa lista de espera de programadores. Temos uma vaga exclusiva para você!\n\nPara ativar seu perfil de programador, acesse o link:\nhttps://bordadohub.com/profile/me\n\nSeja bem-vindo!`
        )
        const url = `https://wa.me/55${cleanPhone.startsWith('55') ? cleanPhone.slice(2) : cleanPhone}?text=${text}`
        window.open(url, '_blank')
    }

    return (
        <div className="min-h-screen bg-transparent text-[var(--text-primary)] flex flex-col">
            {/* Header */}
            <header className="border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/85 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="inline-flex items-center">
                            <BrandLogo variant="horizontal" className="h-6 sm:h-7 w-auto" priority />
                        </Link>
                        <span className="hidden sm:inline-block text-xs uppercase tracking-widest font-bold px-2.5 py-1 rounded-md bg-[#2563EB]/10 text-[var(--cobalt-text)] border border-[#2563EB]/25">
                            Painel de Convites
                        </span>
                    </div>

                    {isAuthenticated && (
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('bh_admin_secret')
                                setIsAuthenticated(false)
                                setAdminSecret('')
                                setInvites([])
                                setWaitlist([])
                            }}
                            className="min-h-[44px] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3.5 py-2 rounded-lg bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] transition-all cursor-pointer"
                        >
                            Sair do Painel
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-12">
                {!isAuthenticated ? (
                    /* Tela de Login com Senha Master */
                    <div className="max-w-md mx-auto pt-12">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 sm:p-8 shadow-xl">
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/25 text-[var(--cobalt-text)] flex items-center justify-center mx-auto mb-3">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <h1 className="text-lg font-bold text-[var(--text-primary)]">Acesso ao Painel de Convites</h1>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    Insira sua chave de administrador para gerenciar o acesso exclusivo de programadores e a lista de espera.
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">
                                        Chave Master (ADMIN_SECRET)
                                    </label>
                                    <input
                                        type="password"
                                        value={adminSecret}
                                        onChange={(e) => setAdminSecret(e.target.value)}
                                        placeholder="Digite a chave secreta..."
                                        required
                                        className="w-full min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full min-h-[48px] py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] active:scale-95 text-[var(--btn-primary-text)] font-semibold text-sm rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Verificando...
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-4 h-4" />
                                            Entrar no Painel
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* Painel Completo de Convites */
                    <div className="space-y-8">
                        {/* Header de Estatísticas e Abas */}
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                                        <Key className="w-5 h-5 text-[var(--cobalt-text)]" />
                                        Gestão de Programadores & Convites
                                    </h1>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                                        Controle quem tem permissão para programar matrizes e atenda aos candidatos da lista de espera.
                                    </p>
                                </div>

                                <button
                                    onClick={() => fetchData(adminSecret)}
                                    disabled={loading}
                                    className="self-start sm:self-auto min-h-[44px] px-4 py-2 bg-[var(--btn-glass-bg)] hover:border-[#2563EB]/40 border border-[var(--border-glass)] rounded-lg text-xs font-semibold text-[var(--text-primary)] transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    Atualizar Dados
                                </button>
                            </div>

                            {/* Abas */}
                            <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pt-2 overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab('invites')}
                                    className={`min-h-[44px] px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                                        activeTab === 'invites'
                                            ? 'border-[#2563EB] dark:border-[#3B82F6] text-[var(--text-primary)] bg-[var(--bg-surface-elevated)]'
                                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    <Key className="w-3.5 h-3.5 text-[var(--cobalt-text)]" />
                                    <span>Códigos de Convite ({invites.length})</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('waitlist')}
                                    className={`min-h-[44px] px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                                        activeTab === 'waitlist'
                                            ? 'border-[#2563EB] dark:border-[#3B82F6] text-[var(--text-primary)] bg-[var(--bg-surface-elevated)]'
                                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    <Users className="w-3.5 h-3.5 text-[var(--teal-text)]" />
                                    <span>Lista de Espera ({waitlist.length})</span>
                                    {waitlist.length > 0 && (
                                        <span className="w-2 h-2 rounded-full bg-[#0D9488] dark:bg-[#14B8A6]" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {activeTab === 'invites' ? (
                            <>
                                {/* Formulário de Criação de Convite */}
                                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 shadow-sm">
                                    <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2 mb-4">
                                        <Sparkles className="w-4 h-4 text-[var(--cobalt-text)]" />
                                        Gerar Novo Convite
                                    </h2>

                                    <form onSubmit={handleCreateInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                                Código Personalizado (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={customCode}
                                                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                                                placeholder="Ex: WILCOM-PRO ou em branco para automático"
                                                className="w-full min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all uppercase font-mono"
                                            />
                                            <p className="text-[10px] text-[var(--text-secondary)] mt-1">Se vazio, gera código aleatório de 8 letras.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                                Limite de Usos
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={maxUses}
                                                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                                                className="w-full min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
                                            />
                                            <p className="text-[10px] text-[var(--text-secondary)] mt-1">1 = uso individual descartável.</p>
                                        </div>

                                        <div className="flex items-end">
                                            <button
                                                type="submit"
                                                disabled={creating}
                                                className="w-full min-h-[48px] py-2.5 px-4 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] active:scale-95 text-[var(--btn-primary-text)] font-semibold text-xs rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                {creating ? (
                                                    <>
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        Gerando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4" />
                                                        Gerar Convite
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>

                                    {lastGeneratedInvite && (
                                        <div className="mt-5 p-5 rounded-2xl bg-[#2563EB]/5 border border-[#2563EB]/25 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-2 mb-2 text-[var(--teal-text)] text-sm font-bold">
                                                <CheckCircle2 className="w-5 h-5 text-[var(--teal-text)]" />
                                                <span>Convite <span className="font-mono text-[var(--text-primary)] underline">{lastGeneratedInvite.code}</span> gerado com sucesso!</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
                                                O link abaixo já possui o código aplicado. Ao clicar, o cliente já abre a tela com o convite ativado:
                                            </p>
                                            
                                            {/* Campo com o link gerado */}
                                            <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={lastGeneratedInvite.url}
                                                    className="flex-1 min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[#2563EB]/30 rounded-xl px-4 py-2.5 text-xs text-[var(--cobalt-text)] font-mono select-all focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(lastGeneratedInvite.url, 'created_link')}
                                                    className="min-h-[48px] px-4 py-2.5 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] active:scale-95 text-[var(--btn-primary-text)] font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                                                >
                                                    {copiedCode === 'created_link' ? (
                                                        <>
                                                            <Check className="w-3.5 h-3.5" />
                                                            <span>Link Copiado!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3.5 h-3.5" />
                                                            <span>Copiar Link Completo</span>
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(lastGeneratedInvite.code, 'created_code')}
                                                    className="min-h-[44px] px-3.5 py-2.5 bg-[var(--btn-glass-bg)] hover:border-[#2563EB]/40 text-[var(--text-primary)] border border-[var(--border-glass)] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                                                    title="Copiar apenas o código"
                                                >
                                                    {copiedCode === 'created_code' ? <Check className="w-3.5 h-3.5 text-[var(--teal-text)]" /> : <Key className="w-3.5 h-3.5" />}
                                                    <span>{copiedCode === 'created_code' ? 'Código Copiado!' : 'Copiar Código'}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => shareOnWhatsApp(lastGeneratedInvite.code)}
                                                    className="min-h-[44px] px-3.5 py-2.5 bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[var(--teal-text)] border border-[#0D9488]/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    <span>WhatsApp</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="mt-4 p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card: Gerador e Copiador de Link com Código Aplicado */}
                                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 shadow-sm space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                                                <Link2 className="w-4 h-4 text-[var(--cobalt-text)]" />
                                                Gerador de Link com Código Aplicado
                                            </h2>
                                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                                                Escolha ou digite um código para gerar o link direto. O cliente clica no link e o código já fica aplicado automaticamente!
                                            </p>
                                        </div>
                                        {invites.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[11px] text-[var(--text-secondary)] font-semibold shrink-0">Selecionar convite existente:</span>
                                                <select
                                                    value={linkCodeInput}
                                                    onChange={(e) => setLinkCodeInput(e.target.value)}
                                                    className="min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-3 py-2 text-xs text-[var(--cobalt-text)] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] font-mono font-bold"
                                                >
                                                    <option value="">-- Escolha um convite --</option>
                                                    {invites.map(inv => (
                                                        <option key={inv.id} value={inv.code}>
                                                            {inv.code} ({inv.current_uses}/{inv.max_uses} usos)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-1">
                                        <div className="lg:col-span-4">
                                            <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                                                Código do Convite
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={linkCodeInput}
                                                    onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                                                    placeholder="Digite ou escolha um código..."
                                                    className="flex-1 min-w-0 min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] uppercase font-mono font-bold"
                                                />
                                                {linkCodeInput.trim() && (
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(linkCodeInput.trim(), 'generator_code_only')}
                                                        className="min-h-[44px] px-3 py-2 rounded-lg bg-[var(--btn-glass-bg)] hover:border-[#2563EB]/40 border border-[var(--border-glass)] text-xs text-[var(--text-primary)] flex items-center gap-1.5 font-semibold shrink-0 cursor-pointer"
                                                        title="Copiar apenas o código"
                                                    >
                                                        {copiedCode === 'generator_code_only' ? <Check className="w-3.5 h-3.5 text-[var(--teal-text)]" /> : <Copy className="w-3.5 h-3.5" />}
                                                        <span>{copiedCode === 'generator_code_only' ? 'Copiado!' : 'Copiar'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="lg:col-span-8">
                                            <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                                                Link Direto para Enviar ao Cliente (Código já Aplicado)
                                            </label>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={linkCodeInput.trim() ? getInviteUrl(linkCodeInput.trim()) : 'Selecione ou digite um código ao lado para visualizar o link...'}
                                                    className="flex-1 min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[#2563EB]/30 rounded-xl px-4 py-2.5 text-xs text-[var(--cobalt-text)] font-mono select-all focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={!linkCodeInput.trim()}
                                                    onClick={() => copyToClipboard(getInviteUrl(linkCodeInput.trim()), 'generator_full_link')}
                                                    className="min-h-[48px] px-5 py-2.5 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] active:scale-95 text-[var(--btn-primary-text)] font-semibold text-xs rounded-lg transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                                                >
                                                    {copiedCode === 'generator_full_link' ? (
                                                        <>
                                                            <Check className="w-4 h-4" />
                                                            <span>Link Copiado!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-4 h-4" />
                                                            <span>Copiar Link Completo</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {linkCodeInput.trim() && (
                                        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--border-hairline)]">
                                            <span className="text-xs text-[var(--text-secondary)]">Opções de compartilhamento:</span>
                                            <button
                                                type="button"
                                                onClick={() => shareOnWhatsApp(linkCodeInput.trim())}
                                                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[var(--teal-text)] border border-[#0D9488]/30 transition-all active:scale-95 cursor-pointer"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                <span>Enviar pelo WhatsApp</span>
                                            </button>
                                            <a
                                                href={getInviteUrl(linkCodeInput.trim())}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--btn-glass-bg)] hover:border-[#2563EB]/40 text-[var(--text-primary)] border border-[var(--border-glass)] transition-all"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 text-[var(--cobalt-text)]" />
                                                <span>Testar Link (Nova Aba)</span>
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Tabela de Convites */}
                                <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-[var(--border-hairline)]">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                                            <Key className="w-4 h-4 text-[var(--cobalt-text)]" />
                                            Lista de Convites ({invites.length})
                                        </h3>
                                    </div>

                                    {invites.length === 0 ? (
                                        <div className="py-12 text-center text-[var(--text-secondary)] text-xs">
                                            Nenhum código de convite gerado ainda. Use o formulário acima para criar o primeiro!
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-hairline)]">
                                                    <tr>
                                                        <th className="py-3 px-6 font-semibold">Código</th>
                                                        <th className="py-3 px-6 font-semibold">Status</th>
                                                        <th className="py-3 px-6 font-semibold">Usos</th>
                                                        <th className="py-3 px-6 font-semibold">Usado Por</th>
                                                        <th className="py-3 px-6 font-semibold">Data Criação</th>
                                                        <th className="py-3 px-6 font-semibold text-right">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--border-hairline)]">
                                                    {invites.map((inv) => {
                                                        const isExhausted = inv.current_uses >= inv.max_uses || !inv.active
                                                        const inviteUrl = getInviteUrl(inv.code)

                                                        return (
                                                            <tr key={inv.id} className="hover:bg-[var(--bg-surface-elevated)]/60 transition-colors">
                                                                <td className="py-3 px-6 font-mono text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                                                    <span>{inv.code}</span>
                                                                    <button
                                                                        onClick={() => copyToClipboard(inv.code, `code_${inv.id}`)}
                                                                        title="Copiar código"
                                                                        aria-label="Copiar código"
                                                                        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[var(--btn-glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                                                    >
                                                                        {copiedCode === `code_${inv.id}` ? (
                                                                            <Check className="w-4 h-4 text-[var(--teal-text)]" />
                                                                        ) : (
                                                                            <Copy className="w-4 h-4" />
                                                                        )}
                                                                    </button>
                                                                </td>

                                                                <td className="py-3 px-6">
                                                                    {isExhausted ? (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-hairline)]">
                                                                            Esgotado / Usado
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#0D9488]/10 text-[var(--teal-text)] border border-[#0D9488]/25">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] dark:bg-[#14B8A6]" />
                                                                            Disponível
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                <td className="py-3 px-6 font-mono text-[var(--text-primary)]">
                                                                    {inv.current_uses} / {inv.max_uses}
                                                                </td>

                                                                <td className="py-3 px-6 text-[var(--text-secondary)] max-w-xs truncate">
                                                                    {inv.used_by || <span className="opacity-60">—</span>}
                                                                </td>

                                                                <td className="py-3 px-6 text-[var(--text-secondary)]">
                                                                    {new Date(inv.created_at).toLocaleDateString('pt-BR', {
                                                                        day: '2-digit',
                                                                        month: '2-digit',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </td>

                                                                <td className="py-3 px-6 text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button
                                                                            onClick={() => copyToClipboard(inviteUrl, `link_${inv.id}`)}
                                                                            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[var(--cobalt-text)] border border-[#2563EB]/25 transition-all cursor-pointer"
                                                                            title="Copiar link completo com código aplicado"
                                                                        >
                                                                            {copiedCode === `link_${inv.id}` ? (
                                                                                <>
                                                                                    <Check className="w-3.5 h-3.5 text-[var(--teal-text)]" />
                                                                                    <span className="text-[var(--teal-text)]">Link Copiado!</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Copy className="w-3.5 h-3.5" />
                                                                                    <span>Copiar Link</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => shareOnWhatsApp(inv.code)}
                                                                            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[var(--teal-text)] border border-[#0D9488]/25 transition-all cursor-pointer"
                                                                            title="Mandar no WhatsApp"
                                                                        >
                                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                                            <span className="hidden sm:inline">WhatsApp</span>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Aba Lista de Espera */
                            <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                                        <Users className="w-4 h-4 text-[var(--teal-text)]" />
                                        Candidatos na Lista de Espera ({waitlist.length})
                                    </h3>
                                    <span className="text-xs text-[var(--text-secondary)]">
                                        Programadores aguardando liberação de convite
                                    </span>
                                </div>

                                {waitlist.length === 0 ? (
                                    <div className="py-12 text-center text-[var(--text-secondary)] text-xs">
                                        Nenhum candidato na lista de espera no momento. Quando alguém clicar em &quot;Produzir Matrizes&quot; e preencher os dados, aparecerá aqui!
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-hairline)]">
                                                <tr>
                                                    <th className="py-3 px-6 font-semibold">Candidato</th>
                                                    <th className="py-3 px-6 font-semibold">Contato WhatsApp</th>
                                                    <th className="py-3 px-6 font-semibold">Softwares</th>
                                                    <th className="py-3 px-6 font-semibold">Data Inscrição</th>
                                                    <th className="py-3 px-6 font-semibold text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-hairline)]">
                                                {waitlist.map((c) => (
                                                    <tr key={c.id} className="hover:bg-[var(--bg-surface-elevated)]/60 transition-colors">
                                                        <td className="py-4 px-6">
                                                            <div className="font-bold text-[var(--text-primary)] text-sm">{c.name}</div>
                                                            <div className="text-[var(--text-secondary)] text-xs flex items-center gap-1.5 mt-0.5">
                                                                <Mail className="w-3 h-3" />
                                                                <span>{c.email}</span>
                                                            </div>
                                                        </td>

                                                        <td className="py-4 px-6 font-mono text-[var(--text-primary)]">
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone className="w-3.5 h-3.5 text-[var(--teal-text)]" />
                                                                <span>{c.whatsapp}</span>
                                                            </div>
                                                        </td>

                                                        <td className="py-4 px-6 text-[var(--text-primary)]">
                                                            {c.softwares ? (
                                                                <span className="px-2 py-1 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] text-[11px]">
                                                                    {c.softwares}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[var(--text-secondary)] opacity-60">—</span>
                                                            )}
                                                        </td>

                                                        <td className="py-4 px-6 text-[var(--text-secondary)]">
                                                            {new Date(c.created_at).toLocaleDateString('pt-BR', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </td>

                                                        <td className="py-4 px-6 text-right">
                                                            <button
                                                                onClick={() => openWhatsAppInvite(c)}
                                                                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[var(--teal-text)] border border-[#0D9488]/30 transition-all active:scale-95 cursor-pointer"
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                                <span>Convidar no WhatsApp</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
