'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Key, Shield, Plus, Copy, Check, Users, Sparkles, AlertCircle, RefreshCw, Lock, Phone, Mail, MessageSquare, Code2, Link2, ExternalLink, Share2, CheckCircle2 } from 'lucide-react'

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
    const [createSuccess, setCreateSuccess] = useState<string | null>(null)
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
        setCreateSuccess(null)

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
            setCreateSuccess(`Convite ${newCode} gerado com sucesso!`)
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
            `Olá! Aqui é da equipe do BordadoHUB.\n\nSegue seu convite exclusivo para ativar seu perfil de programador:\n\n🔗 Link de ativação (código já aplicado):\n${url}\n\n🔑 Código: ${code}\n\nAo clicar no link, o código já fica preenchido e seu perfil de programador é ativado na hora. Seja bem-vindo!`
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
        <div className="min-h-screen bg-[#0B0D11] text-gray-100 flex flex-col">
            {/* Header */}
            <header className="border-b border-white/[0.08] bg-[#12151C]/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="inline-block">
                            <Image
                                src="/brand/logo-dark-grossa.png"
                                alt="BordadoHub"
                                width={140}
                                height={60}
                                className="h-10 w-auto object-contain"
                                priority
                            />
                        </Link>
                        <span className="hidden sm:inline-block text-xs uppercase tracking-widest font-bold px-2.5 py-1 rounded-md bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20">
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
                            className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all"
                        >
                            Sair do Painel
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
                {!isAuthenticated ? (
                    /* Tela de Login com Senha Master */
                    <div className="max-w-md mx-auto pt-12">
                        <div className="bg-[#12151C] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl">
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] flex items-center justify-center mx-auto mb-3">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <h1 className="text-lg font-bold text-white">Acesso ao Painel de Convites</h1>
                                <p className="text-xs text-gray-400 mt-1">
                                    Insira sua chave de administrador para gerenciar o acesso exclusivo de programadores e a lista de espera.
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                                        Chave Master (ADMIN_SECRET)
                                    </label>
                                    <input
                                        type="password"
                                        value={adminSecret}
                                        onChange={(e) => setAdminSecret(e.target.value)}
                                        placeholder="Digite a chave secreta..."
                                        required
                                        className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F5A623] transition-all"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-black text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#FFB703]/10"
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
                        <div className="bg-[#12151C] border border-white/[0.08] rounded-2xl p-6 space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
                                        <Key className="w-5 h-5 text-[#F5A623]" />
                                        Gestão de Programadores & Convites
                                    </h1>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Controle quem tem permissão para programar matrizes e atenda aos candidatos da lista de espera.
                                    </p>
                                </div>

                                <button
                                    onClick={() => fetchData(adminSecret)}
                                    disabled={loading}
                                    className="self-start sm:self-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    Atualizar Dados
                                </button>
                            </div>

                            {/* Abas */}
                            <div className="flex items-center gap-2 border-b border-white/[0.06] pt-2">
                                <button
                                    onClick={() => setActiveTab('invites')}
                                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                                        activeTab === 'invites'
                                            ? 'border-[#F5A623] text-white bg-white/5'
                                            : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    <Key className="w-3.5 h-3.5 text-[#F5A623]" />
                                    <span>Códigos de Convite ({invites.length})</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('waitlist')}
                                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                                        activeTab === 'waitlist'
                                            ? 'border-[#F5A623] text-white bg-white/5'
                                            : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Lista de Espera ({waitlist.length})</span>
                                    {waitlist.length > 0 && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {activeTab === 'invites' ? (
                            <>
                                {/* Formulário de Criação de Convite */}
                                <div className="bg-[#12151C] border border-[#F5A623]/20 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                                        <Sparkles className="w-4 h-4 text-[#F5A623]" />
                                        Gerar Novo Convite
                                    </h2>

                                    <form onSubmit={handleCreateInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                                Código Personalizado (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={customCode}
                                                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                                                placeholder="Ex: WILCOM-PRO ou em branco para automático"
                                                className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#F5A623] transition-all uppercase font-mono"
                                            />
                                            <p className="text-[10px] text-gray-500 mt-1">Se vazio, gera código aleatório de 8 letras.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                                Limite de Usos
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={maxUses}
                                                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                                                className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#F5A623] transition-all"
                                            />
                                            <p className="text-[10px] text-gray-500 mt-1">1 = uso individual descartável.</p>
                                        </div>

                                        <div className="flex items-end">
                                            <button
                                                type="submit"
                                                disabled={creating}
                                                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-black text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-[#FFB703]/10"
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
                                        <div className="mt-5 p-5 rounded-2xl bg-gradient-to-r from-[#FFAE00]/10 via-[#FFAE00]/5 to-transparent border border-[#FFAE00]/30 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-2 mb-2 text-emerald-400 text-sm font-bold">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                <span>Convite <span className="font-mono text-white underline">{lastGeneratedInvite.code}</span> gerado com sucesso!</span>
                                            </div>
                                            <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                                                O link abaixo já possui o código aplicado. Ao clicar, o cliente já abre a tela com o convite ativado:
                                            </p>
                                            
                                            {/* Campo com o link gerado */}
                                            <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={lastGeneratedInvite.url}
                                                    className="flex-1 bg-[#0B0D11] border border-[#FFAE00]/40 rounded-xl px-4 py-2.5 text-xs text-[#FFAE00] font-mono select-all focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(lastGeneratedInvite.url, 'created_link')}
                                                    className="px-4 py-2.5 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#FFB703]/20 shrink-0"
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
                                                    className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
                                                    title="Copiar apenas o código"
                                                >
                                                    {copiedCode === 'created_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Key className="w-3.5 h-3.5" />}
                                                    <span>{copiedCode === 'created_code' ? 'Código Copiado!' : 'Copiar Código'}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => shareOnWhatsApp(lastGeneratedInvite.code)}
                                                    className="px-3.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    <span>WhatsApp</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card: Gerador e Copiador de Link com Código Aplicado */}
                                <div className="bg-[#12151C] border border-[#FFAE00]/30 rounded-2xl p-6 shadow-xl space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                <Link2 className="w-4 h-4 text-[#FFAE00]" />
                                                Gerador de Link com Código Aplicado
                                            </h2>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Escolha ou digite um código para gerar o link direto. O cliente clica no link e o código já fica aplicado automaticamente!
                                            </p>
                                        </div>
                                        {invites.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-gray-400 font-semibold shrink-0">Selecionar convite existente:</span>
                                                <select
                                                    value={linkCodeInput}
                                                    onChange={(e) => setLinkCodeInput(e.target.value)}
                                                    className="bg-[#0B0D11] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#FFAE00] focus:outline-none focus:border-[#FFAE00] font-mono font-bold"
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
                                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                                                Código do Convite
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={linkCodeInput}
                                                    onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                                                    placeholder="Digite ou escolha um código..."
                                                    className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FFAE00] uppercase font-mono font-bold"
                                                />
                                                {linkCodeInput.trim() && (
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(linkCodeInput.trim(), 'generator_code_only')}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 flex items-center gap-1 font-semibold"
                                                        title="Copiar apenas o código"
                                                    >
                                                        {copiedCode === 'generator_code_only' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                        <span>{copiedCode === 'generator_code_only' ? 'Copiado!' : 'Copiar Código'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="lg:col-span-8">
                                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                                                Link Direto para Enviar ao Cliente (Código já Aplicado)
                                            </label>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={linkCodeInput.trim() ? getInviteUrl(linkCodeInput.trim()) : 'Selecione ou digite um código ao lado para visualizar o link...'}
                                                    className="flex-1 bg-[#0B0D11] border border-[#FFAE00]/30 rounded-xl px-4 py-2.5 text-xs text-[#FFAE00] font-mono select-all focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={!linkCodeInput.trim()}
                                                    onClick={() => copyToClipboard(getInviteUrl(linkCodeInput.trim()), 'generator_full_link')}
                                                    className="px-5 py-2.5 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-extrabold text-xs rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-md shadow-[#FFB703]/20 shrink-0"
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
                                        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/[0.06]">
                                            <span className="text-xs text-gray-400">Opções de compartilhamento:</span>
                                            <button
                                                type="button"
                                                onClick={() => shareOnWhatsApp(linkCodeInput.trim())}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95 shadow-sm"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                <span>Enviar pelo WhatsApp</span>
                                            </button>
                                            <a
                                                href={getInviteUrl(linkCodeInput.trim())}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 text-[#FFAE00]" />
                                                <span>Testar Link (Nova Aba)</span>
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Tabela de Convites */}
                                <div className="bg-[#12151C] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
                                    <div className="px-6 py-4 border-b border-white/[0.08]">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                                            <Key className="w-4 h-4 text-[#F5A623]" />
                                            Lista de Convites ({invites.length})
                                        </h3>
                                    </div>

                                    {invites.length === 0 ? (
                                        <div className="py-12 text-center text-gray-500 text-xs">
                                            Nenhum código de convite gerado ainda. Use o formulário acima para criar o primeiro!
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-[#0B0D11]/60 text-gray-400 uppercase tracking-wider border-b border-white/[0.06]">
                                                    <tr>
                                                        <th className="py-3 px-6 font-semibold">Código</th>
                                                        <th className="py-3 px-6 font-semibold">Status</th>
                                                        <th className="py-3 px-6 font-semibold">Usos</th>
                                                        <th className="py-3 px-6 font-semibold">Usado Por</th>
                                                        <th className="py-3 px-6 font-semibold">Data Criação</th>
                                                        <th className="py-3 px-6 font-semibold text-right">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/[0.04]">
                                                    {invites.map((inv) => {
                                                        const isExhausted = inv.current_uses >= inv.max_uses || !inv.active
                                                        const inviteUrl = getInviteUrl(inv.code)

                                                        return (
                                                            <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                                                                <td className="py-4 px-6 font-mono text-sm font-bold text-white flex items-center gap-2">
                                                                    <span>{inv.code}</span>
                                                                    <button
                                                                        onClick={() => copyToClipboard(inv.code, `code_${inv.id}`)}
                                                                        title="Copiar código"
                                                                        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                                    >
                                                                        {copiedCode === `code_${inv.id}` ? (
                                                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                                        ) : (
                                                                            <Copy className="w-3.5 h-3.5" />
                                                                        )}
                                                                    </button>
                                                                </td>

                                                                <td className="py-4 px-6">
                                                                    {isExhausted ? (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                                                            Esgotado / Usado
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                            Disponível
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                <td className="py-4 px-6 font-mono text-gray-300">
                                                                    {inv.current_uses} / {inv.max_uses}
                                                                </td>

                                                                <td className="py-4 px-6 text-gray-400 max-w-xs truncate">
                                                                    {inv.used_by || <span className="text-gray-600">—</span>}
                                                                </td>

                                                                <td className="py-4 px-6 text-gray-400">
                                                                    {new Date(inv.created_at).toLocaleDateString('pt-BR', {
                                                                        day: '2-digit',
                                                                        month: '2-digit',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </td>

                                                                <td className="py-4 px-6 text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button
                                                                            onClick={() => copyToClipboard(inviteUrl, `link_${inv.id}`)}
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFAE00]/10 hover:bg-[#FFAE00]/20 text-[#FFAE00] border border-[#FFAE00]/25 transition-all shadow-sm"
                                                                            title="Copiar link completo com código aplicado"
                                                                        >
                                                                            {copiedCode === `link_${inv.id}` ? (
                                                                                <>
                                                                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                                                    <span className="text-emerald-400">Link Copiado!</span>
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
                                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-all"
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
                            <div className="bg-[#12151C] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
                                <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-emerald-400" />
                                        Candidatos na Lista de Espera ({waitlist.length})
                                    </h3>
                                    <span className="text-xs text-gray-400">
                                        Programadores aguardando liberação de convite
                                    </span>
                                </div>

                                {waitlist.length === 0 ? (
                                    <div className="py-12 text-center text-gray-500 text-xs">
                                        Nenhum candidato na lista de espera no momento. Quando alguém clicar em &quot;Produzir Matrizes&quot; e preencher os dados, aparecerá aqui!
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-[#0B0D11]/60 text-gray-400 uppercase tracking-wider border-b border-white/[0.06]">
                                                <tr>
                                                    <th className="py-3 px-6 font-semibold">Candidato</th>
                                                    <th className="py-3 px-6 font-semibold">Contato WhatsApp</th>
                                                    <th className="py-3 px-6 font-semibold">Softwares</th>
                                                    <th className="py-3 px-6 font-semibold">Data Inscrição</th>
                                                    <th className="py-3 px-6 font-semibold text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.04]">
                                                {waitlist.map((c) => (
                                                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-4 px-6">
                                                            <div className="font-bold text-white text-sm">{c.name}</div>
                                                            <div className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                                                                <Mail className="w-3 h-3 text-gray-500" />
                                                                <span>{c.email}</span>
                                                            </div>
                                                        </td>

                                                        <td className="py-4 px-6 font-mono text-gray-300">
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                                                <span>{c.whatsapp}</span>
                                                            </div>
                                                        </td>

                                                        <td className="py-4 px-6 text-gray-300">
                                                            {c.softwares ? (
                                                                <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px]">
                                                                    {c.softwares}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-600">—</span>
                                                            )}
                                                        </td>

                                                        <td className="py-4 px-6 text-gray-400">
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
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95 shadow-sm"
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
