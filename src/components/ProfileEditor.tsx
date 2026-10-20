'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
    Camera, 
    Save, 
    X, 
    Loader2, 
    ShoppingBag, 
    Code, 
    CreditCard, 
    Trash2, 
    Image as ImageIcon
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { optimizeImageFile } from '@/lib/helpers'

const SOFTWARE_OPTIONS = [
    'Wilcom ES',
    'Wilcom Hatch',
    'Embird Studio',
    'Tajima DG/ML',
    'Brother PE-Design',
    'Pulse Signature',
    'Bernina Designer',
    'Janome Digitizer',
    'Outros'
]

const FORMAT_OPTIONS = [
    '.DST (Tajima / Universal)',
    '.PES (Brother / Babylock)',
    '.JEF (Janome / Elna)',
    '.EXP (Bernina / Melco)',
    '.XXX (Singer)',
    '.HUS (Husqvarna)',
    '.VP3 (Pfaff / Husqvarna)',
    '.EMB (Wilcom Fonte)',
    '.OFM (Melco)'
]

const MACHINE_OPTIONS = [
    'Brother (PR / BP / PE)',
    'Janome (MC / MB)',
    'Tajima (Multi-cabeças)',
    'Barudan',
    'SWF',
    'Happy Japan',
    'Elna',
    'Singer',
    'SunSpecial',
    'Outra Marca'
]

const CLIENT_BUSINESS_OPTIONS = [
    { value: 'Iniciante / Hobby', title: 'Iniciante / Hobby', desc: 'Estou aprendendo e busco orientação sobre matrizes' },
    { value: 'Bordador Autônomo', title: 'Bordador Autônomo', desc: 'Produzo encomendas personalizadas com frequência' },
    { value: 'Confecção / Uniformaria', title: 'Confecção / Uniformaria', desc: 'Produção contínua em larga escala e alta demanda' },
    { value: 'Atelier / Boutique', title: 'Atelier / Boutique', desc: 'Foco em detalhes finos, moda e alta costura' }
]

interface UserProfile {
    id: string
    name: string
    avatar_url?: string
    bio?: string
    is_client?: boolean
    is_programmer?: boolean
    role?: string
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSave: (updatedUser?: any) => void
}

export default function ProfileEditor({ profile, onCancel, onSave }: ProfileEditorProps) {
    const isAlreadyProgrammer = Boolean(profile.is_programmer || profile.role === 'criador')

    const [formData, setFormData] = useState({
        name: profile.name || '',
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
        is_client: isAlreadyProgrammer ? (profile.is_client ?? true) : true,
        is_programmer: isAlreadyProgrammer,
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
    }, [])

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const toggleArrayItem = (field: 'skills' | 'formats', item: string) => {
        setFormData(prev => {
            const list = prev[field] || []
            if (list.includes(item)) {
                return { ...prev, [field]: list.filter(i => i !== item) }
            } else {
                return { ...prev, [field]: [...list, item] }
            }
        })
    }

    // Upload de avatar
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            alert('Apenas arquivos de imagem são permitidos.')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.')
            return
        }

        setUploading(true)
        try {
            const uploadData = new FormData()
            uploadData.append('file', file)
            uploadData.append('userId', profile.id)

            const res = await fetch('/api/upload-avatar', {
                method: 'POST',
                body: uploadData
            })

            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Erro no upload')

            setAvatarPreview(json.avatarUrl)
            handleChange('avatar_url', json.avatarUrl)
        } catch (error: any) {
            alert('Falha ao subir foto: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    // Upload de portfólio (apenas para programadores)
    const handlePortfolioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files || files.length === 0) return

        const currentPortfolio = formData.portfolio_urls.filter((u): u is string => 
            Boolean(u && typeof u === 'string' && u.trim().length > 0 && !u.startsWith('blob:'))
        )
        const remainingCapacity = 12 - currentPortfolio.length

        if (remainingCapacity <= 0) {
            toast.error('Limite máximo de 12 fotos atingido.')
            return
        }

        const filesToUpload = Array.from(files).slice(0, remainingCapacity)
        setPortfolioUploading(true)

        try {
            const uploadPromises = filesToUpload.map(async (file) => {
                const optimizedBlob = await optimizeImageFile(file, 1200, 0.82)

                const uploadData = new FormData()
                uploadData.append('file', optimizedBlob, 'portfolio.jpg')
                uploadData.append('userId', profile.id)

                const res = await fetch('/api/upload-avatar', {
                    method: 'POST',
                    body: uploadData
                })

                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Erro ao subir amostra')
                return json.avatarUrl as string
            })

            const uploadedUrls = await Promise.all(uploadPromises)
            const validUrls = uploadedUrls.filter(Boolean)

            setFormData(prev => ({
                ...prev,
                portfolio_urls: [...prev.portfolio_urls, ...validUrls]
            }))
            toast.success(`${validUrls.length} amostra(s) adicionada(s)!`)
        } catch (error: any) {
            toast.error('Erro ao enviar fotos: ' + error.message)
        } finally {
            setPortfolioUploading(false)
            if (event.target) event.target.value = ''
        }
    }

    const removePortfolioImage = (indexToRemove: number) => {
        setFormData(prev => ({
            ...prev,
            portfolio_urls: prev.portfolio_urls.filter((_, idx) => idx !== indexToRemove)
        }))
    }

    const handleSave = async () => {
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

            const { data: { session } } = await supabase.auth.getSession()

            const updatePayload: Record<string, any> = {
                userId: profile.id,
                name: formData.name.trim() || profile.name,
                avatar_url: safeAvatarUrl,
                bio: formData.bio,
            }

            if (isAlreadyProgrammer) {
                // Programador: envia apenas campos profissionais
                updatePayload.is_programmer = true
                updatePayload.is_client = formData.is_client
                updatePayload.skills = formData.skills
                updatePayload.formats = formData.formats
                updatePayload.portfolio_urls = safePortfolioUrls
                updatePayload.cpf_cnpj = formData.cpf_cnpj
                updatePayload.pix_key = formData.pix_key
                updatePayload.pix_key_type = formData.pix_key_type
                updatePayload.experience_level = formData.experience_level
            } else {
                // Comprador: envia apenas campos de comprador
                updatePayload.is_client = true
                updatePayload.client_business_type = formData.client_business_type
                updatePayload.client_machine_brand = formData.client_machine_brand
                updatePayload.formats = formData.formats
            }

            const res = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify(updatePayload),
                signal: AbortSignal.timeout(15000)
            })

            const json = await res.json()
            if (!res.ok) {
                throw new Error(json.error || 'Erro ao salvar alterações no perfil.')
            }

            onSave({
                ...profile,
                ...updatePayload,
                ...(json.user || {})
            })
        } catch (error: any) {
            console.error('Error saving profile:', error)
            alert(error.message || 'Falha ao salvar perfil. Tente novamente.')
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
                    <h2 className="text-xl font-extrabold text-white">
                        {isAlreadyProgrammer ? 'Editar Perfil Profissional' : 'Editar Perfil de Comprador'}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {isAlreadyProgrammer 
                            ? 'Atualize suas habilidades, portfólio de matrizes e dados de recebimento' 
                            : 'Atualize sua foto, nome de exibição e preferências de máquinas para pedidos'}
                    </p>
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
                        placeholder="Seu nome ou nome do ateliê"
                    />
                </div>

                {/* ============================================================== */}
                {/* SEÇÃO DO CLIENTE: NÍVEL DE CONSCIÊNCIA E MÁQUINAS              */}
                {/* Apenas visível para COMPRADORES (não-programadores)             */}
                {/* ============================================================== */}
                {!isAlreadyProgrammer && (
                <div className="p-5 rounded-2xl bg-[#181C26] border border-white/[0.07] space-y-5">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-[#F5A623]" />
                        <h3 className="text-xs font-bold text-[#F5A623] uppercase tracking-wider">
                            Preferências de Bordado & Máquinas
                        </h3>
                    </div>
                    <p className="text-xs text-gray-400">
                        Ajuda os programadores a entenderem suas necessidades técnicas e os formatos ideais para seus trabalhos.
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
                {/* SEÇÃO DO PROGRAMADOR (APENAS PARA PROGRAMADORES APROVADOS)     */}
                {/* ============================================================== */}
                {isAlreadyProgrammer && (
                    <div className="p-5 rounded-2xl bg-[#181C26] border border-white/[0.07] space-y-6">
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
                                        value={formData.cpf_cnpj}
                                        onChange={(e) => handleChange('cpf_cnpj', e.target.value)}
                                        className="w-full bg-[#181C26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5A623]"
                                        placeholder="000.000.000-00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Tipo de Chave PIX</label>
                                    <select
                                        value={formData.pix_key_type}
                                        onChange={(e) => handleChange('pix_key_type', e.target.value)}
                                        className="w-full bg-[#181C26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5A623]"
                                    >
                                        <option value="cpf">CPF</option>
                                        <option value="cnpj">CNPJ</option>
                                        <option value="email">E-mail</option>
                                        <option value="telefone">Telefone</option>
                                        <option value="aleatoria">Chave Aleatória</option>
                                    </select>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Chave PIX</label>
                                    <input
                                        type="text"
                                        value={formData.pix_key}
                                        onChange={(e) => handleChange('pix_key', e.target.value)}
                                        className="w-full bg-[#181C26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5A623]"
                                        placeholder="Digite sua chave PIX completa"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Portfólio */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                    Portfólio de Amostras ({formData.portfolio_urls.length}/12)
                                </label>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {formData.portfolio_urls
                                    .filter(url => Boolean(url && typeof url === 'string' && url.trim().length > 0))
                                    .map((url, idx) => {
                                        return (
                                            <div key={`${url}-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group bg-[#0B0D11]">
                                                <Image src={url} alt={`Amostra ${idx + 1}`} fill className="object-cover" unoptimized />
                                                <button
                                                    type="button"
                                                    onClick={() => removePortfolioImage(idx)}
                                                    className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Remover foto"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )
                                    })}

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
                                                    + Amostras
                                                </span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            accept="image/png, image/jpeg, image/jpg, image/webp"
                                            onChange={handlePortfolioUpload}
                                            disabled={portfolioUploading}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Bio Geral para Comprador */}
                {!isAlreadyProgrammer && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Sobre Você / Ateliê (Opcional)</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => handleChange('bio', e.target.value)}
                            rows={3}
                            className="w-full bg-[#0B0D11] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#F5A623] transition-all text-xs"
                            placeholder="Descreva brevemente seu negócio, máquinas e os tipos de bordado que costuma encomendar..."
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
                                Salvar Alterações
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
