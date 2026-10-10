'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Save, X, Trash2, ImageIcon, Camera, CreditCard, ShoppingBag, Code, CheckCircle2, Loader2 } from 'lucide-react'
import Image from 'next/image'

// Comprehensive list of embroidery software
const SOFTWARE_OPTIONS = [
    'Wilcom Embroidery Studio',
    'Embird',
    'Brother PE-Design',
    'Janome Digitizer MBX',
    'Hatch Embroidery',
    'Bernina Artlink',
    'Sierra Stick',
    'Floriani Total Control',
    'Chroma',
    'Wings XP',
    'Pulse',
    'Compucon'
]

const FORMAT_OPTIONS = ['PES', 'DST', 'JEF', 'XXX', 'EXP', 'HUS', 'VIP', 'VP3']

const CLIENT_BUSINESS_OPTIONS = [
    { value: 'Iniciante / Hobby', title: 'Iniciante / Hobby', desc: 'Estou aprendendo e busco orientação sobre matrizes' },
    { value: 'Bordador Autônomo', title: 'Bordador Autônomo', desc: 'Produzo encomendas personalizadas com frequência' },
    { value: 'Ateliê / Confecção', title: 'Dono de Ateliê / Confecção', desc: 'Produção diária, foco em agilidade e pontualidade' },
    { value: 'Indústria / Alta Produção', title: 'Indústria / Alta Produção', desc: 'Máquinas multi-cabeças, exigência de cortes mínimos' },
]

const MACHINE_OPTIONS = ['Brother', 'Janome', 'Barudan', 'Tajima', 'Happy', 'SWF', 'Singer', 'Ricoma', 'Outra']

interface UserProfile {
    id: string
    name?: string
    avatar_url?: string
    bio?: string
    role?: string
    is_client?: boolean
    is_programmer?: boolean
    client_business_type?: string
    client_machine_brand?: string
    skills?: string[]
    formats?: string[]
    experience_level?: string
    portfolio_urls?: string[]
    cpf_cnpj?: string
    pix_key?: string
    pix_key_type?: string
}

interface ProfileEditorProps {
    profile: UserProfile
    onCancel: () => void
    onSave: () => void
    defaultProgrammer?: boolean
}

export default function ProfileEditor({ profile, onCancel, onSave, defaultProgrammer }: ProfileEditorProps) {
    const [formData, setFormData] = useState({
        name: profile.name || '',
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
        is_client: profile.is_client ?? true,
        is_programmer: defaultProgrammer ? true : (profile.is_programmer ?? (profile.role === 'criador' || Boolean(profile.skills && profile.skills.length > 0))),
        client_business_type: profile.client_business_type || 'Iniciante / Hobby',
        client_machine_brand: profile.client_machine_brand || '',
        skills: profile.skills || [],
        formats: profile.formats || [],
        experience_level: profile.experience_level || 'Iniciante',
        portfolio_urls: (profile.portfolio_urls || []).filter((u): u is string => Boolean(u && typeof u === 'string' && u.trim().length > 0)),
        cpf_cnpj: profile.cpf_cnpj || '',
        pix_key: profile.pix_key || '',
        pix_key_type: profile.pix_key_type || 'cpf'
    })

    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [portfolioUploading, setPortfolioUploading] = useState(false)
    const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string | null>(null)
    const [roleError, setRoleError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchGoogleAvatar() {
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
            setGoogleAvatarUrl(avatar)
            if (avatar && !formData.avatar_url) {
                setFormData(prev => ({ ...prev, avatar_url: avatar }))
                setAvatarPreview(avatar)
            }
        }
        fetchGoogleAvatar()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (field === 'is_client' || field === 'is_programmer') {
            setRoleError(null)
        }
    }

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileInput = event.target
        try {
            if (!fileInput.files || fileInput.files.length === 0) return
            const file = fileInput.files[0]
            
            // 1. Instant local preview so the user immediately sees their photo
            const localPreview = URL.createObjectURL(file)
            setAvatarPreview(localPreview)
            setUploading(true)

            const uploadData = new FormData()
            uploadData.append('file', file)
            uploadData.append('userId', profile.id)

            const res = await fetch('/api/upload-avatar', {
                method: 'POST',
                body: uploadData
            })

            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Erro no upload')

            const uploadedUrl = json.publicUrl || json.avatarUrl
            if (uploadedUrl) {
                handleChange('avatar_url', uploadedUrl)
                setAvatarPreview(uploadedUrl)
            }
        } catch (error: any) {
            alert('Falha ao enviar foto: ' + error.message)
            setAvatarPreview(formData.avatar_url || null)
        } finally {
            setUploading(false)
            if (fileInput) fileInput.value = ''
        }
    }

    const toggleArrayItem = (field: 'skills' | 'formats', item: string) => {
        setFormData(prev => {
            const current = prev[field]
            const next = current.includes(item)
                ? current.filter(i => i !== item)
                : [...current, item]
            return { ...prev, [field]: next }
        })
    }

    const handlePortfolioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileInput = event.target
        try {
            if (!fileInput.files || fileInput.files.length === 0) return

            const currentValidUrls = (formData.portfolio_urls || []).filter(
                (url): url is string => Boolean(url && typeof url === 'string' && url.trim().length > 0)
            )

            const remainingCapacity = 12 - currentValidUrls.length
            if (remainingCapacity <= 0) {
                alert('Limite máximo de 12 imagens no portfólio atingido.')
                return
            }

            const filesArray = Array.from(fileInput.files)
            // Limit to at most 10 files per selection and remaining slots
            const filesToUpload = filesArray.slice(0, Math.min(10, remainingCapacity))

            if (filesArray.length > remainingCapacity) {
                alert(`Você selecionou ${filesArray.length} imagens. Apenas as ${filesToUpload.length} que cabem no seu limite serão enviadas.`)
            }

            setPortfolioUploading(true)

            const uploadData = new FormData()
            filesToUpload.forEach(file => uploadData.append('files', file))
            uploadData.append('userId', profile.id)
            uploadData.append('isPortfolio', 'true')

            const res = await fetch('/api/upload-avatar', {
                method: 'POST',
                body: uploadData
            })

            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Erro no upload')

            const newUrls: string[] = (json.urls || [json.publicUrl || json.avatarUrl])
                .filter((url: any) => Boolean(url && typeof url === 'string' && url.trim().length > 0))

            if (newUrls.length === 0) {
                throw new Error('Nenhuma imagem válida foi retornada do servidor.')
            }

            setFormData(prev => ({
                ...prev,
                portfolio_urls: [
                    ...prev.portfolio_urls.filter((url): url is string => Boolean(url && typeof url === 'string' && url.trim().length > 0)),
                    ...newUrls
                ]
            }))
        } catch (error: any) {
            alert('Falha ao enviar imagens do portfólio: ' + error.message)
        } finally {
            setPortfolioUploading(false)
            if (fileInput) fileInput.value = ''
        }
    }

    const removePortfolioImage = (urlToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            portfolio_urls: prev.portfolio_urls.filter(url => Boolean(url && url !== urlToRemove))
        }))
    }

    const handleSave = async () => {
        if (!formData.is_client && !formData.is_programmer) {
            setRoleError('Selecione ao menos uma forma de atuação no BordadoHUB.')
            return
        }

        if (uploading || portfolioUploading) {
            alert('Aguarde o envio das fotos terminar antes de salvar.')
            return
        }

        setSaving(true)
        try {
            const safeAvatarUrl = (formData.avatar_url && !formData.avatar_url.startsWith('blob:'))
                ? formData.avatar_url
                : (profile.avatar_url || '')

            const safePortfolioUrls = formData.portfolio_urls.filter((url): url is string => 
                Boolean(url && typeof url === 'string' && url.trim().length > 0 && !url.startsWith('blob:'))
            )

            const res = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: profile.id,
                    ...formData,
                    avatar_url: safeAvatarUrl,
                    portfolio_urls: safePortfolioUrls
                }),
                signal: AbortSignal.timeout(15000)
            })

            const json = await res.json()
            if (!res.ok) {
                throw new Error(json.error || 'Erro ao salvar perfil')
            }

            onSave()
        } catch (error: any) {
            console.error('Error saving profile:', error)
            alert('Erro ao salvar: ' + (error.message || 'Falha na comunicação com o servidor'))
        } finally {
            setSaving(false)
        }
    }

    const currentDisplayAvatar = avatarPreview || formData.avatar_url

    return (
        <div className="bg-[#12151C] rounded-2xl border border-white/[0.07] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center pb-5 mb-6 border-b border-white/[0.07]">
                <div>
                    <h2 className="text-xl font-extrabold text-white">Configurar Perfil Universal</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Gerencie suas atuações como comprador ou criador de matrizes</p>
                </div>
                <button 
                    onClick={onCancel} 
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    aria-label="Fechar"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-7">
                {/* Avatar Upload */}
                <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">Foto de Perfil</label>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-[#181C26] border border-white/10 flex items-center justify-center overflow-hidden relative shrink-0">
                            {currentDisplayAvatar ? (
                                <Image src={currentDisplayAvatar} alt="Avatar" fill className="object-cover" unoptimized />
                            ) : (
                                <span className="text-gray-500 text-xs">Sem foto</span>
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 text-[#F5A623] animate-spin" />
                                </div>
                            )}
                        </div>
                        <label className="bg-[#181C26] border border-white/10 text-gray-200 px-4 py-2.5 rounded-xl cursor-pointer hover:border-[#F5A623] hover:text-[#F5A623] transition-all flex items-center gap-2 text-xs font-semibold">
                            <Camera className="w-4 h-4 text-[#F5A623]" />
                            {uploading ? 'Enviando foto...' : 'Alterar foto'}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                disabled={uploading}
                            />
                        </label>
                        {googleAvatarUrl && currentDisplayAvatar !== googleAvatarUrl && (
                            <button
                                type="button"
                                onClick={() => {
                                    setAvatarPreview(googleAvatarUrl)
                                    handleChange('avatar_url', googleAvatarUrl)
                                }}
                                className="text-xs text-gray-400 hover:text-[#F5A623] underline transition-colors"
                            >
                                Restaurar foto do Google
                            </button>
                        )}
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Nome de Exibição</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5A623] transition-all text-sm"
                        placeholder="Seu nome ou nome do atelier"
                    />
                </div>

                {/* ============================================================== */}
                {/* SELETOR DE ATUAÇÕES (PERFIL HÍBRIDO)                          */}
                {/* ============================================================== */}
                <div className="space-y-3 pt-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Minhas Atuações no BordadoHUB
                    </label>
                    <p className="text-xs text-gray-400">
                        Você pode marcar uma ou ambas as opções para comprar e prestar serviços com uma única conta.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Atuação: Cliente */}
                        <div
                            onClick={() => handleChange('is_client', !formData.is_client)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                                formData.is_client
                                    ? 'bg-[#F5A623]/10 border-[#F5A623] text-white shadow-lg shadow-[#F5A623]/5'
                                    : 'bg-[#181C26] border-white/5 text-gray-400 hover:border-white/20'
                            }`}
                        >
                            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${formData.is_client ? 'bg-[#F5A623] text-black' : 'bg-white/5 text-gray-400'}`}>
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-white">Compro Matrizes</h4>
                                    {formData.is_client && <CheckCircle2 className="w-4 h-4 text-[#F5A623]" />}
                                </div>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                    Quero encomendar matrizes no mural e comprar arquivos prontos.
                                </p>
                            </div>
                        </div>

                        {/* Atuação: Programador */}
                        <div
                            onClick={() => handleChange('is_programmer', !formData.is_programmer)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                                formData.is_programmer
                                    ? 'bg-[#F5A623]/10 border-[#F5A623] text-white shadow-lg shadow-[#F5A623]/5'
                                    : 'bg-[#181C26] border-white/5 text-gray-400 hover:border-white/20'
                            }`}
                        >
                            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${formData.is_programmer ? 'bg-[#F5A623] text-black' : 'bg-white/5 text-gray-400'}`}>
                                <Code className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-white">Programo Matrizes</h4>
                                    {formData.is_programmer && <CheckCircle2 className="w-4 h-4 text-[#F5A623]" />}
                                </div>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                    Quero enviar propostas para pedidos de clientes e vender matrizes.
                                </p>
                            </div>
                        </div>
                    </div>

                    {roleError && (
                        <p className="text-xs text-red-400 font-medium pt-1">{roleError}</p>
                    )}
                </div>

                {/* ============================================================== */}
                {/* SEÇÃO DO CLIENTE: NÍVEL DE CONSCIÊNCIA E MÁQUINAS              */}
                {/* ============================================================== */}
                {formData.is_client && (
                    <div className="p-5 rounded-2xl bg-[#181C26] border border-white/[0.07] space-y-5 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-[#F5A623]" />
                            <h3 className="text-xs font-bold text-[#F5A623] uppercase tracking-wider">
                                Perfil do Cliente (Nível de Consciência)
                            </h3>
                        </div>
                        <p className="text-xs text-gray-400">
                            Ajuda os programadores a entenderem suas necessidades técnicas e o tom de atendimento ideal.
                        </p>

                        {/* Nível / Tipo de Negócio */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2.5">
                                Tipo de Negócio / Maturidade no Bordado
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {CLIENT_BUSINESS_OPTIONS.map((opt) => (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        onClick={() => handleChange('client_business_type', opt.value)}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            formData.client_business_type === opt.value
                                                ? 'bg-[#F5A623]/10 border-[#F5A623] text-white'
                                                : 'bg-[#0B0D11] border-white/5 text-gray-400 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="text-xs font-bold text-white">{opt.title}</div>
                                        <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Marca de Máquina e Formatos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                    Marca da sua Máquina Principal
                                </label>
                                <select
                                    value={formData.client_machine_brand}
                                    onChange={(e) => handleChange('client_machine_brand', e.target.value)}
                                    className="w-full bg-[#0B0D11] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#F5A623]"
                                >
                                    <option value="">Selecione uma marca...</option>
                                    {MACHINE_OPTIONS.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                    Formatos que Você Utiliza
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {FORMAT_OPTIONS.map(format => (
                                        <button
                                            type="button"
                                            key={format}
                                            onClick={() => toggleArrayItem('formats', format)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                formData.formats.includes(format)
                                                    ? 'bg-[#F5A623] text-black'
                                                    : 'bg-[#0B0D11] text-gray-400 border border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            {format}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* SEÇÃO DO PROGRAMADOR: SOFTWARES, PIX E PORTFÓLIO              */}
                {/* ============================================================== */}
                {formData.is_programmer && (
                    <div className="p-5 rounded-2xl bg-[#181C26] border border-white/[0.07] space-y-6 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                            <Code className="w-4 h-4 text-[#F5A623]" />
                            <h3 className="text-xs font-bold text-[#F5A623] uppercase tracking-wider">
                                Perfil Profissional do Programador
                            </h3>
                        </div>
                        <p className="text-xs text-gray-400">
                            Configure seus softwares e dados para aparecer na vitrine de programadores e receber pagamentos.
                        </p>

                        {/* Softwares que Domina */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2.5">
                                Softwares que Você Domina
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {SOFTWARE_OPTIONS.map(software => (
                                    <button
                                        type="button"
                                        key={software}
                                        onClick={() => toggleArrayItem('skills', software)}
                                        className={`px-3 py-2 rounded-xl text-xs text-left transition-all font-medium ${
                                            formData.skills.includes(software)
                                                ? 'bg-[#F5A623] text-black font-bold'
                                                : 'bg-[#0B0D11] text-gray-400 border border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        {software}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bio Profissional */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                Bio Profissional & Experiência
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => handleChange('bio', e.target.value)}
                                rows={3}
                                className="w-full bg-[#0B0D11] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#F5A623] transition-all text-xs"
                                placeholder="Conte sobre seus anos de experiência, especialidades (ex: ponto cheio, 3D puff, logos) e compromisso com qualidade..."
                            />
                        </div>

                        {/* Dados PIX */}
                        <div className="p-4 rounded-xl bg-[#0B0D11] border border-white/10 space-y-3.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                <CreditCard className="w-4 h-4 text-[#F5A623]" />
                                <span>Dados para Recebimento via PIX</span>
                            </div>
                            <p className="text-[11px] text-gray-400">
                                Seus pagamentos por serviços entregues serão transferidos diretamente para esta chave PIX.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-1">CPF ou CNPJ</label>
                                    <input
                                        type="text"
                                        placeholder="000.000.000-00"
                                        value={formData.cpf_cnpj}
                                        onChange={(e) => handleChange('cpf_cnpj', e.target.value)}
                                        className="w-full bg-[#181C26] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#F5A623] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Tipo de Chave PIX</label>
                                    <select
                                        value={formData.pix_key_type}
                                        onChange={(e) => handleChange('pix_key_type', e.target.value)}
                                        className="w-full bg-[#181C26] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#F5A623] focus:outline-none"
                                    >
                                        <option value="cpf">CPF</option>
                                        <option value="cnpj">CNPJ</option>
                                        <option value="email">E-mail</option>
                                        <option value="phone">Telefone / Celular</option>
                                        <option value="random">Chave Aleatória (EVP)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-1">Chave PIX</label>
                                <input
                                    type="text"
                                    placeholder="Sua chave PIX"
                                    value={formData.pix_key}
                                    onChange={(e) => handleChange('pix_key', e.target.value)}
                                    className="w-full bg-[#181C26] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#F5A623] focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Portfólio */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                    Amostras de Portfólio ({formData.portfolio_urls.filter(u => Boolean(u && typeof u === 'string' && u.trim().length > 0)).length}/12)
                                </label>
                                <span className="text-[11px] text-[#F5A623] font-medium">
                                    Selecione até 10 fotos de uma vez
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mb-3">
                                Fotos de matrizes já bordadas ou simulações 3D para comprovar sua qualidade técnica.
                            </p>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                                {formData.portfolio_urls
                                    .filter((url): url is string => Boolean(url && typeof url === 'string' && url.trim().length > 0))
                                    .map((url, index) => (
                                        <div key={`${url}-${index}`} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10 bg-black">
                                            <Image
                                                src={url}
                                                alt={`Portfolio ${index + 1}`}
                                                fill
                                                className="object-contain"
                                                unoptimized
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePortfolioImage(url)}
                                                className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                                title="Remover imagem"
                                            >
                                                <Trash2 className="w-5 h-5 text-white" />
                                            </button>
                                        </div>
                                    ))}

                                {formData.portfolio_urls.filter(u => Boolean(u && typeof u === 'string' && u.trim().length > 0)).length < 12 && (
                                    <label className="aspect-square rounded-xl border border-dashed border-white/20 hover:border-[#F5A623] cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-colors bg-[#0B0D11] p-2 text-center">
                                        {portfolioUploading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 text-[#F5A623] animate-spin" />
                                                <span className="text-[10px] text-[#F5A623] font-bold">Enviando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-5 h-5 text-gray-500" />
                                                <span className="text-[10px] text-gray-400 leading-tight">
                                                    + Fotos (até 10)
                                                </span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handlePortfolioUpload}
                                            disabled={portfolioUploading}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Bio Geral (se não for programador, para o cliente) */}
                {!formData.is_programmer && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Sobre Você / Ateliê</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => handleChange('bio', e.target.value)}
                            rows={3}
                            className="w-full bg-[#0B0D11] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#F5A623] transition-all text-xs"
                            placeholder="Descreva brevemente seu negócio, máquinas e os tipos de bordado que costuma produzir..."
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.07]">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-semibold text-xs transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-md shadow-[#FFB703]/10 disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Salvar Perfil
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
