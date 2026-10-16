'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Key, Shield, Plus, Copy, Check, Users, Sparkles, AlertCircle, RefreshCw, Lock } from 'lucide-react'

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

export default function AdminInvitesPage() {
    const [adminSecret, setAdminSecret] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [invites, setInvites] = useState<Invite[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)

    // Form para criar convite
    const [customCode, setCustomCode] = useState('')
    const [maxUses, setMaxUses] = useState(1)
    const [creating, setCreating] = useState(false)
    const [createSuccess, setCreateSuccess] = useState<string | null>(null)

    useEffect(() => {
        const savedSecret = sessionStorage.getItem('bh_admin_secret')
        if (savedSecret) {
            setAdminSecret(savedSecret)
            fetchInvites(savedSecret)
        }
    }, [])

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (!adminSecret.trim()) return
        fetchInvites(adminSecret.trim())
    }

    const fetchInvites = async (secret: string) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/invites', {
                headers: {
                    'Authorization': `Bearer ${secret.trim()}`
                }
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Falha ao autenticar ou buscar convites.')
            }
            setInvites(data.invites || [])
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

            setCreateSuccess(`Convite ${data.invite.code} gerado com sucesso!`)
            setCustomCode('')
            setMaxUses(1)
            fetchInvites(adminSecret)
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
                                    Insira sua chave de administrador para gerenciar o acesso exclusivo de programadores.
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
                        {/* Boas-vindas e Estatísticas */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12151C] border border-white/[0.08] rounded-2xl p-6">
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
                                    <Key className="w-5 h-5 text-[#F5A623]" />
                                    Convites para Programadores
                                </h1>
                                <p className="text-xs text-gray-400 mt-1">
                                    Gerencie os códigos que permitem a programadores selecionados criarem perfis profissionais.
                                </p>
                            </div>

                            <button
                                onClick={() => fetchInvites(adminSecret)}
                                disabled={loading}
                                className="self-start sm:self-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-2"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                Atualizar Lista
                            </button>
                        </div>

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

                            {createSuccess && (
                                <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                                    <Check className="w-4 h-4 shrink-0" />
                                    <span>{createSuccess}</span>
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Tabela de Convites */}
                        <div className="bg-[#12151C] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
                            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-[#F5A623]" />
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
                                                        {/* Código */}
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

                                                        {/* Status */}
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

                                                        {/* Usos */}
                                                        <td className="py-4 px-6 font-mono text-gray-300">
                                                            {inv.current_uses} / {inv.max_uses}
                                                        </td>

                                                        {/* Usado por */}
                                                        <td className="py-4 px-6 text-gray-400 max-w-xs truncate">
                                                            {inv.used_by || <span className="text-gray-600">—</span>}
                                                        </td>

                                                        {/* Data */}
                                                        <td className="py-4 px-6 text-gray-400">
                                                            {new Date(inv.created_at).toLocaleDateString('pt-BR', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </td>

                                                        {/* Ações */}
                                                        <td className="py-4 px-6 text-right">
                                                            <button
                                                                onClick={() => copyToClipboard(inviteUrl, `link_${inv.id}`)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all"
                                                            >
                                                                {copiedCode === `link_${inv.id}` ? (
                                                                    <>
                                                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                                        <span className="text-emerald-400">Link Copiado!</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="w-3.5 h-3.5" />
                                                                        <span>Copiar Link de Convite</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
