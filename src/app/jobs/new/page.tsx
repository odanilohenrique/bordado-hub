'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { Upload, FileText, Image as ImageIcon, Zap, Clock, Package, Plus, Trash2, Check, CheckCircle, AlertCircle, RefreshCw, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { optimizeImageFile } from '@/lib/helpers'
import { clearCache } from '@/lib/clientCache'
import { useAuth } from '@/contexts/AuthContext'

const PRESET_FORMATS = ['.PES', '.JEF', '.DST', '.XXX', '.VP3', '.HUS', '.EXP']

export interface MatrixItem {
    id: string
    name: string
    size: string
    fabric: string
    notes: string
    file: File | null
    previewUrl: string | null
    uploadedUrl: string | null
    uploadProgress: number
    uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
    uploadError?: string
}

export interface ExtraImageItem {
    id: string
    file: File
    previewUrl: string
    uploadedUrl: string | null
    uploadProgress: number
    uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
    uploadError?: string
}

function NewJobContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user: authUser, profileId: authProfileId, loading: authLoading, profileLoading } = useAuth()

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [urgency, setUrgency] = useState('sem_pressa')
    const [formats, setFormats] = useState<string[]>(['.PES'])
    const [customFormatInput, setCustomFormatInput] = useState('')
    const [extraImages, setExtraImages] = useState<ExtraImageItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [checkingAuth, setCheckingAuth] = useState<boolean>(true)
    const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null)
    const [directProgrammerId, setDirectProgrammerId] = useState<string | null>(null)
    const [directProgrammerName, setDirectProgrammerName] = useState<string | null>(null)

    // Lista unificada de matrizes do pedido (começa com 1 matriz por padrão)
    const [matrixItems, setMatrixItems] = useState<MatrixItem[]>([
        { id: '1', name: 'Matriz 1', size: '', fabric: '', notes: '', file: null, previewUrl: null, uploadedUrl: null, uploadProgress: 0, uploadStatus: 'idle' }
    ])

    // Check authentication on page load and cache user ID to avoid locks on mobile
    useEffect(() => {
        let isMounted = true

        if (authProfileId) {
            setCurrentUserProfileId(authProfileId)
            setCheckingAuth(false)
            return
        }

        const safetyTimer = setTimeout(() => {
            if (isMounted) setCheckingAuth(false)
        }, 8500)

        const checkAuth = async () => {
            let keepChecking = false
            try {
                let authUserId = authUser?.id
                if (!authUserId) {
                    const { data: { session } } = await Promise.race([
                        supabase.auth.getSession(),
                        new Promise<any>((resolve) => setTimeout(() => resolve({ data: { session: null } }), 4500))
                    ])
                    authUserId = session?.user?.id
                }

                if (!authUserId) {
                    if (authLoading || profileLoading) {
                        keepChecking = true
                        return
                    }
                    router.push('/login?redirect=/jobs/new')
                    return
                }

                let profileId = authUserId

                // Busca o ID em public.users com timeout de 4.5s
                try {
                    const profilePromise = supabase
                        .from('users')
                        .select('id')
                        .eq('supabase_user_id', authUserId)
                        .maybeSingle()

                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('timeout')), 4500)
                    )

                    const { data: userProfile } = await Promise.race([profilePromise, timeoutPromise]) as any
                    if (userProfile?.id) {
                        profileId = userProfile.id
                    }
                } catch {
                    // Profile lookup failed or timed out — proceed with authUserId
                    console.warn('Profile lookup skipped, using auth ID')
                }

                if (isMounted) {
                    setCurrentUserProfileId(profileId)
                }
            } catch (err) {
                console.error('Erro na checagem de autenticação:', err)
            } finally {
                if (!keepChecking) {
                    clearTimeout(safetyTimer)
                    if (isMounted) setCheckingAuth(false)
                }
            }
        }
        checkAuth()
        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [router, authProfileId, authUser?.id, authLoading, profileLoading])

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

    // Função de upload com barra de progresso em tempo real e fallback direto no storage
    const performUpload = async (
        file: File,
        onProgress: (percent: number) => void
    ): Promise<string> => {
        onProgress(5)

        // 1. Otimiza a imagem no cliente (timeout de 4s embutido para nunca travar no celular)
        let readyFile: any = file
        try {
            readyFile = await optimizeImageFile(file)
        } catch (optErr) {
            console.warn('Erro ao otimizar imagem, mantendo arquivo original:', optErr)
            readyFile = file
        }

        onProgress(20)

        const fileName = (readyFile as any).name || (file as any).name || `arte_${Date.now()}.jpg`
        const safeUserId = currentUserProfileId || 'geral'

        // 2. Upload com monitoramento via XMLHttpRequest (reporta porcentagem real de envio)
        try {
            const publicUrl = await new Promise<string>((resolve, reject) => {
                const formData = new FormData()
                formData.append('file', readyFile, fileName)
                formData.append('userId', safeUserId)

                const xhr = new XMLHttpRequest()
                xhr.open('POST', '/api/jobs/upload')
                xhr.timeout = 50000

                xhr.upload.onprogress = (evt) => {
                    if (evt.lengthComputable) {
                        const pct = Math.min(95, Math.round(20 + (evt.loaded / evt.total) * 75))
                        onProgress(pct)
                    }
                }

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const res = JSON.parse(xhr.responseText)
                            if (res.publicUrl) {
                                resolve(res.publicUrl)
                            } else {
                                reject(new Error(res.error || 'Erro ao processar imagem'))
                            }
                        } catch {
                            reject(new Error('Resposta inválida do servidor'))
                        }
                    } else {
                        try {
                            const res = JSON.parse(xhr.responseText)
                            reject(new Error(res.error || `Erro ${xhr.status}`))
                        } catch {
                            reject(new Error(`Erro HTTP ${xhr.status}`))
                        }
                    }
                }

                xhr.onerror = () => reject(new Error('Falha de conexão durante o envio'))
                xhr.ontimeout = () => reject(new Error('Tempo limite de envio excedido'))

                xhr.send(formData)
            })

            onProgress(100)
            return publicUrl
        } catch (apiErr) {
            console.warn('Upload via rota de API falhou, acionando fallback direto no Storage:', apiErr)
            onProgress(50)

            // Fallback direto no Supabase Storage (caso Vercel bloqueie payload no mobile)
            const cleanName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
            const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
            const storagePath = `jobs/${safeUserId}/${uniqueId}_${cleanName}`

            const { error: directUploadError } = await supabase.storage
                .from('portfolio')
                .upload(storagePath, readyFile, {
                    contentType: readyFile.type || 'image/jpeg',
                    upsert: true
                })

            if (directUploadError) {
                throw new Error(`Falha no upload direto: ${directUploadError.message}`)
            }

            const { data: publicData } = supabase.storage
                .from('portfolio')
                .getPublicUrl(storagePath)

            if (!publicData?.publicUrl) {
                throw new Error('Não foi possível gerar link público da imagem')
            }

            onProgress(100)
            return publicData.publicUrl
        }
    }

    // Inicia upload imediato de imagem da matriz
    const uploadMatrixFile = async (matrixId: string, file: File) => {
        setMatrixItems(prev => prev.map(item => item.id === matrixId ? {
            ...item,
            uploadProgress: 5,
            uploadStatus: 'uploading',
            uploadError: undefined
        } : item))

        try {
            const url = await performUpload(file, (pct) => {
                setMatrixItems(prev => prev.map(item => item.id === matrixId ? {
                    ...item,
                    uploadProgress: pct,
                    uploadStatus: pct >= 100 ? 'success' : 'uploading'
                } : item))
            })

            setMatrixItems(prev => prev.map(item => item.id === matrixId ? {
                ...item,
                uploadedUrl: url,
                uploadProgress: 100,
                uploadStatus: 'success'
            } : item))
            toast.success('Imagem enviada com sucesso!')
        } catch (err: any) {
            console.error('Erro no upload da matriz:', err)
            const errMsg = err.message || 'Erro ao enviar imagem'
            setMatrixItems(prev => prev.map(item => item.id === matrixId ? {
                ...item,
                uploadStatus: 'error',
                uploadError: errMsg
            } : item))
            toast.error(`Falha no envio da foto: ${errMsg}`)
        }
    }

    // Matrix Items Handlers
    const addMatrixItem = () => {
        const nextNum = matrixItems.length + 1
        setMatrixItems(prev => [
            ...prev,
            { id: Date.now().toString(), name: `Matriz ${nextNum}`, size: '', fabric: '', notes: '', file: null, previewUrl: null, uploadedUrl: null, uploadProgress: 0, uploadStatus: 'idle' }
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

    const updateMatrixItem = (id: string, field: 'name' | 'size' | 'fabric' | 'notes', value: string) => {
        setMatrixItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
    }

    const handleMatrixItemFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            const previewUrl = URL.createObjectURL(file)
            setMatrixItems(prev => prev.map(item => {
                if (item.id === id) {
                    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
                    return {
                        ...item,
                        file,
                        previewUrl,
                        uploadedUrl: null,
                        uploadProgress: 5,
                        uploadStatus: 'uploading',
                        uploadError: undefined
                    }
                }
                return item
            }))
            // Inicia upload imediatamente
            uploadMatrixFile(id, file)
        }
        e.target.value = ''
    }

    const removeMatrixItemFile = (id: string) => {
        setMatrixItems(prev => prev.map(item => {
            if (item.id === id) {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
                return {
                    ...item,
                    file: null,
                    previewUrl: null,
                    uploadedUrl: null,
                    uploadProgress: 0,
                    uploadStatus: 'idle',
                    uploadError: undefined
                }
            }
            return item
        }))
    }

    // Inicia upload imediato de foto complementar
    const uploadExtraFile = async (id: string, file: File) => {
        setExtraImages(prev => prev.map(item => item.id === id ? {
            ...item,
            uploadProgress: 5,
            uploadStatus: 'uploading',
            uploadError: undefined
        } : item))

        try {
            const url = await performUpload(file, (pct) => {
                setExtraImages(prev => prev.map(item => item.id === id ? {
                    ...item,
                    uploadProgress: pct,
                    uploadStatus: pct >= 100 ? 'success' : 'uploading'
                } : item))
            })

            setExtraImages(prev => prev.map(item => item.id === id ? {
                ...item,
                uploadedUrl: url,
                uploadProgress: 100,
                uploadStatus: 'success'
            } : item))
        } catch (err: any) {
            console.error('Erro no upload da foto complementar:', err)
            const errMsg = err.message || 'Erro ao enviar imagem'
            setExtraImages(prev => prev.map(item => item.id === id ? {
                ...item,
                uploadStatus: 'error',
                uploadError: errMsg
            } : item))
            toast.error(`Falha no envio da foto complementar: ${errMsg}`)
        }
    }

    // Fotos complementares / gerais
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            if (extraImages.length + selectedFiles.length > 6) {
                toast.error('Máximo de 6 fotos complementares permitidas')
                return
            }

            const newItems: ExtraImageItem[] = selectedFiles.map(file => ({
                id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                file,
                previewUrl: URL.createObjectURL(file),
                uploadedUrl: null,
                uploadProgress: 5,
                uploadStatus: 'uploading'
            }))

            setExtraImages(prev => [...prev, ...newItems])

            // Dispara upload imediato para cada foto
            newItems.forEach(item => {
                uploadExtraFile(item.id, item.file)
            })
        }
        e.target.value = ''
    }

    const removeExtraImage = (id: string) => {
        setExtraImages(prev => {
            const item = prev.find(i => i.id === id)
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
            return prev.filter(i => i.id !== id)
        })
    }

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#2563EB]/25 dark:border-[#3B82F6]/25 border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)]">Verificando autenticação...</p>
                </div>
            </div>
        )
    }

    // Estados de validação do envio
    const isAnyUploading = matrixItems.some(item => item.file && item.uploadStatus === 'uploading') ||
                           extraImages.some(item => item.uploadStatus === 'uploading')
    const hasAnyError = matrixItems.some(item => item.file && item.uploadStatus === 'error') ||
                        extraImages.some(item => item.uploadStatus === 'error')
    const hasUnuploadedFiles = matrixItems.some(item => item.file && !item.uploadedUrl) ||
                              extraImages.some(item => !item.uploadedUrl)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // 1. Obtém o usuário (usa cache seguro sem travar na autenticação móvel)
            let userId = currentUserProfileId
            if (!userId) {
                const { data: { session } } = await supabase.auth.getSession()
                userId = session?.user?.id || null
            }

            if (!userId) {
                toast.error('Sessão expirada. Por favor, faça login novamente.')
                router.push('/login?redirect=/jobs/new')
                return
            }

            // 2. Valida se cada matriz tem tamanho informado
            for (let i = 0; i < matrixItems.length; i++) {
                const item = matrixItems[i]
                const label = matrixItems.length > 1 ? `Matriz ${i + 1}` : 'Matriz'
                if (!item.size.trim()) {
                    const msg = `Por favor, informe o tamanho desejado da ${label}.`
                    setError(msg)
                    toast.error(msg)
                    setLoading(false)
                    return
                }
            }

            // 3. Valida se as imagens já terminaram de subir
            const matrixUrls = matrixItems.map(item => item.uploadedUrl)
            const extraUrls = extraImages.map(item => item.uploadedUrl).filter(Boolean) as string[]
            const imageUrls: string[] = [
                ...matrixUrls.filter((url): url is string => Boolean(url)),
                ...extraUrls
            ]

            if (imageUrls.length === 0) {
                const msg = 'Por favor, envie ao menos uma foto, logo ou desenho para a criação da matriz.'
                setError(msg)
                toast.error(msg)
                setLoading(false)
                return
            }

            const isKit = matrixItems.length > 1
            const totalCount = matrixItems.length

            // Estrutura de dados de cada matriz para o card interativo
            const structuredMatrices = matrixItems.map((item, idx) => ({
                name: item.name.trim() || `Matriz ${idx + 1}`,
                size: item.size.trim(),
                fabric: item.fabric.trim() || 'A combinar',
                notes: item.notes.trim() || '',
                image_url: item.uploadedUrl || imageUrls[0] || null
            }))

            // Salva JSON das matrizes em dimensions (para leitura rica e interativa nas abas)
            const finalDimensions = JSON.stringify(structuredMatrices)

            // Detalhamento para a descrição se for mais de 1 matriz
            let finalDescription = description.trim()
            if (isKit) {
                const breakdown = structuredMatrices.map((m) => {
                    const parts = [`• ${m.name}: Tamanho: ${m.size}`]
                    if (m.fabric && m.fabric !== 'A combinar') parts.push(`Tecido: ${m.fabric}`)
                    if (m.notes) parts.push(`Obs: ${m.notes}`)
                    return parts.join(' | ')
                }).join('\n')

                finalDescription = `${finalDescription}\n\nMATRIZES / APLICAÇÕES DO PEDIDO:\n${breakdown}`
            } else if (structuredMatrices[0]?.notes) {
                finalDescription = `${finalDescription}\n\nObservação da matriz: ${structuredMatrices[0].notes}`
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

            // 4. Criação instantânea do Pedido via API Server-Side com timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000)

            try {
                const apiRes = await fetch('/api/jobs/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cliente_id: userId,
                        title: finalTitle,
                        description: finalDescription,
                        dimensions: finalDimensions,
                        fabric_type: finalFabricType,
                        urgency,
                        formats: finalFormats,
                        image_urls: imageUrls,
                        order_type: isKit ? 'kit' : 'individual',
                        items_count: totalCount,
                        target_programmer_id: directProgrammerId
                    }),
                    signal: controller.signal
                })

                clearTimeout(timeoutId)

                const result = await apiRes.json()
                if (!apiRes.ok || !result.success) {
                    throw new Error(result.error || 'Erro ao publicar pedido no servidor')
                }

                clearCache('jobs_all')
                clearCache('jobs_aberto')
                clearCache('jobs_em_progresso')
                clearCache('pedidos_jobs')
                clearCache('producao_data')

                toast.success('Pedido publicado com sucesso!')
                window.location.href = `/jobs/${result.jobId}`
            } catch (fetchErr: any) {
                clearTimeout(timeoutId)
                if (fetchErr.name === 'AbortError') {
                    throw new Error('Tempo limite excedido ao salvar o pedido. Verifique sua conexão e tente novamente.')
                }
                throw fetchErr
            }
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
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
                        Solicitar Matriz de Bordado
                    </h1>
                    <p className="mt-2 text-[var(--text-secondary)] text-sm">
                        Preencha os detalhes da sua encomenda e receba orçamentos de programadores profissionais
                    </p>
                    {directProgrammerName && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-[#2563EB]/10 border border-[#2563EB]/25 rounded-full px-4 py-1.5 text-sm text-[#2563EB] dark:text-[#60A5FA]">
                            <Sparkles className="w-4 h-4" />
                            <span>Enviando pedido direto para: <strong>{directProgrammerName}</strong></span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-5 sm:p-7 space-y-5 shadow-xl">
                    {/* Título do Pedido */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                            <FileText className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                            Título do Pedido
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Logo da Empresa no Peito e Costas, Brasão Escolar, etc."
                            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
                        />
                    </div>

                    {/* Descrição Detalhada */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                            <FileText className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                            Descrição Geral do Pedido
                        </label>
                        <textarea
                            required
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Descreva detalhes como cores desejadas, instruções especiais, máquina que você utiliza..."
                            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all resize-none"
                        />
                    </div>

                    {/* Formatos Desejados */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                            <Package className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
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
                                        className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-2 sm:py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                            isSelected
                                                ? 'bg-[#2563EB]/12 border-[#2563EB] dark:border-[#3B82F6] text-[#2563EB] dark:text-[#60A5FA]'
                                                : 'bg-[var(--bg-surface-elevated)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-glass)] hover:text-[var(--text-primary)]'
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
                                <span className="text-[11px] text-[var(--text-secondary)]">Outros formatos:</span>
                                {formats.filter(f => !PRESET_FORMATS.includes(f)).map(fmt => (
                                    <span
                                        key={fmt}
                                        className="inline-flex items-center gap-1 min-h-[44px] sm:min-h-[32px] pl-3 pr-1 py-1 rounded-lg bg-[#2563EB]/12 border border-[#2563EB] dark:border-[#3B82F6] text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold"
                                    >
                                        {fmt}
                                        <button
                                            type="button"
                                            onClick={() => handleFormatToggle(fmt)}
                                            className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center hover:text-[#DC2626] dark:hover:text-[#EF4444] transition-colors p-1.5 sm:p-0.5 rounded"
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
                                className="min-h-[44px] sm:min-h-[36px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] focus:border-[#2563EB] dark:focus:border-[#3B82F6] rounded-lg px-3.5 py-2 sm:py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none w-52 sm:w-60 uppercase"
                            />
                            <button
                                type="button"
                                onClick={handleAddCustomFormat}
                                disabled={!customFormatInput.trim()}
                                className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 sm:py-1.5 bg-[var(--btn-glass-bg)] hover:bg-[#2563EB]/10 text-[var(--text-primary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA] border border-[var(--border-glass)] hover:border-[#2563EB]/30 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[var(--border-hairline)] pb-3">
                            <div>
                                <label className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                                    <Package className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                                    Matrizes do Pedido ({matrixItems.length} {matrixItems.length === 1 ? 'matriz' : 'matrizes'})
                                </label>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Informe o tamanho, tecido e a foto de cada matriz. Adicione mais tamanhos ou locais se precisar.
                                </p>
                            </div>
                        </div>

                        {/* Lista de Cards de Matrizes */}
                        <div className="space-y-4">
                            {matrixItems.map((item, index) => {
                                return (
                                    <div key={item.id} className="bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl p-5 space-y-4">
                                        {/* Topo do Card */}
                                        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center">
                                                    {index + 1}
                                                </span>
                                                <span className="font-semibold text-[var(--text-primary)] text-base">
                                                    Matriz {index + 1}
                                                </span>
                                            </div>

                                            {matrixItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeMatrixItem(item.id)}
                                                    className="min-h-[44px] sm:min-h-0 text-xs text-[#DC2626] dark:text-[#EF4444] flex items-center gap-1 hover:bg-red-500/10 px-3 py-2 sm:py-1 rounded-lg transition-colors border border-red-500/25"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Remover Matriz
                                                </button>
                                            )}
                                        </div>

                                        {/* Conteúdo do Card em 2 Colunas */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Coluna 1: Campos Digitáveis */}
                                            <div className="space-y-3">
                                                {/* 1. Tamanho Desejado (Obrigatório) */}
                                                <div>
                                                    <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                                                        Tamanho Desejado <span className="text-[#2563EB] dark:text-[#60A5FA]">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Ex: 10x10 cm, 8cm largura, maior possível..."
                                                        value={item.size}
                                                        onChange={(e) => updateMatrixItem(item.id, 'size', e.target.value)}
                                                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6]"
                                                    />
                                                </div>

                                                {/* 2. Tipo de Tecido (Digitável) */}
                                                <div>
                                                    <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                                                        Tipo de Tecido <span className="text-[var(--text-secondary)]">(Opcional)</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ex: malha piquet, algodão, toalha, jeans..."
                                                        value={item.fabric}
                                                        onChange={(e) => updateMatrixItem(item.id, 'fabric', e.target.value)}
                                                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6]"
                                                    />
                                                </div>

                                                {/* 3. Observação da Matriz */}
                                                <div>
                                                    <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                                                        Observação desta Matriz <span className="text-[var(--text-secondary)]">(Opcional)</span>
                                                    </label>
                                                    <textarea
                                                        rows={2}
                                                        placeholder="Ex: onde vai aplicar (peito, costas, manga, boné), cores preferidas, detalhes..."
                                                        value={item.notes}
                                                        onChange={(e) => updateMatrixItem(item.id, 'notes', e.target.value)}
                                                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] resize-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Coluna 2: Upload da Foto Específica com Barra de Progresso */}
                                            <div>
                                                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                                                    Foto / Referência da Matriz {index + 1} <span className="text-[#2563EB] dark:text-[#60A5FA]">*</span>
                                                </label>
                                                {item.previewUrl ? (
                                                    <div className="space-y-2">
                                                        <div className="relative group rounded-lg overflow-hidden border border-[#2563EB]/30 bg-[var(--bg-primary)] h-[175px] flex items-center justify-center">
                                                            <img src={item.previewUrl} alt={`Matriz ${index + 1}`} className="max-h-full max-w-full object-contain p-2" />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeMatrixItemFile(item.id)}
                                                                className="absolute top-2 right-2 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center bg-[#DC2626] hover:bg-[#B91C1C] text-white p-1.5 rounded-full shadow-md transition-colors z-10"
                                                                title="Trocar imagem"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <span className="absolute bottom-1 left-2 text-[10px] text-[#F8FAFC] truncate max-w-[85%] bg-[#0A0F1D]/80 px-2 py-0.5 rounded">
                                                                {item.file?.name}
                                                            </span>
                                                        </div>

                                                        {/* BARRA DE CARREGAMENTO EM TEMPO REAL */}
                                                        {item.uploadStatus === 'uploading' && (
                                                            <div className="bg-[var(--bg-surface)] border border-[#2563EB]/30 rounded-lg p-2.5 space-y-1.5">
                                                                <div className="flex items-center justify-between text-xs text-[#2563EB] dark:text-[#60A5FA] font-semibold">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <div className="w-3.5 h-3.5 border-2 border-[#2563EB]/30 border-t-[#2563EB] dark:border-[#60A5FA]/30 dark:border-t-[#60A5FA] rounded-full animate-spin" />
                                                                        Enviando foto da matriz...
                                                                    </span>
                                                                    <span>{item.uploadProgress}%</span>
                                                                </div>
                                                                <div className="w-full h-2 bg-[var(--border-hairline)] rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-[#2563EB] dark:bg-[#3B82F6] rounded-full transition-all duration-300 ease-out"
                                                                        style={{ width: `${Math.max(5, item.uploadProgress)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {item.uploadStatus === 'success' && (
                                                            <div className="flex items-center justify-between py-1.5 px-3 bg-[#0D9488]/10 border border-[#0D9488]/30 rounded-lg text-[#0F766E] dark:text-[#14B8A6] text-xs">
                                                                <span className="flex items-center gap-1.5 font-medium">
                                                                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                                                    Imagem carregada com sucesso
                                                                </span>
                                                                <span className="text-[11px] font-bold">100%</span>
                                                            </div>
                                                        )}

                                                        {item.uploadStatus === 'error' && (
                                                            <div className="flex items-center justify-between py-1.5 px-3 bg-red-500/10 border border-red-500/30 rounded-lg text-[#DC2626] dark:text-[#EF4444] text-xs">
                                                                <span className="flex items-center gap-1 text-[11px] truncate max-w-[170px]">
                                                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                                                    {item.uploadError || 'Falha no envio'}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => item.file && uploadMatrixFile(item.id, item.file)}
                                                                    className="min-h-[44px] sm:min-h-0 px-2.5 py-1.5 sm:py-0.5 bg-red-500/15 hover:bg-red-500/25 text-red-700 dark:text-red-300 rounded text-[11px] font-bold transition-colors flex items-center gap-1"
                                                                >
                                                                    <RefreshCw className="w-3 h-3" />
                                                                    Tentar de novo
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center h-[175px] border border-dashed border-[#2563EB]/35 hover:border-[#2563EB] dark:hover:border-[#3B82F6] rounded-lg p-3.5 cursor-pointer bg-[var(--bg-surface)] hover:bg-[#2563EB]/5 transition-all text-center group">
                                                        <Upload className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA] group-hover:scale-110 transition-transform mb-1.5" />
                                                        <span className="text-xs font-semibold text-[var(--text-primary)]">Clique para enviar a foto desta matriz</span>
                                                        <span className="text-[10px] text-[var(--text-secondary)] mt-1">PNG, JPG, BMP, PDF até 10MB</span>
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
                            className="w-full min-h-[48px] sm:min-h-[42px] py-2.5 border border-dashed border-[#2563EB]/40 hover:border-[#2563EB] dark:hover:border-[#3B82F6] bg-[#2563EB]/5 hover:bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar Outra Matriz ao Pedido (Kit)
                        </button>

                        {/* Fotos extras complementares (Opcional) */}
                        <div className="space-y-2 pt-3 border-t border-[var(--border-hairline)]">
                            <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                                <ImageIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                Fotos Adicionais ou Visão Geral <span className="text-[var(--text-secondary)]">(Opcional)</span>
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
                                    className="flex items-center justify-center gap-2.5 w-full bg-[var(--bg-surface-elevated)] border border-dashed border-[var(--border-glass)] rounded-lg px-4 py-3 cursor-pointer hover:border-[#2563EB]/50 transition-all"
                                >
                                    <Upload className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                    <p className="text-[var(--text-secondary)] text-xs">Enviar fotos complementares (mockups, peça pronta, uniforme montado, etc.)</p>
                                </label>
                            </div>

                            {extraImages.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mt-2">
                                    {extraImages.map((extra) => (
                                        <div key={extra.id} className="relative group rounded-lg overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-surface-elevated)] p-1.5 flex flex-col justify-between">
                                            <div className="relative h-20 flex items-center justify-center overflow-hidden">
                                                <img src={extra.previewUrl} alt="Extra" className="max-h-full max-w-full object-contain" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExtraImage(extra.id)}
                                                    className="absolute top-1 right-1 min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center bg-[#DC2626] hover:bg-[#B91C1C] text-white p-1 rounded-full shadow transition-colors z-10"
                                                    title="Remover"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Barra de progresso da foto extra */}
                                            {extra.uploadStatus === 'uploading' && (
                                                <div className="w-full mt-1.5 px-0.5">
                                                    <div className="flex items-center justify-between text-[10px] text-[#2563EB] dark:text-[#60A5FA] font-semibold mb-0.5">
                                                        <span>Enviando...</span>
                                                        <span>{extra.uploadProgress}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-[var(--border-hairline)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#2563EB] dark:bg-[#3B82F6] transition-all duration-300"
                                                            style={{ width: `${Math.max(5, extra.uploadProgress)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {extra.uploadStatus === 'success' && (
                                                <div className="flex items-center justify-center gap-1 text-[10px] text-[#0F766E] dark:text-[#14B8A6] font-medium py-0.5 mt-1 bg-[#0D9488]/10 rounded">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span>Enviada</span>
                                                </div>
                                            )}

                                            {extra.uploadStatus === 'error' && (
                                                <div className="flex items-center justify-between text-[10px] text-[#DC2626] dark:text-[#EF4444] py-0.5 mt-1 bg-red-500/10 rounded px-1">
                                                    <span className="truncate max-w-[55px]">Erro</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => uploadExtraFile(extra.id, extra.file)}
                                                        className="min-h-[44px] sm:min-h-0 px-1.5 py-1 sm:py-0 text-red-700 dark:text-red-300 hover:underline flex items-center gap-0.5 font-bold"
                                                    >
                                                        <RefreshCw className="w-2.5 h-2.5" /> Retentar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Urgência */}
                    <div className="space-y-1.5 pt-2 border-t border-[var(--border-hairline)]">
                        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                            <Clock className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                            Urgência
                        </label>
                        <select
                            value={urgency}
                            onChange={e => setUrgency(e.target.value)}
                            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer"
                        >
                            <option value="sem_pressa" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Sem Pressa (Padrão - até 7 dias)</option>
                            <option value="prazo_curto" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Prazo Curto (3-5 dias)</option>
                            <option value="urgente" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Urgente (24 horas)</option>
                        </select>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-[#DC2626] dark:text-[#EF4444] px-3.5 py-2.5 rounded-lg flex items-start gap-2.5">
                            <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p className="text-xs">{error}</p>
                        </div>
                    )}

                    {/* Botões de Ação com Bloqueio Inteligente até Término do Upload */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-3">
                        <Link
                            href="/"
                            className="flex-1 min-h-[48px] flex items-center justify-center px-4 py-2.5 bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] hover:border-[#2563EB]/40 text-[var(--text-primary)] rounded-lg transition-all text-xs font-semibold"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={loading || isAnyUploading || hasUnuploadedFiles || hasAnyError}
                            className="flex-[2] min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--btn-primary-hover)] transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                    <span>Publicando pedido...</span>
                                </>
                            ) : isAnyUploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                    <span>Aguarde o envio das fotos...</span>
                                </>
                            ) : hasAnyError ? (
                                <>
                                    <AlertCircle className="w-4 h-4 text-[#DC2626] dark:text-[#EF4444]" />
                                    <span>Corrija as fotos com erro antes de enviar</span>
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    <span>Enviar Pedido</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Info Footer */}
                <div className="mt-8 text-center text-[var(--text-secondary)] text-sm">
                    <p>Após enviar, você receberá propostas de programadores qualificados</p>
                </div>
            </div>
        </div>
    )
}

export default function NewJob() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#2563EB]/25 dark:border-[#3B82F6]/25 border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)]">Carregando...</p>
                </div>
            </div>
        }>
            <NewJobContent />
        </Suspense>
    )
}
