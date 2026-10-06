'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { Upload, FileText, Image as ImageIcon, Zap, Clock, Package, Plus, Trash2, Check, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createNotification } from '@/lib/notifications'

const PRESET_FORMATS = ['.PES', '.JEF', '.DST', '.XXX', '.VP3', '.HUS', '.EXP']

const COMMON_POSITIONS = [
    { label: 'Peito / Frente', value: 'Peito / Frente' },
    { label: 'Costas (Grande)', value: 'Costas (Grande)' },
    { label: 'Manga (Lateral)', value: 'Manga (Lateral)' },
    { label: 'Boné / Touca', value: 'Boné / Touca' },
    { label: 'Bolso', value: 'Bolso' },
    { label: 'Calça / Perna', value: 'Calça / Perna' },
    { label: 'Gola / Nuca', value: 'Gola / Nuca' },
    { label: 'Pano de Prato / Cozinha', value: 'Pano de Prato / Cozinha' },
    { label: 'Toalha de Banho / Rosto', value: 'Toalha de Banho / Rosto' },
    { label: 'Outro local...', value: 'outro' },
]

const FABRIC_SUGGESTIONS = [
    'Pano de Prato',
    'Toalha',
    'Malha / Piquet',
    'Algodão',
    'Boné',
    'Jeans / Brim',
    'Dry-Fit',
    'Moletom',
]

export interface MatrixItem {
    id: string
    location: string
    customLocation: string
    size: string
    fabric: string
    file: File | null
    previewUrl: string | null
}

function NewJobContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [urgency, setUrgency] = useState('sem_pressa')
    const [formats, setFormats] = useState<string[]>(['.PES'])
    const [customFormatInput, setCustomFormatInput] = useState('')
    const [images, setImages] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [directProgrammerId, setDirectProgrammerId] = useState<string | null>(null)
    const [directProgrammerName, setDirectProgrammerName] = useState<string | null>(null)

    // Lista unificada de matrizes do pedido (começa com 1 matriz por padrão)
    const [matrixItems, setMatrixItems] = useState<MatrixItem[]>([
        { id: '1', location: 'Peito / Frente', customLocation: '', size: '', fabric: '', file: null, previewUrl: null }
    ])

    // Check authentication on page load
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login?redirect=/jobs/new')
            } else {
                setCheckingAuth(false)
            }
        }
        checkAuth()
    }, [router])

    // Check for direct programmer ID from URL
    useEffect(() => {
        const programmerId = searchParams.get('programmer_id')
        if (programmerId) {
            setDirectProgrammerId(programmerId)
            const fetchProgrammerName = async () => {
                const { data } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', programmerId)
                    .single()
                if (data) setDirectProgrammerName(data.name)
            }
            fetchProgrammerName()
        }
    }, [searchParams])

    const handleFormatToggle = (format: string) => {
        setFormats(prev =>
            prev.includes(format)
                ? prev.filter(f => f !== format)
                : [...prev, format]
        )
    }

    const handleAddCustomFormat = () => {
        const trimmed = customFormatInput.trim()
        if (!trimmed) return
        const formatted = trimmed.startsWith('.') ? trimmed.toUpperCase() : `.${trimmed.toUpperCase()}`
        if (!formats.includes(formatted)) {
            setFormats(prev => [...prev, formatted])
        }
        setCustomFormatInput('')
    }

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Verificando autenticação...</p>
                </div>
            </div>
        )
    }

    // Matrix Items Handlers
    const addMatrixItem = () => {
        const usedLocations = matrixItems.map(s => s.location)
        let nextLoc = 'Costas (Grande)'
        if (usedLocations.includes('Costas (Grande)')) nextLoc = 'Manga (Lateral)'
        if (usedLocations.includes('Manga (Lateral)')) nextLoc = 'Boné / Touca'
        if (usedLocations.includes('Boné / Touca')) nextLoc = 'Bolso'

        setMatrixItems(prev => [
            ...prev,
            { id: Date.now().toString(), location: nextLoc, customLocation: '', size: '', fabric: '', file: null, previewUrl: null }
        ])
    }

    const removeMatrixItem = (id: string) => {
        if (matrixItems.length <= 1) return
        setMatrixItems(prev => {
            const item = prev.find(i => i.id === id)
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
            return prev.filter(i => i.id !== id)
        })
    }

    const updateMatrixItem = (id: string, field: 'location' | 'customLocation' | 'size' | 'fabric', value: string) => {
        setMatrixItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
    }

    const handleMatrixItemFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            const previewUrl = URL.createObjectURL(file)
            setMatrixItems(prev => prev.map(item => {
                if (item.id === id) {
                    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
                    return { ...item, file, previewUrl }
                }
                return item
            }))
        }
    }

    const removeMatrixItemFile = (id: string) => {
        setMatrixItems(prev => prev.map(item => {
            if (item.id === id) {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
                return { ...item, file: null, previewUrl: null }
            }
            return item
        }))
    }

    // Fotos complementares / gerais
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            if (images.length + newFiles.length > 6) {
                alert('Máximo de 6 fotos complementares permitidas')
                return
            }
            const newPreviews = newFiles.map(file => URL.createObjectURL(file))
            setImages(prev => [...prev, ...newFiles])
            setImagePreviews(prev => [...prev, ...newPreviews])
        }
    }

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
        setImagePreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index)
            URL.revokeObjectURL(prev[index])
            return newPreviews
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                toast.error('Sessão expirada. Por favor, faça login novamente.')
                throw new Error('Usuário não autenticado')
            }

            // 1. Obter ID do perfil em public.users
            let { data: userData } = await supabase
                .from('users')
                .select('id')
                .eq('supabase_user_id', user.id)
                .maybeSingle()

            if (!userData) {
                const { data: userById } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', user.id)
                    .maybeSingle()
                if (userById) userData = userById
            }

            if (!userData) {
                toast.error('Perfil de usuário não localizado. Recarregue a página.')
                throw new Error('Perfil de usuário não encontrado')
            }

            // Valida se cada matriz tem tamanho informado
            for (let i = 0; i < matrixItems.length; i++) {
                const item = matrixItems[i]
                const locName = item.location === 'outro' && item.customLocation.trim() ? item.customLocation.trim() : item.location
                if (!item.size.trim()) {
                    const msg = `Por favor, informe o tamanho desejado da ${matrixItems.length > 1 ? `Matriz ${i + 1}` : 'Matriz'} (${locName}).`
                    setError(msg)
                    toast.error(msg)
                    setLoading(false)
                    return
                }
            }

            // Valida se enviou pelo menos uma foto/desenho
            const hasAnyFile = matrixItems.some(item => item.file !== null) || images.length > 0
            if (!hasAnyFile) {
                const msg = 'Por favor, envie ao menos uma foto, logo ou desenho para a criação da matriz.'
                setError(msg)
                toast.error(msg)
                setLoading(false)
                return
            }

            // 2. Upload das fotos individuais via API com service client (sem bloqueio de RLS)
            const imageUrls: string[] = []
            const itemParts: string[] = []

            for (let i = 0; i < matrixItems.length; i++) {
                const item = matrixItems[i]
                const loc = item.location === 'outro' && item.customLocation.trim()
                    ? item.customLocation.trim()
                    : item.location

                if (item.file) {
                    const uploadFormData = new FormData()
                    uploadFormData.append('file', item.file)
                    uploadFormData.append('userId', userData.id)

                    const uploadRes = await fetch('/api/jobs/upload', {
                        method: 'POST',
                        body: uploadFormData
                    })
                    const uploadJson = await uploadRes.json()

                    if (!uploadRes.ok || uploadJson.error) {
                        throw new Error(uploadJson.error || 'Erro no upload da foto da matriz')
                    }

                    imageUrls.push(uploadJson.publicUrl)
                }

                itemParts.push(`${matrixItems.length > 1 ? `${i + 1}. ` : ''}${loc}: ${item.size.trim()}${item.fabric.trim() ? ` (Tecido: ${item.fabric.trim()})` : ''}`)
            }

            // 3. Upload de fotos complementares
            for (const file of images) {
                const uploadFormData = new FormData()
                uploadFormData.append('file', file)
                uploadFormData.append('userId', userData.id)

                const uploadRes = await fetch('/api/jobs/upload', {
                    method: 'POST',
                    body: uploadFormData
                })
                const uploadJson = await uploadRes.json()

                if (!uploadRes.ok || uploadJson.error) {
                    throw new Error(uploadJson.error || 'Erro no upload de foto complementar')
                }

                imageUrls.push(uploadJson.publicUrl)
            }

            const isKit = matrixItems.length > 1
            const totalCount = matrixItems.length
            const finalDimensions = itemParts.join(' | ')

            // Detalhamento para a descrição se for mais de 1 matriz
            let finalDescription = description.trim()
            if (isKit) {
                const breakdown = matrixItems.map((item, idx) => {
                    const loc = item.location === 'outro' && item.customLocation.trim()
                        ? item.customLocation.trim()
                        : item.location
                    return `• Matriz ${idx + 1} [${loc}]: ${item.size.trim()}${item.fabric.trim() ? ` (Tecido: ${item.fabric.trim()})` : ''}`
                }).join('\n')

                finalDescription = `${finalDescription}\n\n📋 MATRIZES / APLICAÇÕES DO PEDIDO:\n${breakdown}`
            }

            // Título
            let finalTitle = title.trim()
            if (isKit && !finalTitle.toLowerCase().includes('kit')) {
                finalTitle = `[Kit ${totalCount} Matrizes] ${finalTitle}`
            }

            // Coleta tecidos informados nos cards
            const fabricsCollected = matrixItems.map(i => i.fabric.trim()).filter(Boolean)
            const finalFabricType = fabricsCollected.length > 0
                ? Array.from(new Set(fabricsCollected)).join(', ')
                : 'A combinar com o programador'

            const finalFormats = formats.length > 0 ? formats : ['.PES', '.DST']

            // 4. Criação do Pedido
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const baseJobPayload: any = {
                cliente_id: userData.id,
                title: finalTitle,
                description: finalDescription,
                dimensions: finalDimensions,
                fabric_type: finalFabricType,
                urgency,
                formats: finalFormats,
                image_urls: imageUrls,
                status: 'aberto',
                order_type: isKit ? 'kit' : 'individual',
                items_count: totalCount,
                ...(directProgrammerId && { target_programmer_id: directProgrammerId })
            }

            let { data: createdJob, error: jobError } = await supabase
                .from('jobs')
                .insert([baseJobPayload])
                .select()
                .single()

            // Fallback se colunas de kit não existirem no Supabase
            if (jobError && (jobError.message?.includes('items_count') || jobError.message?.includes('order_type'))) {
                console.warn('Colunas de kit não encontradas, tentando inserção com campos básicos...')
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { order_type, items_count, ...fallbackPayload } = baseJobPayload
                const fallbackRes = await supabase
                    .from('jobs')
                    .insert([fallbackPayload])
                    .select()
                    .single()
                createdJob = fallbackRes.data
                jobError = fallbackRes.error
            }

            if (jobError) throw jobError

            // Notificação se for pedido direto
            if (directProgrammerId) {
                await createNotification({
                    userId: directProgrammerId,
                    type: 'solicitacao_direta',
                    title: 'Novo Pedido Direto!',
                    message: `Você recebeu uma solicitação direta para o pedido "${finalTitle}".`,
                    linkUrl: `/jobs/${createdJob.id}`,
                })
            }

            toast.success('Pedido publicado com sucesso!')
            router.push(`/jobs/${createdJob.id}`)
        } catch (err: any) {
            console.error('Error creating job:', err)
            const msg = err.message || 'Erro ao criar pedido'
            setError(msg)
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0F1115] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-[#F3F4F6]">
                        Solicitar Matriz de Bordado
                    </h1>
                    <p className="mt-2 text-gray-400">
                        Preencha os detalhes do seu pedido e receba orçamentos de programadores profissionais
                    </p>
                    {directProgrammerName && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-[#FFAE00]/10 border border-[#FFAE00]/30 rounded-full px-4 py-1.5 text-sm text-[#FFAE00]">
                            <Sparkles className="w-4 h-4" />
                            <span>Enviando pedido direto para: <strong>{directProgrammerName}</strong></span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="bg-[#1A1D23] border border-[#FFAE00]/20 rounded-xl p-5 sm:p-7 space-y-5 shadow-xl">
                    {/* Título do Pedido */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                            <FileText className="w-3.5 h-3.5 text-[#FFAE00]" />
                            Título do Pedido
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Logo da Empresa no Peito e Costas, Brasão Escolar, etc."
                            className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all"
                        />
                    </div>

                    {/* Descrição Detalhada */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                            <FileText className="w-3.5 h-3.5 text-[#FFAE00]" />
                            Descrição Geral do Pedido
                        </label>
                        <textarea
                            required
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Descreva detalhes como cores desejadas, instruções especiais, máquina que você utiliza..."
                            className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all resize-none"
                        />
                    </div>

                    {/* Formatos Desejados */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                            <Package className="w-3.5 h-3.5 text-[#FFAE00]" />
                            Formatos Desejados para Sua Máquina
                        </label>

                        {/* Atalhos Rápidos dos Formatos Mais Usados */}
                        <div className="flex flex-wrap gap-2">
                            {PRESET_FORMATS.map(fmt => {
                                const isSelected = formats.includes(fmt)
                                return (
                                    <button
                                        key={fmt}
                                        type="button"
                                        onClick={() => handleFormatToggle(fmt)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            isSelected
                                                ? 'bg-[#FFAE00]/15 border-[#FFAE00] text-[#FFAE00] shadow-sm shadow-[#FFAE00]/10'
                                                : 'bg-[#0F1115] border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                        {fmt}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Formatos personalizados adicionados pelo usuário */}
                        {formats.filter(f => !PRESET_FORMATS.includes(f)).length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-[11px] text-gray-400">Outros formatos:</span>
                                {formats.filter(f => !PRESET_FORMATS.includes(f)).map(fmt => (
                                    <span
                                        key={fmt}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFAE00]/15 border border-[#FFAE00] text-[#FFAE00] text-xs font-bold"
                                    >
                                        {fmt}
                                        <button
                                            type="button"
                                            onClick={() => handleFormatToggle(fmt)}
                                            className="hover:text-red-400 transition-colors p-0.5"
                                            title={`Remover ${fmt}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Campo para Digitar Formato Específico */}
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="text"
                                value={customFormatInput}
                                onChange={e => setCustomFormatInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddCustomFormat()
                                    }
                                }}
                                placeholder="Outro formato (ex: .ART, .VIP, .PEC)"
                                className="bg-[#0F1115] border border-white/10 focus:border-[#FFAE00] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none w-52 sm:w-60 uppercase"
                            />
                            <button
                                type="button"
                                onClick={handleAddCustomFormat}
                                disabled={!customFormatInput.trim()}
                                className="px-3 py-1.5 bg-white/5 hover:bg-[#FFAE00]/10 text-gray-300 hover:text-[#FFAE00] border border-white/10 hover:border-[#FFAE00]/30 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Adicionar
                            </button>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* SEÇÃO PRINCIPAL: CARDS DE MATRIZES / APLICAÇÕES           */}
                    {/* ========================================================= */}
                    <div className="space-y-4 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-800 pb-3">
                            <div>
                                <label className="flex items-center gap-2 text-base font-bold text-white">
                                    <Package className="w-4 h-4 text-[#FFAE00]" />
                                    Matrizes do Pedido ({matrixItems.length} {matrixItems.length === 1 ? 'matriz' : 'matrizes'})
                                </label>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Informe o tamanho, tecido e a foto de cada matriz. Adicione mais tamanhos ou locais se precisar.
                                </p>
                            </div>
                        </div>

                        {/* Lista de Cards de Matrizes */}
                        <div className="space-y-4">
                            {matrixItems.map((item, index) => {
                                const isCustom = item.location === 'outro'
                                const locTitle = isCustom && item.customLocation ? item.customLocation : item.location

                                return (
                                    <div key={item.id} className="bg-[#0F1115] border border-amber-500/30 rounded-xl p-5 space-y-4 shadow-lg">
                                        {/* Topo do Card */}
                                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="w-6 h-6 rounded-full bg-[#FFAE00] text-[#0F1115] font-black text-xs flex items-center justify-center">
                                                    {index + 1}
                                                </span>
                                                <span className="font-bold text-white text-base">
                                                    Matriz {index + 1}: {locTitle}
                                                </span>
                                            </div>

                                            {matrixItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeMatrixItem(item.id)}
                                                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Remover
                                                </button>
                                            )}
                                        </div>

                                        {/* Conteúdo do Card em 2 Colunas */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Coluna 1: Especificações */}
                                            <div className="space-y-3">
                                                {/* Posição / Aplicação */}
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-300 block mb-1">
                                                        Posição / Peça
                                                    </label>
                                                    <select
                                                        value={item.location}
                                                        onChange={(e) => updateMatrixItem(item.id, 'location', e.target.value)}
                                                        className="w-full bg-[#1A1D23] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-[#FFAE00] cursor-pointer"
                                                    >
                                                        {COMMON_POSITIONS.map(pos => (
                                                            <option key={pos.value} value={pos.value}>{pos.label}</option>
                                                        ))}
                                                    </select>
                                                    {isCustom && (
                                                        <input
                                                            type="text"
                                                            placeholder="Ex: Pano de prato, Toalha de lavabo, Jaleco..."
                                                            value={item.customLocation}
                                                            onChange={(e) => updateMatrixItem(item.id, 'customLocation', e.target.value)}
                                                            className="w-full mt-2 bg-[#1A1D23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FFAE00]"
                                                        />
                                                    )}
                                                </div>

                                                {/* Tamanho Obrigatório */}
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-300 block mb-1">
                                                        Tamanho Desejado <span className="text-[#FFAE00]">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Ex: 10x10 cm, 8cm largura, Maior possível no bastidor..."
                                                        value={item.size}
                                                        onChange={(e) => updateMatrixItem(item.id, 'size', e.target.value)}
                                                        className="w-full bg-[#1A1D23] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FFAE00]"
                                                    />
                                                </div>

                                                {/* Tecido / Observação Específica com Sugestões Rápidas */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="text-xs font-semibold text-gray-300">
                                                            Tecido / Observação <span className="text-gray-500">(Opcional)</span>
                                                        </label>
                                                    </div>

                                                    {/* Chips de Sugestão Rápida */}
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {FABRIC_SUGGESTIONS.map(fab => (
                                                            <button
                                                                key={fab}
                                                                type="button"
                                                                onClick={() => updateMatrixItem(item.id, 'fabric', fab)}
                                                                className={`text-[10px] px-2 py-0.5 rounded transition-all border ${
                                                                    item.fabric === fab
                                                                        ? 'bg-[#FFAE00]/20 border-[#FFAE00] text-[#FFAE00] font-bold'
                                                                        : 'bg-[#1A1D23] hover:bg-[#FFAE00]/10 border-gray-700 text-gray-400 hover:text-gray-200'
                                                                }`}
                                                            >
                                                                {fab}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <input
                                                        type="text"
                                                        placeholder="Ex: Pano de prato, Toalha felpuda, Malha fria, Jeans..."
                                                        value={item.fabric}
                                                        onChange={(e) => updateMatrixItem(item.id, 'fabric', e.target.value)}
                                                        className="w-full bg-[#1A1D23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FFAE00]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Coluna 2: Upload da Foto Específica */}
                                            <div>
                                                <label className="text-xs font-semibold text-gray-300 block mb-1">
                                                    Foto / Referência da Matriz {index + 1}
                                                </label>
                                                {item.previewUrl ? (
                                                    <div className="relative group rounded-lg overflow-hidden border border-[#FFAE00]/30 bg-black/40 h-[170px] flex items-center justify-center">
                                                        <img src={item.previewUrl} alt={`Matriz ${index + 1}`} className="max-h-full max-w-full object-contain p-2" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeMatrixItemFile(item.id)}
                                                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition-colors"
                                                            title="Trocar imagem"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="absolute bottom-1 left-2 text-[10px] text-gray-400 truncate max-w-[90%] bg-black/70 px-2 py-0.5 rounded">
                                                            {item.file?.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center h-[170px] border border-dashed border-[#FFAE00]/30 hover:border-[#FFAE00] rounded-lg p-3.5 cursor-pointer bg-[#1A1D23]/50 hover:bg-[#FFAE00]/5 transition-all text-center group">
                                                        <Upload className="w-5 h-5 text-[#FFAE00] group-hover:scale-110 transition-transform mb-1.5" />
                                                        <span className="text-xs font-bold text-gray-200">Clique para enviar a foto desta matriz</span>
                                                        <span className="text-[10px] text-gray-500 mt-1">PNG, JPG, PDF até 10MB</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            className="hidden"
                                                            onChange={(e) => handleMatrixItemFileChange(item.id, e)}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Botão Adicionar Mais Matrizes */}
                        <button
                            type="button"
                            onClick={addMatrixItem}
                            className="w-full py-2.5 border border-dashed border-[#FFAE00]/40 hover:border-[#FFAE00] bg-[#FFAE00]/5 hover:bg-[#FFAE00]/10 text-[#FFAE00] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar Outra Matriz ou Tamanho (ex: Costas, Manga, Boné)
                        </button>

                        {/* Fotos extras complementares (Opcional) */}
                        <div className="space-y-1.5 pt-3 border-t border-gray-800">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                                Fotos Adicionais ou Visão Geral <span className="text-gray-500">(Opcional)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    id="extra-images-upload"
                                />
                                <label
                                    htmlFor="extra-images-upload"
                                    className="flex items-center justify-center gap-2.5 w-full bg-[#0F1115] border border-dashed border-gray-700 rounded-lg px-4 py-2.5 cursor-pointer hover:border-gray-500 transition-all"
                                >
                                    <Upload className="w-3.5 h-3.5 text-gray-400" />
                                    <p className="text-gray-400 text-xs">Enviar fotos complementares (mockups, peça pronta, uniforme montado, etc.)</p>
                                </label>
                            </div>
                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                                    {imagePreviews.map((preview, idx) => (
                                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-700 bg-black/30 h-20 flex items-center justify-center">
                                            <img src={preview} alt={`Extra ${idx + 1}`} className="max-h-full max-w-full object-contain p-1" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Urgência */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-800">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                            <Clock className="w-3.5 h-3.5 text-[#FFAE00]" />
                            Urgência
                        </label>
                        <select
                            value={urgency}
                            onChange={e => setUrgency(e.target.value)}
                            className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-[#F3F4F6] focus:outline-none focus:border-[#FFAE00] transition-all cursor-pointer"
                        >
                            <option value="sem_pressa" className="bg-[#1A1D23]">Sem Pressa (Padrão - até 7 dias)</option>
                            <option value="prazo_curto" className="bg-[#1A1D23]">Prazo Curto (3-5 dias)</option>
                            <option value="urgente" className="bg-[#1A1D23]">Urgente (24 horas)</option>
                        </select>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3.5 py-2.5 rounded-lg flex items-start gap-2.5">
                            <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p className="text-xs">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-3 pt-3">
                        <Link
                            href="/"
                            className="flex-1 flex items-center justify-center px-4 py-2.5 border border-white/10 hover:border-[#FFAE00]/30 text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all text-xs font-bold"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#FFAE00] text-black rounded-lg hover:bg-[#D97706] transition-all text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#FFAE00]/20"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    Enviar Pedido
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Info Footer */}
                <div className="mt-8 text-center text-gray-500 text-sm">
                    <p>Após enviar, você receberá propostas de programadores qualificados</p>
                </div>
            </div>
        </div>
    )
}

export default function NewJob() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Carregando...</p>
                </div>
            </div>
        }>
            <NewJobContent />
        </Suspense>
    )
}
