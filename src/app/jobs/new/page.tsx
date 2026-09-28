'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { Upload, FileText, Image as ImageIcon, Zap, Clock, Package, Target, Layers, Plus, Trash2, Ruler, Sparkles, Check } from 'lucide-react'
import Link from 'next/link'
import { createNotification } from '@/lib/notifications'

const COMMON_POSITIONS = [
    { label: '👕 Peito / Frente', value: 'Peito / Frente' },
    { label: '🧥 Costas (Grande)', value: 'Costas (Grande)' },
    { label: '💪 Manga (Lateral)', value: 'Manga (Lateral)' },
    { label: '🧢 Boné / Touca', value: 'Boné / Touca' },
    { label: '👜 Bolso', value: 'Bolso' },
    { label: '👖 Calça / Perna', value: 'Calça / Perna' },
    { label: '🏷️ Gola / Nuca', value: 'Gola / Nuca' },
    { label: '✨ Outro local...', value: 'outro' },
]

const QUICK_SHORTCUTS = [
    { label: '+ Peito (9-10 cm)', location: 'Peito / Frente', size: '10x10 cm' },
    { label: '+ Costas (25-28 cm)', location: 'Costas (Grande)', size: '26x20 cm' },
    { label: '+ Manga (6-8 cm)', location: 'Manga (Lateral)', size: '7x7 cm' },
    { label: '+ Boné (5-6 cm)', location: 'Boné / Touca', size: '5x5 cm' },
]

export interface KitItem {
    id: string
    location: string
    customLocation: string
    size: string
    fabric: string
    file: File | null
    previewUrl: string | null
}

const COMMON_FABRICS = [
    { label: '🍽️ Pano de Prato / Sacaria', value: 'Pano de Prato / Sacaria' },
    { label: '🛁 Toalha de Banho / Rosto', value: 'Toalha de Banho / Rosto' },
    { label: '👕 Malha fria / Piquet', value: 'Malha fria / Piquet' },
    { label: '👕 Algodão / Profit', value: 'Algodão / Profit' },
    { label: '🧢 Boné / Twill', value: 'Boné / Twill' },
    { label: 'Jeans / Brim', value: 'Jeans / Brim' },
    { label: '🏃 Dry-Fit / Esportivo', value: 'Dry-Fit / Esportivo' },
    { label: '🎽 Moletom / Felpudo', value: 'Moletom / Felpudo' },
    { label: '✨ Outro', value: 'Outro' },
]

function NewJobContent() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [fabricType, setFabricType] = useState('')
    const [urgency, setUrgency] = useState('sem_pressa')
    const [formats, setFormats] = useState<string[]>([])
    const [images, setImages] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [directProgrammerId, setDirectProgrammerId] = useState<string | null>(null)
    const [directProgrammerName, setDirectProgrammerName] = useState<string | null>(null)

    // Tipo de Pedido: Matriz Individual vs Kit
    const [orderType, setOrderType] = useState<'individual' | 'kit'>('individual')
    const [itemsCount, setItemsCount] = useState<number>(2)

    // Kit Items com upload individual de fotos por matriz
    const [kitItems, setKitItems] = useState<KitItem[]>([
        { id: '1', location: 'Peito / Frente', customLocation: '', size: '10x10 cm', fabric: '', file: null, previewUrl: null },
        { id: '2', location: 'Manga (Lateral)', customLocation: '', size: '7x7 cm', fabric: '', file: null, previewUrl: null }
    ])

    // Assistente de Tamanhos e Posições (para Matriz Individual)
    const [sizeMode, setSizeMode] = useState<'structured' | 'free'>('structured')
    const [sizeItems, setSizeItems] = useState<Array<{ id: string, location: string, customLocation: string, size: string }>>([
        { id: '1', location: 'Peito / Frente', customLocation: '', size: '' }
    ])
    const [freeDimensions, setFreeDimensions] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()

    // Check authentication on page load
    useEffect(() => {
        const checkAuth = async () => {
            // Use getSession for faster client-side check that reads from local storage
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                console.log('No session found, redirecting to login')
                router.push('/login?redirect=/jobs/new')
            } else {
                console.log('Session found:', session.user.email)
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
            // Fetch programmer name for display
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

    // Show loading while checking auth
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

    const availableFormats = ['.PES', '.DST', '.JEF', '.XXX', '.EXP']

    const handleFormatChange = (format: string) => {
        setFormats(prev =>
            prev.includes(format)
                ? prev.filter(f => f !== format)
                : [...prev, format]
        )
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            if (images.length + newFiles.length > 6) {
                alert('Máximo de 6 arquivos permitidos')
                return
            }

            // Create previews
            const newPreviews = newFiles.map(file => URL.createObjectURL(file))

            setImages(prev => [...prev, ...newFiles])
            setImagePreviews(prev => [...prev, ...newPreviews])
        }
    }

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
        setImagePreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index)
            // Revoke the URL to free memory
            URL.revokeObjectURL(prev[index])
            return newPreviews
        })
    }

    // Kit Items Handlers
    const addKitItem = () => {
        const usedLocations = kitItems.map(s => s.location)
        let nextLoc = 'Costas (Grande)'
        let nextSize = '26x20 cm'
        if (usedLocations.includes('Costas (Grande)')) {
            nextLoc = 'Manga (Lateral)'
            nextSize = '7x7 cm'
        }
        if (usedLocations.includes('Manga (Lateral)')) {
            nextLoc = 'Boné / Touca'
            nextSize = '5x5 cm'
        }
        if (usedLocations.includes('Boné / Touca')) {
            nextLoc = 'Bolso'
            nextSize = '8x8 cm'
        }

        setKitItems(prev => [
            ...prev,
            { id: Date.now().toString(), location: nextLoc, customLocation: '', size: nextSize, fabric: '', file: null, previewUrl: null }
        ])
    }

    const removeKitItem = (id: string) => {
        if (kitItems.length <= 2) {
            alert('Um kit precisa de pelo menos 2 matrizes.')
            return
        }
        setKitItems(prev => {
            const item = prev.find(i => i.id === id)
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
            return prev.filter(i => i.id !== id)
        })
    }

    const updateKitItem = (id: string, field: 'location' | 'customLocation' | 'size' | 'fabric', value: string) => {
        setKitItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
    }

    const handleKitItemFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            const previewUrl = URL.createObjectURL(file)
            setKitItems(prev => prev.map(item => {
                if (item.id === id) {
                    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
                    return { ...item, file, previewUrl }
                }
                return item
            }))
        }
    }

    const removeKitItemFile = (id: string) => {
        setKitItems(prev => prev.map(item => {
            if (item.id === id) {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
                return { ...item, file: null, previewUrl: null }
            }
            return item
        }))
    }

    const addShortcut = (loc: string, size: string) => {
        if (sizeItems.length === 1 && !sizeItems[0].size) {
            setSizeItems([{ id: Date.now().toString(), location: loc, customLocation: '', size }])
        } else {
            setSizeItems(prev => [...prev, { id: Date.now().toString(), location: loc, customLocation: '', size }])
        }
    }

    const addSizeItem = () => {
        const usedLocations = sizeItems.map(s => s.location)
        let nextLoc = 'Costas (Grande)'
        if (usedLocations.includes('Costas (Grande)')) nextLoc = 'Manga (Lateral)'
        if (usedLocations.includes('Manga (Lateral)')) nextLoc = 'Boné / Touca'
        
        setSizeItems(prev => [...prev, { id: Date.now().toString(), location: nextLoc, customLocation: '', size: '' }])
    }

    const removeSizeItem = (id: string) => {
        if (sizeItems.length <= 1) return
        setSizeItems(prev => prev.filter(item => item.id !== id))
    }

    const updateSizeItem = (id: string, field: 'location' | 'customLocation' | 'size', value: string) => {
        setSizeItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            // 1. Get User ID from public.users
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('supabase_user_id', user.id)
                .single()

            if (userError || !userData) throw new Error('Perfil de usuário não encontrado')

            let finalDimensions = ''
            let finalDescription = description.trim()
            const imageUrls: string[] = []

            if (orderType === 'kit') {
                // Valida tamanhos do kit
                for (let i = 0; i < kitItems.length; i++) {
                    const item = kitItems[i]
                    if (!item.size.trim()) {
                        setError(`Por favor, informe o tamanho da Matriz ${i + 1} (${item.location === 'outro' && item.customLocation ? item.customLocation : item.location}).`)
                        setLoading(false)
                        return
                    }
                }

                // 2. Upload das fotos individuais de cada matriz do kit
                const kitParts: string[] = []
                for (let i = 0; i < kitItems.length; i++) {
                    const item = kitItems[i]
                    const loc = item.location === 'outro' && item.customLocation.trim()
                        ? item.customLocation.trim()
                        : item.location

                    if (item.file) {
                        const fileExt = item.file.name.split('.').pop()
                        const fileName = `kit_${i + 1}_${Math.random()}.${fileExt}`
                        const filePath = `jobs/${userData.id}/${fileName}`

                        const { error: uploadError } = await supabase.storage
                            .from('portfolio')
                            .upload(filePath, item.file)

                        if (uploadError) throw uploadError

                        const { data: { publicUrl } } = supabase.storage
                            .from('portfolio')
                            .getPublicUrl(filePath)

                        imageUrls.push(publicUrl)
                    }

                    kitParts.push(`${i + 1}. ${loc}: ${item.size.trim()}${item.fabric.trim() ? ` (Tecido: ${item.fabric.trim()})` : ''}`)
                }

                finalDimensions = kitParts.join(' | ')

                // Detalhamento para a descrição
                const breakdown = kitItems.map((item, idx) => {
                    const loc = item.location === 'outro' && item.customLocation.trim()
                        ? item.customLocation.trim()
                        : item.location
                    return `• Matriz ${idx + 1} [${loc}]: ${item.size.trim()}${item.fabric.trim() ? ` (Tecido: ${item.fabric.trim()})` : ''}`
                }).join('\n')

                finalDescription = `${finalDescription}\n\n📋 DETALHAMENTO DAS MATRIZES DO KIT:\n${breakdown}`
            } else {
                // Individual
                if (sizeMode === 'structured') {
                    const validItems = sizeItems
                        .filter(item => item.size.trim().length > 0)
                        .map(item => {
                            const loc = item.location === 'outro' && item.customLocation.trim() 
                                ? item.customLocation.trim() 
                                : item.location
                            return `${loc}: ${item.size.trim()}`
                        })
                    finalDimensions = validItems.join(' | ')
                } else {
                    finalDimensions = freeDimensions.trim()
                }

                if (!finalDimensions) {
                    setError('Por favor, informe ao menos um tamanho para a matriz.')
                    setLoading(false)
                    return
                }
            }

            // 3. Upload de imagens adicionais/gerais (se houver)
            for (const file of images) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `jobs/${userData.id}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('portfolio')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('portfolio')
                    .getPublicUrl(filePath)

                imageUrls.push(publicUrl)
            }

            // 4. Process Title (with kit badge if needed)
            let finalTitle = title.trim()
            const totalCount = orderType === 'kit' ? kitItems.length : 1
            if (orderType === 'kit' && !finalTitle.toLowerCase().includes('kit')) {
                finalTitle = `[Kit ${totalCount} Matrizes] ${finalTitle}`
            }

            // 5. Create Job (with fallback if kit columns not created yet)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const baseJobPayload: any = {
                cliente_id: userData.id,
                title: finalTitle,
                description: finalDescription,
                dimensions: finalDimensions,
                fabric_type: fabricType,
                urgency,
                formats,
                image_urls: imageUrls,
                status: 'aberto',
                ...(directProgrammerId && { target_programmer_id: directProgrammerId })
            }

            let jobError = null
            const { error: fullError } = await supabase
                .from('jobs')
                .insert([{
                    ...baseJobPayload,
                    order_type: orderType,
                    items_count: totalCount,
                }])

            if (fullError) {
                console.warn('Fallback insert without kit columns (SQL migration pending):', fullError.message)
                const { error: fallbackError } = await supabase
                    .from('jobs')
                    .insert([baseJobPayload])
                jobError = fallbackError
            }

            if (jobError) throw jobError

            // Notify programmer if it's a direct request
            if (directProgrammerId) {
                await createNotification({
                    userId: directProgrammerId,
                    type: 'solicitacao_direta',
                    title: '🎯 Solicitação Direta Recebida!',
                    message: `Um cliente solicitou a você diretamente a matriz "${title}". Vá ao seu painel e confira!`,
                    linkUrl: '/pedidos'
                })
            }

            router.push('/pedidos')
            router.refresh()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Erro ao criar pedido')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0F1115] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-[#F3F4F6] mb-2">
                        Solicitar Matriz de Bordado
                    </h1>
                    <p className="text-gray-400">
                        Preencha os detalhes do seu pedido e receba propostas de programadores profissionais
                    </p>
                </div>

                {/* Form Card */}
                <form onSubmit={handleSubmit} className="space-y-6 bg-[#1A1D23] p-8 rounded-xl border border-[#FFAE00]/20 shadow-2xl">

                    {/* Direct Request Banner */}
                    {directProgrammerId && (
                        <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg mb-4">
                            <p className="text-purple-300 text-sm font-medium">
                                🎯 Solicitação Direta para: <span className="text-white font-bold">{directProgrammerName || 'Carregando...'}</span>
                            </p>
                            <p className="text-purple-400/70 text-xs mt-1">
                                Este pedido será enviado apenas para este programador e não aparecerá no mural público.
                            </p>
                        </div>
                    )}

                    {/* Tipo de Pedido (Individual vs Kit de Matrizes) */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                            <Layers className="w-4 h-4 text-[#FFAE00]" />
                            Tipo de Pedido
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Card 1: Individual */}
                            <button
                                type="button"
                                onClick={() => setOrderType('individual')}
                                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                                    orderType === 'individual'
                                        ? 'bg-[#FFAE00]/10 border-[#FFAE00] shadow-lg shadow-[#FFAE00]/10'
                                        : 'bg-[#0F1115] border-gray-800 hover:border-gray-700 text-gray-400'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${orderType === 'individual' ? 'bg-[#FFAE00] text-[#0F1115]' : 'bg-gray-800 text-gray-400'}`}>
                                            <Target className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-white text-base">Matriz Individual</span>
                                    </div>
                                    {orderType === 'individual' && <Check className="w-5 h-5 text-[#FFAE00]" />}
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Apenas 1 arte ou logotipo para bordar (ex: apenas o peito ou bolso).
                                </p>
                            </button>

                            {/* Card 2: Kit */}
                            <button
                                type="button"
                                onClick={() => {
                                    setOrderType('kit')
                                    // If user switches to kit and only has 1 size, give a smart default second size
                                    if (sizeItems.length === 1 && !sizeItems[0].size) {
                                        setSizeItems([
                                            { id: '1', location: 'Peito / Frente', customLocation: '', size: '10x10 cm' },
                                            { id: '2', location: 'Manga (Lateral)', customLocation: '', size: '7x7 cm' }
                                        ])
                                    } else if (sizeItems.length === 1) {
                                        setSizeItems(prev => [
                                            ...prev,
                                            { id: Date.now().toString(), location: 'Manga (Lateral)', customLocation: '', size: '' }
                                        ])
                                    }
                                }}
                                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                                    orderType === 'kit'
                                        ? 'bg-[#FFAE00]/10 border-[#FFAE00] shadow-lg shadow-[#FFAE00]/10'
                                        : 'bg-[#0F1115] border-gray-800 hover:border-gray-700 text-gray-400'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${orderType === 'kit' ? 'bg-[#FFAE00] text-[#0F1115]' : 'bg-gray-800 text-gray-400'}`}>
                                            <Package className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-white text-base">Kit / Uniforme Completo</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-[#FFAE00] px-2 py-0.5 rounded-full border border-amber-500/30">
                                        Múltiplas Artes
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    2 ou mais matrizes diferentes no mesmo pedido (ex: Peito + Manga + Costas).
                                </p>
                            </button>
                        </div>

                        {/* Subseção de Configuração do Kit */}
                        {orderType === 'kit' && (
                            <div className="bg-[#0F1115] border border-[#FFAE00]/30 rounded-xl p-4 space-y-2">
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
                                    <Sparkles className="w-4 h-4 text-[#FFAE00] flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Como funciona o Kit:</strong> Cada matriz do seu kit terá seu próprio campo para <strong>enviar a foto específica, o tamanho e a posição</strong> logo abaixo. O programador saberá exatamente qual desenho vai no peito, na manga ou nas costas e orçará o pacote completo!
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <FileText className="w-4 h-4 text-[#FFAE00]" />
                            Título do Pedido
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={orderType === 'kit' ? "Ex: Uniforme Empresa X - Kit Peito + Manga + Costas" : "Ex: Logo da Empresa X em Bordado"}
                            className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <FileText className="w-4 h-4 text-[#FFAE00]" />
                            Descrição Detalhada Geral
                        </label>
                        <textarea
                            required
                            rows={4}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Descreva detalhes como cores desejadas, quantidade de pontos, orientações gerais..."
                            className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    {/* Formats */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <Package className="w-4 h-4 text-[#FFAE00]" />
                            Formatos Desejados
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {availableFormats.map(fmt => (
                                <label
                                    key={fmt}
                                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${formats.includes(fmt)
                                        ? 'bg-[#FFAE00]/10 border-[#FFAE00] text-[#FFAE00]'
                                        : 'bg-[#0F1115] border-[#FFAE00]/20 text-gray-400 hover:border-[#FFAE00]/50'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formats.includes(fmt)}
                                        onChange={() => handleFormatChange(fmt)}
                                        className="hidden"
                                    />
                                    <span className="font-medium">{fmt}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* FLUXO 1: SE FOR KIT -> CARDS INDIVIDUAIS POR MATRIZ       */}
                    {/* ========================================================= */}
                    {orderType === 'kit' && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-bold text-[#FFAE00]">
                                    <Package className="w-4 h-4" />
                                    Matrizes do Kit ({kitItems.length} matrizes configuradas)
                                </label>
                                <span className="text-xs text-gray-400">
                                    Envie a foto e o tamanho específico de cada uma
                                </span>
                            </div>

                            <div className="space-y-4">
                                {kitItems.map((item, index) => {
                                    const isCustom = item.location === 'outro'
                                    return (
                                        <div key={item.id} className="bg-[#0F1115] border border-amber-500/30 rounded-xl p-5 space-y-4 shadow-lg">
                                            {/* Topo do Card */}
                                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-6 h-6 rounded-full bg-[#FFAE00] text-[#0F1115] font-black text-xs flex items-center justify-center">
                                                        {index + 1}
                                                    </span>
                                                    <span className="font-bold text-white text-base">
                                                        Matriz {index + 1}: {item.location === 'outro' && item.customLocation ? item.customLocation : item.location}
                                                    </span>
                                                </div>
                                                {kitItems.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeKitItem(item.id)}
                                                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Remover
                                                    </button>
                                                )}
                                            </div>

                                            {/* Campos da Matriz */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Coluna 1: Especificações */}
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-300 block mb-1">
                                                            Posição / Peça
                                                        </label>
                                                        <select
                                                            value={item.location}
                                                            onChange={(e) => updateKitItem(item.id, 'location', e.target.value)}
                                                            className="w-full bg-[#1A1D23] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-[#FFAE00] cursor-pointer"
                                                        >
                                                            {COMMON_POSITIONS.map(pos => (
                                                                <option key={pos.value} value={pos.value}>{pos.label}</option>
                                                            ))}
                                                        </select>
                                                        {isCustom && (
                                                            <input
                                                                type="text"
                                                                placeholder="Ex: Pano de prato, Toalha, Frente do Boné..."
                                                                value={item.customLocation}
                                                                onChange={(e) => updateKitItem(item.id, 'customLocation', e.target.value)}
                                                                className="w-full mt-2 bg-[#1A1D23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FFAE00]"
                                                            />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-300 block mb-1">
                                                            Tamanho Desejado (Obrigatório)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="Ex: 10x10 cm, 8cm largura, Maior possível..."
                                                            value={item.size}
                                                            onChange={(e) => updateKitItem(item.id, 'size', e.target.value)}
                                                            className="w-full bg-[#1A1D23] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FFAE00]"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-400 block mb-1">
                                                            Tecido / Observação específica (Opcional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="Ex: Pano de prato, Toalha, Polo, Dry-fit..."
                                                            value={item.fabric}
                                                            onChange={(e) => updateKitItem(item.id, 'fabric', e.target.value)}
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
                                                        <div className="relative group rounded-lg overflow-hidden border border-[#FFAE00]/30 bg-black/40 h-[175px] flex items-center justify-center">
                                                            <img src={item.previewUrl} alt={`Matriz ${index + 1}`} className="max-h-full max-w-full object-contain p-2" />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeKitItemFile(item.id)}
                                                                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition-colors"
                                                                title="Trocar imagem"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <span className="absolute bottom-1 left-2 text-[10px] text-gray-400 truncate max-w-[90%]">
                                                                {item.file?.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <label className="flex flex-col items-center justify-center h-[175px] border-2 border-dashed border-[#FFAE00]/30 hover:border-[#FFAE00] rounded-lg p-4 cursor-pointer bg-[#1A1D23]/50 hover:bg-[#FFAE00]/5 transition-all text-center group">
                                                            <Upload className="w-6 h-6 text-[#FFAE00] group-hover:scale-110 transition-transform mb-2" />
                                                            <span className="text-xs font-bold text-gray-200">Clique para enviar a foto desta matriz</span>
                                                            <span className="text-[10px] text-gray-500 mt-1">PNG, JPG, PDF até 10MB</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*,application/pdf"
                                                                className="hidden"
                                                                onChange={(e) => handleKitItemFileChange(item.id, e)}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Botão Adicionar Mais Matrizes ao Kit */}
                            <button
                                type="button"
                                onClick={addKitItem}
                                className="w-full py-3 border-2 border-dashed border-[#FFAE00]/40 hover:border-[#FFAE00] bg-[#FFAE00]/5 hover:bg-[#FFAE00]/10 text-[#FFAE00] rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar Outra Matriz ao Kit (ex: Costas, Bolso, Patrocinador)
                            </button>

                            {/* Fotos extras opcionais do conjunto */}
                            <div className="space-y-2 pt-2">
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                    <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                                    Fotos Adicionais ou Visão Geral do Uniforme <span className="text-gray-500">(Opcional)</span>
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
                                        className="flex items-center justify-center gap-3 w-full bg-[#0F1115] border border-dashed border-gray-700 rounded-lg px-4 py-4 cursor-pointer hover:border-gray-500 transition-all"
                                    >
                                        <Upload className="w-4 h-4 text-gray-400" />
                                        <p className="text-gray-400 text-xs">Enviar fotos complementares (mockups, uniforme montado, etc.)</p>
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
                    )}

                    {/* ========================================================= */}
                    {/* FLUXO 2: SE FOR MATRIZ INDIVIDUAL                         */}
                    {/* ========================================================= */}
                    {orderType === 'individual' && (
                        <>
                            {/* Tamanho da Matriz & Posições */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                                        <Ruler className="w-4 h-4 text-[#FFAE00]" />
                                        Tamanho da Matriz (Obrigatório)
                                    </label>

                                    {/* Alternar modo estruturado / livre */}
                                    <button
                                        type="button"
                                        onClick={() => setSizeMode(prev => prev === 'structured' ? 'free' : 'structured')}
                                        className="text-xs text-[#FFAE00] hover:text-[#D97706] transition-colors underline font-medium"
                                    >
                                        {sizeMode === 'structured' ? 'Prefere texto livre? Alternar' : 'Usar assistente por posições'}
                                    </button>
                                </div>

                                {sizeMode === 'structured' ? (
                                    <div className="space-y-3 bg-[#0F1115] border border-gray-800 rounded-xl p-4">
                                        {/* Atalhos Rápidos */}
                                        <div>
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                                                💡 Atalhos comuns (clique para adicionar direto):
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {QUICK_SHORTCUTS.map(sc => (
                                                    <button
                                                        key={sc.label}
                                                        type="button"
                                                        onClick={() => addShortcut(sc.location, sc.size)}
                                                        className="text-xs bg-[#1A1D23] hover:bg-[#FFAE00]/10 hover:border-[#FFAE00]/50 border border-gray-700 text-gray-300 hover:text-[#FFAE00] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                                                    >
                                                        <span>{sc.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Lista de Tamanhos */}
                                        <div className="space-y-2.5 pt-1">
                                            {sizeItems.map((item, index) => {
                                                const isCustom = item.location === 'outro'
                                                return (
                                                    <div key={item.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-[#1A1D23] p-3 rounded-lg border border-gray-700/60">
                                                        {/* Posição / Aplicação */}
                                                        <div className="flex-1 sm:max-w-[200px]">
                                                            <select
                                                                value={item.location}
                                                                onChange={(e) => updateSizeItem(item.id, 'location', e.target.value)}
                                                                className="w-full bg-[#0F1115] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#FFAE00] transition-all cursor-pointer"
                                                            >
                                                                {COMMON_POSITIONS.map(pos => (
                                                                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {/* Campo custom se for "outro" */}
                                                        {isCustom && (
                                                            <div className="flex-1 sm:max-w-[160px]">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Qual peça/local?"
                                                                    value={item.customLocation}
                                                                    onChange={(e) => updateSizeItem(item.id, 'customLocation', e.target.value)}
                                                                    className="w-full bg-[#0F1115] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FFAE00]"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Medida / Tamanho */}
                                                        <div className="flex-1">
                                                            <input
                                                                type="text"
                                                                required={sizeMode === 'structured' && index === 0}
                                                                placeholder="Ex: 10x10 cm, 9cm largura, Bastidor 13x18..."
                                                                value={item.size}
                                                                onChange={(e) => updateSizeItem(item.id, 'size', e.target.value)}
                                                                className="w-full bg-[#0F1115] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FFAE00]"
                                                            />
                                                        </div>

                                                        {/* Botão Remover */}
                                                        {sizeItems.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSizeItem(item.id)}
                                                                className="self-center sm:self-auto p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                title="Remover tamanho"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Botão Adicionar Outro Tamanho */}
                                        <button
                                            type="button"
                                            onClick={addSizeItem}
                                            className="w-full py-2.5 border border-dashed border-[#FFAE00]/40 hover:border-[#FFAE00] bg-[#FFAE00]/5 hover:bg-[#FFAE00]/10 text-[#FFAE00] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Adicionar Outro Tamanho (ex: Costas, Manga, Bolso)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            required={sizeMode === 'free'}
                                            value={freeDimensions}
                                            onChange={e => setFreeDimensions(e.target.value)}
                                            placeholder="Ex: 10x10cm para peito e 25x20cm para costas, bastidor 13x18, toalha de banho..."
                                            className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Você é livre para especificar múltiplos tamanhos e medidas da sua peça neste campo.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Images Upload (Individual) */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                    <ImageIcon className="w-4 h-4 text-[#FFAE00]" />
                                    Arquivos de Referência <span className="text-gray-500">(Máximo 6)</span>
                                </label>

                                <div className="relative">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,application/pdf"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        id="image-upload"
                                    />
                                    <label
                                        htmlFor="image-upload"
                                        className="flex items-center justify-center gap-3 w-full bg-[#0F1115] border-2 border-dashed border-[#FFAE00]/30 rounded-lg px-6 py-8 cursor-pointer hover:border-[#FFAE00] hover:bg-[#FFAE00]/5 transition-all group"
                                    >
                                        <Upload className="w-6 h-6 text-[#FFAE00] group-hover:scale-110 transition-transform" />
                                        <div className="text-center">
                                            <p className="text-[#F3F4F6] font-medium">Clique para enviar arquivos</p>
                                            <p className="text-gray-500 text-sm">PNG, JPG, WEBP, PDF até 10MB cada</p>
                                        </div>
                                    </label>
                                </div>

                                {/* Image Previews */}
                                {imagePreviews.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                                        {imagePreviews.map((preview, idx) => {
                                            const file = images[idx];
                                            const isPdf = file?.type === 'application/pdf';

                                            return (
                                                <div key={idx} className="relative group">
                                                    {isPdf ? (
                                                        <div className="w-full h-32 rounded-lg border border-[#FFAE00]/20 overflow-hidden bg-white/5 relative flex items-center justify-center">
                                                            <iframe 
                                                                src={`${preview}#toolbar=0&navpanes=0&scrollbar=0`} 
                                                                className="w-full h-full pointer-events-none absolute inset-0"
                                                                title={`PDF Preview ${idx + 1}`}
                                                            />
                                                            <div className="absolute inset-0 z-10"></div>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={preview}
                                                            alt={`Preview ${idx + 1}`}
                                                            className="w-full h-32 object-contain rounded-lg border border-[#FFAE00]/20 bg-black/20"
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(idx)}
                                                        className="absolute top-2 right-2 z-20 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <p className="text-xs text-gray-400 mt-1 truncate">{file?.name}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ========================================================= */}
                    {/* TIPO DE TECIDO OU PEÇA (TOTALMENTE PERSONALIZÁVEL)        */}
                    {/* ========================================================= */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <Package className="w-4 h-4 text-[#FFAE00]" />
                            Tipo de Tecido ou Peça <span className="text-gray-500">(Totalmente Personalizável)</span>
                        </label>

                        {/* Atalhos Rápidos de Tecido / Peça */}
                        <div>
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                                💡 Sugestões comuns (clique para preencher ou digite livremente abaixo):
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {COMMON_FABRICS.map(fab => {
                                    const isSelected = fab.value === 'Outro'
                                        ? fabricType === 'Outro' || (fabricType !== '' && !COMMON_FABRICS.some(f => f.value !== 'Outro' && f.value.toLowerCase() === fabricType.toLowerCase()))
                                        : fabricType === fab.value

                                    return (
                                        <button
                                            key={fab.value}
                                            type="button"
                                            onClick={() => {
                                                if (fab.value === 'Outro') {
                                                    if (COMMON_FABRICS.some(f => f.value !== 'Outro' && f.value.toLowerCase() === fabricType.toLowerCase())) {
                                                        setFabricType('')
                                                    }
                                                    document.getElementById('fabric-input')?.focus()
                                                } else {
                                                    setFabricType(fab.value)
                                                }
                                            }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                                isSelected
                                                    ? 'bg-[#FFAE00]/20 border-[#FFAE00] text-[#FFAE00] font-bold'
                                                    : 'bg-[#0F1115] hover:bg-[#FFAE00]/10 border-gray-700 text-gray-300 hover:text-[#FFAE00]'
                                            }`}
                                        >
                                            {fab.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <input
                            id="fabric-input"
                            type="text"
                            value={fabricType}
                            onChange={e => setFabricType(e.target.value)}
                            placeholder="Ex: Pano de prato, Toalha de banho, Camisa polo, Brim pesado, Algodão... (Escreva livremente)"
                            className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                        />
                        <p className="text-xs text-gray-500">
                            Pode ser qualquer tecido, toalha, pano de prato, couro, etc. O programador ajustará a densidade dos pontos para este material.
                        </p>
                    </div>

                    {/* Urgency */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <Clock className="w-4 h-4 text-[#FFAE00]" />
                            Urgência
                        </label>
                        <select
                            value={urgency}
                            onChange={e => setUrgency(e.target.value)}
                            className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all cursor-pointer"
                        >
                            <option value="sem_pressa" className="bg-[#1A1D23]">Sem Pressa (Padrão - até 7 dias)</option>
                            <option value="prazo_curto" className="bg-[#1A1D23]">Prazo Curto (3-5 dias)</option>
                            <option value="urgente" className="bg-[#1A1D23]">Urgente (24-48 horas)</option>
                        </select>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
                            <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-4 pt-4">
                        <Link
                            href="/"
                            className="flex-1 flex items-center justify-center px-6 py-4 border border-[#FFAE00]/20 text-[#F3F4F6] rounded-lg hover:bg-[#FFAE00]/10 transition-all font-medium"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#FFAE00] text-[#0F1115] rounded-lg hover:bg-[#D97706] transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FFAE00]/20"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-[#0F1115]/30 border-t-[#0F1115] rounded-full animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
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

// Wrapper with Suspense for useSearchParams
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
