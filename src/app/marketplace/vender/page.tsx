'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { clearCache } from '@/lib/clientCache'
import { optimizeImageFile } from '@/lib/helpers'
import JSZip from 'jszip'
import {
    ArrowLeft,
    UploadCloud,
    Layers,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Image as ImageIcon,
    FileArchive,
    Store,
    Plus,
    X,
    Check,
    Star,
    RefreshCw,
} from 'lucide-react'

const PRESET_FORMAT_OPTIONS = [
    { code: 'DST', hint: 'Tajima / Universal' },
    { code: 'PES', hint: 'PE-Design / Brother' },
    { code: 'JEF', hint: 'Janome' },
    { code: 'XXX', hint: 'Singer' },
    { code: 'VP3', hint: 'Pfaff / Husqvarna' },
    { code: 'HUS', hint: 'Husqvarna' },
    { code: 'PXF', hint: 'Tajima DG/ML' },
    { code: 'EMB', hint: 'Wilcom' },
    { code: 'EOF', hint: 'Embird' },
    { code: 'EXP', hint: 'Bernina / Melco' },
] as const

const PRESET_FORMAT_CODES: string[] = PRESET_FORMAT_OPTIONS.map((f) => f.code)
const FORMAT_CODE_REGEX = /^[A-Z0-9][A-Z0-9_-]{0,11}$/

const MAX_PHOTOS = 10
const MAX_PREVIEW_RAW_MB = 15
const MAX_PREVIEW_UPLOAD_MB = 5
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const BLOCKED_MATRIX_EXTS = new Set(['exe', 'sh', 'bat', 'cmd', 'js', 'mjs', 'cjs', 'php', 'html', 'htm', 'xhtml', 'svg', 'xml'])
const MIN_PRICE = 5

const CATEGORIES = [
    { id: 'geral', label: 'Geral' },
    { id: 'infantil', label: 'Infantil & Bebê' },
    { id: 'animais', label: 'Animais & Pets' },
    { id: 'floral', label: 'Floral & Natureza' },
    { id: 'religioso', label: 'Religioso & Fé' },
    { id: 'logos', label: 'Logos & Marcas' },
    { id: 'frases', label: 'Frases & Nomes' },
    { id: 'datas', label: 'Datas Comemorativas' },
]

interface PhotoItem {
    id: string
    url: string
    file?: File
    isExisting: boolean
}

function normalizeFormatToken(raw: string): string {
    return String(raw ?? '').trim().replace(/^\.+/, '').toUpperCase()
}

function normalizeFormatsArray(list: unknown): string[] {
    if (!Array.isArray(list)) return []
    const seen = new Set<string>()
    const result: string[] = []
    for (const item of list) {
        const clean = normalizeFormatToken(String(item ?? ''))
        if (!clean || !FORMAT_CODE_REGEX.test(clean)) continue
        if (!seen.has(clean)) {
            seen.add(clean)
            result.push(clean)
        }
    }
    return result
}

function generateLocalId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function getSafeImageExtension(file: File): string {
    const mime = (file.type || '').toLowerCase()
    if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
    if (mime === 'image/png') return 'png'
    if (mime === 'image/webp') return 'webp'
    if (mime === 'image/gif') return 'gif'

    const nameExt = (file.name.split('.').pop() || '').toLowerCase()
    if (ALLOWED_IMAGE_EXTS.has(nameExt)) {
        return nameExt === 'jpeg' ? 'jpg' : nameExt
    }
    return 'jpg'
}

function toSafeStorageFileName(originalName: string): string {
    const rawName = (originalName.split(/[/\\]/).pop() || 'matriz.zip').trim()
    const lastDot = rawName.lastIndexOf('.')
    const rawBase = lastDot > 0 ? rawName.slice(0, lastDot) : rawName
    const rawExt = lastDot > 0 ? rawName.slice(lastDot + 1) : ''

    const cleanBase = rawBase
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .replace(/^[._]+|[._]+$/g, '')
        .slice(0, 120) || 'matriz'

    const cleanExt = rawExt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 16)

    return cleanExt ? `${cleanBase}.${cleanExt}` : cleanBase
}

function isValidUuid(id: string | null): id is string {
    if (!id) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

function VenderMatrizContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editIdParam = searchParams.get('edit')?.trim() || null
    const isEditMode = Boolean(editIdParam)

    const { user: authUser, profile: authProfile, loading: authLoading } = useAuth()
    const [loading, setLoading] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [authError, setAuthError] = useState<string | null>(null)
    const [authRetryCount, setAuthRetryCount] = useState(0)
    const [profile, setProfile] = useState<any>(null)

    // Edit loading states
    const [loadingProduct, setLoadingProduct] = useState(false)
    const [editLoadError, setEditLoadError] = useState<string | null>(null)
    const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null)
    const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null)

    // Form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState<string>('19.90')
    const [category, setCategory] = useState('geral')
    const [isBundle, setIsBundle] = useState(false)
    const [itemsCount, setItemsCount] = useState<number>(2)
    const [selectedFormats, setSelectedFormats] = useState<string[]>(['PES', 'DST', 'JEF'])
    const [customFormatInput, setCustomFormatInput] = useState('')
    const [formatError, setFormatError] = useState<string | null>(null)

    // R3: Multi-photo upload (up to 10: 1 cover + max 9 additional) & matrix files
    const [photos, setPhotos] = useState<PhotoItem[]>([])
    const [coverId, setCoverId] = useState<string | null>(null)
    const [matrixFiles, setMatrixFiles] = useState<File[]>([])

    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Track object URLs for cleanup on remove/unmount
    const objectUrlsRef = useRef<Set<string>>(new Set())
    const profileRef = useRef<any>(null)
    profileRef.current = profile

    useEffect(() => {
        const urls = objectUrlsRef.current
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url))
            urls.clear()
        }
    }, [])

    // Auth hydration & verification (SSR-safe, no premature /login redirect while authLoading or authUser exists)
    useEffect(() => {
        let isMounted = true

        if (authProfile?.id) {
            setProfile(authProfile)
            setAuthError(null)
            setCheckingAuth(false)
            return
        }

        if (!profileRef.current?.id) {
            setCheckingAuth(true)
        }

        const safetyTimer = setTimeout(() => {
            if (isMounted) {
                setAuthError((prev) => prev || 'Não foi possível confirmar sua sessão a tempo. Tente novamente.')
                setCheckingAuth(false)
            }
        }, 10000)

        async function checkUser() {
            let keepChecking = false
            try {
                let targetAuthId = authUser?.id || null

                if (!targetAuthId) {
                    const sessionResult = await Promise.race([
                        supabase.auth.getSession(),
                        new Promise<any>((resolve) =>
                            setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 4500)
                        ),
                    ])
                    targetAuthId = sessionResult?.data?.session?.user?.id || null

                    if (!targetAuthId) {
                        // Never redirect prematurely while AuthContext is still resolving or timed out
                        if (authLoading) {
                            keepChecking = true
                            return
                        }
                        if (sessionResult?.timedOut) {
                            if (isMounted) {
                                setAuthError('Não foi possível confirmar sua sessão a tempo. Tente novamente.')
                            }
                            return
                        }
                        const redirectTarget = editIdParam
                            ? `/marketplace/vender?edit=${encodeURIComponent(editIdParam)}`
                            : '/marketplace/vender'
                        router.push(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
                        return
                    }
                }

                const { data: userProfile, error: profileErr } = await Promise.race([
                    supabase
                        .from('users')
                        .select('id, name, role')
                        .eq('supabase_user_id', targetAuthId)
                        .maybeSingle(),
                    new Promise<{ data: any; error: any }>((resolve) =>
                        setTimeout(() => resolve({ data: null, error: new Error('Profile query timeout') }), 4500)
                    ),
                ])

                if (!isMounted) return

                if (profileErr) {
                    console.warn('Erro ao carregar perfil em /marketplace/vender:', profileErr)
                    setAuthError('Falha ao carregar seu perfil de vendedor. Verifique sua conexão e tente novamente.')
                    return
                }

                if (!userProfile) {
                    const redirectTarget = editIdParam
                        ? `/marketplace/vender?edit=${encodeURIComponent(editIdParam)}`
                        : '/marketplace/vender'
                    router.push(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
                    return
                }

                setAuthError(null)
                setProfile(userProfile)
            } catch (err) {
                console.warn('Erro ao validar usuário em /marketplace/vender:', err)
                if (isMounted) {
                    setAuthError('Erro ao validar sessão. Tente novamente.')
                }
            } finally {
                if (!keepChecking) {
                    clearTimeout(safetyTimer)
                    if (isMounted) setCheckingAuth(false)
                }
            }
        }

        checkUser()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [router, authProfile, authUser?.id, authLoading, editIdParam, authRetryCount])

    // Load existing listing when in Edit Mode (?edit=<id>)
    useEffect(() => {
        if (!editIdParam) {
            setEditLoadError(null)
            setLoadingProduct(false)
            return
        }

        if (!isValidUuid(editIdParam)) {
            setEditLoadError('ID de anúncio inválido para edição.')
            setLoadingProduct(false)
            return
        }

        if (!profile?.id) return

        let isMounted = true
        setLoadingProduct(true)
        setEditLoadError(null)

        async function loadExistingProduct() {
            try {
                const { data, error } = await Promise.race([
                    supabase
                        .from('marketplace_products')
                        .select('id, seller_id, title, description, price, category, formats, image_url, image_urls, file_url, storage_path, is_bundle, items_count')
                        .eq('id', editIdParam)
                        .maybeSingle(),
                    new Promise<{ data: any; error: any }>((resolve) =>
                        setTimeout(() => resolve({ data: null, error: new Error('Product fetch timeout') }), 6000)
                    ),
                ])

                if (!isMounted) return

                if (error) {
                    console.error('Erro ao carregar anúncio para edição:', error)
                    setEditLoadError('Não foi possível carregar os dados do anúncio. Tente novamente.')
                    return
                }

                if (!data) {
                    setEditLoadError('Anúncio não encontrado.')
                    return
                }

                const isListingOwner =
                    data.seller_id === profile.id || Boolean(authUser?.id && data.seller_id === authUser.id)
                if (!isListingOwner) {
                    setEditLoadError('Você não tem permissão para editar este anúncio.')
                    return
                }

                setTitle(data.title || '')
                setDescription(data.description || '')
                setPrice(data.price !== null && data.price !== undefined ? Number(data.price).toFixed(2) : '19.90')
                setCategory(data.category || 'geral')
                const bundleFlag = Boolean(data.is_bundle)
                setIsBundle(bundleFlag)
                setItemsCount(bundleFlag ? Math.min(20, Math.max(2, Number(data.items_count) || 2)) : 2)

                const normalized = normalizeFormatsArray(data.formats)
                setSelectedFormats(normalized.length > 0 ? normalized : ['PES', 'DST', 'JEF'])

                const rawGallery = Array.isArray(data.image_urls) ? data.image_urls : []
                const coverUrl = typeof data.image_url === 'string' ? data.image_url.trim() : ''
                const orderedUrls = Array.from(
                    new Set(
                        [coverUrl, ...rawGallery.map((u: unknown) => (typeof u === 'string' ? u.trim() : ''))]
                            .filter(Boolean)
                    )
                ).slice(0, MAX_PHOTOS)

                // Revoke any prior local object URLs before hydrating existing remote URLs
                objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
                objectUrlsRef.current.clear()

                const hydratedPhotos: PhotoItem[] = orderedUrls.map((url, idx) => ({
                    id: `existing_${idx}_${generateLocalId()}`,
                    url,
                    isExisting: true,
                }))
                setPhotos(hydratedPhotos)
                setCoverId(hydratedPhotos[0]?.id || null)

                setExistingFileUrl(data.file_url || null)
                setExistingStoragePath(data.storage_path || null)
            } catch (err) {
                console.error('Erro inesperado ao carregar anúncio:', err)
                if (isMounted) {
                    setEditLoadError('Erro inesperado ao carregar o anúncio.')
                }
            } finally {
                if (isMounted) setLoadingProduct(false)
            }
        }

        loadExistingProduct()

        return () => {
            isMounted = false
        }
    }, [editIdParam, profile?.id, authUser?.id])

    const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        e.target.value = ''
        if (files.length === 0) return

        setErrorMessage(null)

        const validFiles: File[] = []
        for (const file of files) {
            const ext = (file.name.split('.').pop() || '').toLowerCase()
            const mime = (file.type || '').toLowerCase()

            if (ext === 'svg' || ext === 'html' || ext === 'htm' || mime === 'image/svg+xml' || mime === 'text/html') {
                setErrorMessage('Formato de imagem não permitido. Envie apenas JPG, PNG, WEBP ou GIF.')
                return
            }

            if (!ALLOWED_IMAGE_EXTS.has(ext) || (mime && !ALLOWED_IMAGE_MIMES.has(mime))) {
                setErrorMessage(`Arquivo "${file.name}" inválido. Use apenas imagens JPG, PNG, WEBP ou GIF.`)
                return
            }

            const sizeMb = file.size / (1024 * 1024)
            if (sizeMb > MAX_PREVIEW_RAW_MB) {
                setErrorMessage(`A imagem "${file.name}" excede ${MAX_PREVIEW_RAW_MB} MB.`)
                return
            }

            validFiles.push(file)
        }

        if (photos.length + validFiles.length > MAX_PHOTOS) {
            setErrorMessage(
                `Limite máximo de ${MAX_PHOTOS} fotos por anúncio (1 capa + ${MAX_PHOTOS - 1} adicionais). Você já adicionou ${photos.length}.`
            )
            return
        }

        const newItems: PhotoItem[] = validFiles.map((file) => {
            const url = URL.createObjectURL(file)
            objectUrlsRef.current.add(url)
            return {
                id: generateLocalId(),
                url,
                file,
                isExisting: false,
            }
        })

        setPhotos((prev) => {
            const next = [...prev, ...newItems]
            if (!coverId || !next.some((p) => p.id === coverId)) {
                setCoverId(next[0]?.id || null)
            }
            return next
        })
    }

    const handleRemovePhoto = (photoId: string) => {
        setErrorMessage(null)
        setPhotos((prev) => {
            const target = prev.find((p) => p.id === photoId)
            if (target && !target.isExisting && objectUrlsRef.current.has(target.url)) {
                URL.revokeObjectURL(target.url)
                objectUrlsRef.current.delete(target.url)
            }
            const remaining = prev.filter((p) => p.id !== photoId)
            if (coverId === photoId) {
                setCoverId(remaining[0]?.id || null)
            }
            return remaining
        })
    }

    const MAX_TOTAL_SIZE_MB = 30
    const MAX_SINGLE_FILE_MB = 2
    const MAX_BUNDLE_ITEMS = 20

    const handleMatrixFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
        mode: 'append' | 'replace' = 'append'
    ) => {
        const incomingFiles = Array.from(e.target.files || [])
        if (incomingFiles.length === 0) return

        let incomingZipEntriesTotal = 0

        for (const file of incomingFiles) {
            const fileExt = (file.name.split('.').pop() || '').toLowerCase()
            if (BLOCKED_MATRIX_EXTS.has(fileExt)) {
                setErrorMessage(`Tipo de arquivo ".${fileExt}" bloqueado por segurança (${file.name}).`)
                e.target.value = ''
                return
            }

            const sizeInMb = file.size / (1024 * 1024)
            const isZip = file.name.toLowerCase().endsWith('.zip')

            // 1. Validação de arquivo individual (fora de ZIP)
            if (!isZip) {
                if (sizeInMb > MAX_SINGLE_FILE_MB) {
                    setErrorMessage(`A matriz "${file.name}" excede o limite máximo de ${MAX_SINGLE_FILE_MB} MB (${sizeInMb.toFixed(2)} MB).`)
                    e.target.value = ''
                    return
                }
                continue
            }

            // 2. Validação do tamanho do ZIP individual
            if (sizeInMb > MAX_TOTAL_SIZE_MB) {
                setErrorMessage(`O pacote "${file.name}" excede o limite total de ${MAX_TOTAL_SIZE_MB} MB (${sizeInMb.toFixed(1)} MB).`)
                e.target.value = ''
                return
            }

            // 3. Inspeção interna do ZIP: cada arquivo interno <= 2 MB e total de arquivos <= 20
            try {
                const zip = await JSZip.loadAsync(file)
                const entries = Object.values(zip.files).filter((f) => !f.dir && !f.name.startsWith('__MACOSX/'))
                incomingZipEntriesTotal += entries.length

                if (entries.length > MAX_BUNDLE_ITEMS) {
                    setErrorMessage(`O pacote "${file.name}" contém ${entries.length} arquivos. O limite máximo permitido é de ${MAX_BUNDLE_ITEMS} arquivos por anúncio.`)
                    e.target.value = ''
                    return
                }

                for (const entry of entries) {
                    const entryExt = (entry.name.split('.').pop() || '').toLowerCase()
                    if (BLOCKED_MATRIX_EXTS.has(entryExt)) {
                        setErrorMessage(`O arquivo "${entry.name}" dentro do ZIP possui extensão bloqueada por segurança.`)
                        e.target.value = ''
                        return
                    }
                    const uncompressedBytes = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0
                    const entryMb = uncompressedBytes / (1024 * 1024)
                    if (entryMb > MAX_SINGLE_FILE_MB) {
                        setErrorMessage(`O arquivo "${entry.name}" dentro do ZIP tem ${entryMb.toFixed(2)} MB. O limite máximo por arquivo individual é de ${MAX_SINGLE_FILE_MB} MB.`)
                        e.target.value = ''
                        return
                    }
                }
            } catch (err) {
                console.warn('Erro ao ler zip para validacao:', err)
            }
        }

        const mergedMap = new Map<string, File>()
        if (mode === 'append') {
            for (const existing of matrixFiles) {
                mergedMap.set(existing.name, existing)
            }
        }
        for (const incoming of incomingFiles) {
            mergedMap.set(incoming.name, incoming)
        }
        const candidateFiles = Array.from(mergedMap.values())

        if (candidateFiles.length > MAX_BUNDLE_ITEMS) {
            setErrorMessage(`Você selecionou ${candidateFiles.length} arquivos. O limite máximo permitido é de ${MAX_BUNDLE_ITEMS} arquivos por anúncio.`)
            e.target.value = ''
            return
        }

        const nonZipCount = candidateFiles.filter((f) => !f.name.toLowerCase().endsWith('.zip')).length
        if (incomingZipEntriesTotal > 0 && nonZipCount + incomingZipEntriesTotal > MAX_BUNDLE_ITEMS) {
            setErrorMessage(`Somando os itens dos arquivos ZIP, o pacote ultrapassa o limite máximo de ${MAX_BUNDLE_ITEMS} arquivos por anúncio.`)
            e.target.value = ''
            return
        }

        const totalBytes = candidateFiles.reduce((sum, f) => sum + f.size, 0)
        const totalMb = totalBytes / (1024 * 1024)
        if (totalMb > MAX_TOTAL_SIZE_MB) {
            setErrorMessage(`Os arquivos selecionados somam ${totalMb.toFixed(1)} MB, excedendo o limite total de ${MAX_TOTAL_SIZE_MB} MB.`)
            e.target.value = ''
            return
        }

        setErrorMessage(null)
        setMatrixFiles(candidateFiles)
        e.target.value = ''
    }

    const handleRemoveMatrixFile = (indexToRemove: number) => {
        setMatrixFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove))
        setErrorMessage(null)
    }

    const toggleFormat = (format: string) => {
        const clean = normalizeFormatToken(format)
        if (!clean) return
        setFormatError(null)
        if (selectedFormats.includes(clean)) {
            if (selectedFormats.length > 1) {
                setSelectedFormats(selectedFormats.filter((f) => f !== clean))
            } else {
                setFormatError('Mantenha pelo menos 1 formato selecionado.')
            }
        } else {
            setSelectedFormats([...selectedFormats, clean])
        }
    }

    const handleAddCustomFormat = () => {
        const raw = customFormatInput.trim()
        if (!raw) return

        const tokens = raw.split(/[\s,;]+/).filter(Boolean)
        const invalidTokens: string[] = []
        const validNew: string[] = []

        for (const token of tokens) {
            const clean = normalizeFormatToken(token)
            if (!clean || !FORMAT_CODE_REGEX.test(clean)) {
                invalidTokens.push(token)
                continue
            }
            if (!selectedFormats.includes(clean) && !validNew.includes(clean)) {
                validNew.push(clean)
            }
        }

        if (invalidTokens.length > 0) {
            setFormatError(`Formato inválido (${invalidTokens.join(', ')}). Use letras/números sem caracteres especiais (ex: ART, VIP, PEC).`)
            return
        }

        setFormatError(null)
        if (validNew.length > 0) {
            setSelectedFormats((prev) => [...prev, ...validNew])
        }
        setCustomFormatInput('')
    }

    const customFormats = selectedFormats.filter((fmt) => !PRESET_FORMAT_CODES.includes(fmt))

    // Calculations (Marketplace: 15% Participação da plataforma + R$ 1,00 Custo da transação)
    const numPrice = parseFloat(price.replace(',', '.')) || 0
    const platformShare = Number((numPrice * 0.15).toFixed(2))
    const transactionCost = numPrice > 0 ? 1.0 : 0.0
    const sellerNet = Math.max(0, Number((numPrice - platformShare - transactionCost).toFixed(2)))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)
        setSuccessMessage(null)

        if (!profile?.id) {
            setErrorMessage('Sua sessão ainda está sendo validada. Aguarde um instante ou faça login novamente.')
            return
        }

        if (!title.trim()) {
            setErrorMessage('Informe o título da matriz ou pacote.')
            return
        }

        if (numPrice < MIN_PRICE) {
            setErrorMessage(`O valor mínimo para anúncios no Marketplace é R$ ${MIN_PRICE.toFixed(2).replace('.', ',')}.`)
            return
        }

        const normalizedFormats = normalizeFormatsArray(selectedFormats)
        if (normalizedFormats.length === 0) {
            setErrorMessage('Selecione ou informe pelo menos 1 formato de matriz.')
            return
        }

        if (photos.length === 0) {
            setErrorMessage('Adicione pelo menos 1 foto de capa do bordado.')
            return
        }

        if (photos.length > MAX_PHOTOS) {
            setErrorMessage(`Limite máximo de ${MAX_PHOTOS} fotos por anúncio (1 capa + ${MAX_PHOTOS - 1} adicionais).`)
            return
        }

        if (isBundle && (itemsCount < 2 || itemsCount > MAX_BUNDLE_ITEMS)) {
            setErrorMessage(`Em pacotes, você pode incluir entre 2 e ${MAX_BUNDLE_ITEMS} matrizes por produto.`)
            return
        }

        if (!isEditMode && matrixFiles.length === 0) {
            setErrorMessage('Envie o(s) arquivo(s) digital(is) (.ZIP ou matrizes) para entrega aos compradores.')
            return
        }

        if (matrixFiles.length > MAX_BUNDLE_ITEMS) {
            setErrorMessage(`O limite máximo permitido é de ${MAX_BUNDLE_ITEMS} arquivos por anúncio.`)
            return
        }

        if (matrixFiles.length > 0) {
            const totalBytes = matrixFiles.reduce((sum, f) => sum + f.size, 0)
            const totalMb = totalBytes / (1024 * 1024)

            if (totalMb > MAX_TOTAL_SIZE_MB) {
                setErrorMessage(`O pacote excede o limite total de ${MAX_TOTAL_SIZE_MB} MB.`)
                return
            }

            for (const f of matrixFiles) {
                const fileMb = f.size / (1024 * 1024)
                const isZip = f.name.toLowerCase().endsWith('.zip')
                if (!isZip && fileMb > MAX_SINGLE_FILE_MB) {
                    setErrorMessage(`O arquivo "${f.name}" excede o limite de ${MAX_SINGLE_FILE_MB} MB por arquivo único.`)
                    return
                }
            }
        }

        setLoading(true)

        try {
            // 1. Order photos with selected cover first
            const effectiveCoverId = photos.some((p) => p.id === coverId) ? coverId : photos[0].id
            const coverItem = photos.find((p) => p.id === effectiveCoverId) || photos[0]
            const orderedPhotos = [coverItem, ...photos.filter((p) => p.id !== coverItem.id)]

            const uploadedResults = await Promise.all(orderedPhotos.map(async (item, idx): Promise<string | null> => {
                if (item.isExisting) {
                    return item.url
                }
                if (!item.file) return null

                const optimized = await optimizeImageFile(item.file, 1600, 0.82)
                const readySizeMb = optimized.size / (1024 * 1024)
                if (readySizeMb > MAX_PREVIEW_UPLOAD_MB) {
                    throw new Error(`A foto "${item.file.name}" excede ${MAX_PREVIEW_UPLOAD_MB} MB mesmo após otimização.`)
                }

                const safeExt = getSafeImageExtension(optimized as File)
                const rand = Math.random().toString(36).slice(2, 8)
                const imagePath = `${profile.id}/${Date.now()}_${idx}_${rand}_preview.${safeExt}`

                const { error: uploadImgErr } = await supabase.storage
                    .from('marketplace-previews')
                    .upload(imagePath, optimized, {
                        upsert: false,
                        contentType: optimized.type || `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
                    })

                if (uploadImgErr) {
                    throw new Error(`Falha no upload da foto ${idx + 1}: ${uploadImgErr.message}`)
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('marketplace-previews')
                    .getPublicUrl(imagePath)

                return publicUrl
            }))
            const uploadedUrls = uploadedResults.filter((url): url is string => Boolean(url))

            if (uploadedUrls.length === 0) {
                throw new Error('Nenhuma foto válida disponível para o anúncio.')
            }

            const coverImageUrl = uploadedUrls[0]

            // 2. Upload matrix file(s) if provided (required on create, optional on edit)
            let finalFileUrl = existingFileUrl
            let finalStoragePath = existingStoragePath

            if (matrixFiles.length > 0) {
                for (const f of matrixFiles) {
                    const rawExt = (f.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                    if (BLOCKED_MATRIX_EXTS.has(rawExt)) {
                        throw new Error(`Tipo de arquivo ".${rawExt}" bloqueado por segurança.`)
                    }
                }

                const rand = Math.random().toString(36).slice(2, 8)
                const folderPrefix = `${profile.id}/${Date.now()}_${rand}`
                let filePath = ''
                let uploadPayload: File | Blob
                let uploadOptions: { upsert: false; contentType?: string } = { upsert: false }

                if (matrixFiles.length === 1) {
                    const singleFile = matrixFiles[0]
                    const safeFileName = toSafeStorageFileName(singleFile.name)
                    filePath = `${folderPrefix}/${safeFileName}`
                    uploadPayload = singleFile
                } else {
                    const bundleZip = new JSZip()
                    for (const f of matrixFiles) {
                        bundleZip.file(f.name, f)
                    }
                    const zipBlob = await bundleZip.generateAsync({ type: 'blob' })
                    const firstRawName = (matrixFiles[0].name.split(/[/\\]/).pop() || 'matrizes').trim()
                    const lastDot = firstRawName.lastIndexOf('.')
                    const firstBase = lastDot > 0 ? firstRawName.slice(0, lastDot) : firstRawName
                    const safeZipName = toSafeStorageFileName(`${firstBase || 'matrizes'}.zip`)
                    filePath = `${folderPrefix}/${safeZipName}`
                    uploadPayload = zipBlob
                    uploadOptions = { upsert: false, contentType: 'application/zip' }
                }

                const { error: uploadFileErr } = await supabase.storage
                    .from('marketplace-files')
                    .upload(filePath, uploadPayload, uploadOptions)

                if (uploadFileErr) {
                    throw new Error(`Falha no upload do arquivo da matriz: ${uploadFileErr.message}`)
                }

                const { data: { publicUrl: fileUrl } } = supabase.storage
                    .from('marketplace-files')
                    .getPublicUrl(filePath)

                finalFileUrl = fileUrl
                finalStoragePath = filePath
            }

            const finalItemsCount = isBundle ? Math.min(MAX_BUNDLE_ITEMS, Math.max(2, itemsCount)) : 1

            if (isEditMode && editIdParam) {
                // 3a. Edit existing product via authenticated PATCH API
                const { data: { session } } = await supabase.auth.getSession()
                const token = session?.access_token
                if (!token) {
                    throw new Error('Sessão expirada. Faça login novamente para salvar alterações.')
                }

                const patchPayload: Record<string, any> = {
                    title: title.trim(),
                    description: description.trim() || null,
                    price: numPrice,
                    category,
                    formats: normalizedFormats,
                    image_url: coverImageUrl,
                    image_urls: uploadedUrls,
                    is_bundle: isBundle,
                    items_count: finalItemsCount,
                }

                if (matrixFiles.length > 0 && finalFileUrl && finalStoragePath) {
                    patchPayload.file_url = finalFileUrl
                    patchPayload.storage_path = finalStoragePath
                }

                const res = await fetch(`/api/marketplace/products/${editIdParam}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(patchPayload),
                })

                const resData = await res.json().catch(() => ({}))
                if (!res.ok) {
                    throw new Error(resData.error || 'Erro ao atualizar anúncio.')
                }

                clearCache('marketplace_products')
                clearCache(`marketplace_product_${editIdParam}`)
                setSuccessMessage('Anúncio atualizado com sucesso!')
                setTimeout(() => {
                    router.push(`/marketplace/${editIdParam}`)
                }, 1000)
            } else {
                // 3b. Insert new product record
                const { data: insertedProduct, error: insertErr } = await supabase
                    .from('marketplace_products')
                    .insert({
                        seller_id: profile.id,
                        title: title.trim(),
                        description: description.trim() || null,
                        price: numPrice,
                        image_url: coverImageUrl,
                        image_urls: uploadedUrls,
                        file_url: finalFileUrl,
                        storage_path: finalStoragePath,
                        formats: normalizedFormats,
                        category,
                        is_bundle: isBundle,
                        items_count: finalItemsCount,
                        sales_count: 0,
                        is_active: true,
                    })
                    .select('id')
                    .single()

                if (insertErr) {
                    throw new Error(`Erro ao salvar produto: ${insertErr.message}`)
                }

                clearCache('marketplace_products')
                setSuccessMessage('Matriz publicada com sucesso na sua lojinha!')
                setTimeout(() => {
                    router.push(`/marketplace/${insertedProduct.id}`)
                }, 1200)
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Erro inesperado ao salvar produto.')
        } finally {
            setLoading(false)
        }
    }

    if (checkingAuth || loadingProduct) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
            </div>
        )
    }

    if (authError && !profile) {
        return (
            <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#16191F] border border-white/10 rounded-3xl p-8 text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                    <h2 className="text-xl font-bold text-white">Sessão pendente</h2>
                    <p className="text-sm text-gray-400">{authError}</p>
                    <button
                        type="button"
                        onClick={() => {
                            setAuthError(null)
                            setCheckingAuth(true)
                            setAuthRetryCount((c) => c + 1)
                        }}
                        className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFAE00] text-[#0F1115] font-bold text-sm hover:brightness-110 transition-all"
                    >
                        <RefreshCw className="w-4 h-4" /> Tentar novamente
                    </button>
                </div>
            </div>
        )
    }

    if (editLoadError) {
        return (
            <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#16191F] border border-white/10 rounded-3xl p-8 text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                    <h2 className="text-xl font-bold text-white">Não foi possível abrir a edição</h2>
                    <p className="text-sm text-gray-400">{editLoadError}</p>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Link
                            href="/marketplace"
                            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                        </Link>
                        {profile?.id && (
                            <Link
                                href={`/loja/${profile.id}`}
                                className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FFAE00] text-[#0F1115] text-sm font-bold hover:brightness-110 transition-all"
                            >
                                <Store className="w-4 h-4" /> Minha Loja
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] py-10 px-4 sm:px-6 lg:px-8 pb-24 md:pb-10">
            <div className="max-w-3xl mx-auto">
                {/* Back button */}
                <div className="mb-6 flex items-center justify-between gap-4">
                    <Link
                        href={isEditMode && editIdParam ? `/marketplace/${editIdParam}` : '/marketplace'}
                        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#FFAE00] transition-colors min-h-[44px]"
                    >
                        <ArrowLeft className="w-4 h-4" /> {isEditMode ? 'Voltar para o Anúncio' : 'Voltar ao Marketplace'}
                    </Link>
                </div>

                {/* Header Card (R4: parágrafo promocional removido) */}
                <div className="bg-[#16191F] border border-white/5 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFAE00]/10 border border-[#FFAE00]/20 text-[#FFAE00] text-xs font-bold uppercase tracking-wider mb-3">
                        <Store className="w-3.5 h-3.5" /> Sua Lojinha de Matrizes
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {isEditMode ? 'Editar Anúncio de Matriz' : 'Anunciar Matriz para Venda'}
                    </h1>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6 bg-[#16191F]/60 border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl">
                    {errorMessage && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-xs sm:text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs sm:text-sm">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                            Título da Matriz / Coleção *
                        </label>
                        <input
                            type="text"
                            required
                            maxLength={160}
                            placeholder="Ex: Leão Geométrico 3D ou Pacote 50 Matrizes Florais"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-colors"
                        />
                    </div>

                    {/* Bundle or Single Switch */}
                    <div className="bg-[#0F1115] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-sm font-bold text-white block">Tipo de Produto</span>
                            <span className="text-xs text-gray-400">É uma matriz única ou um pacote com várias matrizes?</span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#16191F] p-1 rounded-xl border border-white/5">
                            <button
                                type="button"
                                onClick={() => setIsBundle(false)}
                                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    !isBundle
                                        ? 'bg-[#FFAE00] text-[#0F1115] shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Matriz Individual
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsBundle(true)
                                    if (itemsCount < 2) setItemsCount(2)
                                }}
                                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    isBundle
                                        ? 'bg-[#FFAE00] text-[#0F1115] shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5 inline mr-1" /> Pacote / Coleção
                            </button>
                        </div>
                    </div>

                    {/* Items count if bundle */}
                    {isBundle && (
                        <div className="p-4 bg-[#FFAE00]/5 border border-[#FFAE00]/20 rounded-2xl">
                            <label className="block text-xs font-bold text-[#FFAE00] uppercase tracking-wider mb-2">
                                Quantas matrizes estão inclusas neste pacote?
                            </label>
                            <input
                                type="number"
                                min={2}
                                max={20}
                                value={itemsCount}
                                onChange={(e) => setItemsCount(Math.min(20, Math.max(2, parseInt(e.target.value, 10) || 2)))}
                                className="w-32 bg-[#0F1115] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFAE00]"
                            />
                            <p className="text-[11px] text-gray-400 mt-2">
                                Limite de até 20 matrizes por pacote (máx. 30 MB) para manter o download leve e rápido.
                            </p>
                        </div>
                    )}

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                            Categoria
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FFAE00] transition-colors"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                            Descrição e Instruções de Uso
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Descreva detalhes como tamanhos recomendados (ex: 10x10, 13x18, 14x14 cm), quantidade de pontos, tipo de ponto (tatami, cheio) ou dicas para bordar..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-colors"
                        />
                    </div>

                    {/* R2: Formats Badges (Presets + Software Hints + Custom Format Input) */}
                    <div className="space-y-3">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                            Formatos de Máquina e Softwares Inclusos *
                        </label>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {PRESET_FORMAT_OPTIONS.map((fmt) => {
                                const selected = selectedFormats.includes(fmt.code)
                                return (
                                    <button
                                        type="button"
                                        key={fmt.code}
                                        onClick={() => toggleFormat(fmt.code)}
                                        className={`min-h-[48px] px-3 py-2 rounded-xl text-left transition-all border flex flex-col justify-center ${
                                            selected
                                                ? 'bg-[#FFAE00]/15 border-[#FFAE00] text-[#FFAE00]'
                                                : 'bg-[#0F1115] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                        }`}
                                    >
                                        <span className="flex items-center justify-between gap-1 text-xs font-bold">
                                            <span>.{fmt.code}</span>
                                            {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                        </span>
                                        <span className="text-[10px] text-gray-400 leading-tight mt-0.5 truncate">
                                            {fmt.hint}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        {customFormats.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-[11px] text-gray-400 font-semibold">Outros formatos:</span>
                                {customFormats.map((fmt) => (
                                    <span
                                        key={fmt}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFAE00]/15 border border-[#FFAE00] text-[#FFAE00] text-xs font-bold"
                                    >
                                        .{fmt}
                                        <button
                                            type="button"
                                            onClick={() => toggleFormat(fmt)}
                                            aria-label={`Remover formato ${fmt}`}
                                            className="hover:text-red-400 transition-colors p-0.5"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                            <input
                                type="text"
                                value={customFormatInput}
                                onChange={(e) => {
                                    setCustomFormatInput(e.target.value)
                                    if (formatError) setFormatError(null)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddCustomFormat()
                                    }
                                }}
                                placeholder="Outro formato (ex: ART, VIP, PEC)"
                                className="flex-1 bg-[#0F1115] border border-white/10 focus:border-[#FFAE00] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none uppercase"
                            />
                            <button
                                type="button"
                                onClick={handleAddCustomFormat}
                                disabled={!customFormatInput.trim()}
                                className="min-h-[44px] px-4 py-2 bg-white/5 hover:bg-[#FFAE00]/15 text-gray-200 hover:text-[#FFAE00] border border-white/10 hover:border-[#FFAE00]/40 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Adicionar Formato
                            </button>
                        </div>

                        {formatError && (
                            <p className="text-xs text-red-400">{formatError}</p>
                        )}
                        <p className="text-[11px] text-gray-500">
                            Selecione os formatos pré-definidos ou adicione extensões personalizadas disponíveis no pacote.
                        </p>
                    </div>

                    {/* R3: Multi-Photo Preview Upload (1 Capa + até 9 adicionais = máx 10) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                                Fotos do Bordado (1 Capa + até 9 Adicionais) *
                            </label>
                            <span className="text-xs font-bold text-[#FFAE00]">
                                {photos.length}/{MAX_PHOTOS} fotos
                            </span>
                        </div>

                        {photos.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {photos.map((item, index) => {
                                    const isCover = item.id === coverId || (!coverId && index === 0)
                                    return (
                                        <div
                                            key={item.id}
                                            className={`relative rounded-2xl overflow-hidden bg-[#0F1115] border transition-all flex flex-col ${
                                                isCover
                                                    ? 'border-[#FFAE00] ring-2 ring-[#FFAE00]/30'
                                                    : 'border-white/10'
                                            }`}
                                        >
                                            <div className="relative aspect-square w-full bg-[#16191F]">
                                                <img
                                                    src={item.url}
                                                    alt={`Foto ${index + 1}`}
                                                    className="w-full h-full object-cover object-center"
                                                />
                                                {isCover && (
                                                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFAE00] text-[#0F1115] text-[10px] font-black uppercase tracking-wider shadow">
                                                        <Star className="w-3 h-3 fill-current" /> Capa
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePhoto(item.id)}
                                                    aria-label={`Remover foto ${index + 1}`}
                                                    className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/75 hover:bg-red-600 text-white flex items-center justify-center border border-white/15 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {!isCover && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCoverId(item.id)}
                                                    className="w-full min-h-[40px] px-2 py-2 text-[11px] font-bold text-gray-300 hover:text-[#FFAE00] hover:bg-white/5 border-t border-white/10 transition-colors"
                                                >
                                                    Definir como capa
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {photos.length < MAX_PHOTOS && (
                            <label className="border-2 border-dashed border-white/10 hover:border-[#FFAE00]/40 rounded-2xl p-6 text-center transition-colors bg-[#0F1115] relative group cursor-pointer block">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 text-gray-400 flex items-center justify-center mx-auto mb-3 group-hover:text-[#FFAE00] group-hover:scale-105 transition-all">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-bold text-white block mb-1">
                                    {photos.length === 0
                                        ? 'Clique para selecionar as fotos da matriz'
                                        : `Adicionar mais fotos (${MAX_PHOTOS - photos.length} restante${MAX_PHOTOS - photos.length === 1 ? '' : 's'})`}
                                </span>
                                <span className="text-xs text-gray-500 block">
                                    JPG, PNG, WEBP ou GIF • Até 10 fotos (1 capa + 9 adicionais)
                                </span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                                    className="hidden"
                                    onChange={handleImagesChange}
                                />
                            </label>
                        )}
                    </div>

                    {/* Matrix File(s) (.ZIP or multiple matrices) Upload */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                            {isEditMode
                                ? 'Arquivo para Download (.ZIP ou Matrizes) — Opcional na edição'
                                : 'Arquivo para Download (.ZIP ou Matrizes) *'}
                        </label>
                        <div className="border-2 border-dashed border-white/10 hover:border-[#FFAE00]/40 rounded-2xl p-6 text-center transition-colors bg-[#0F1115] relative group">
                            {matrixFiles.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/20">
                                            <FileArchive className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-bold text-white">
                                            {matrixFiles.length === 1
                                                ? '1 arquivo selecionado (nome original preservado)'
                                                : `${matrixFiles.length} arquivos selecionados — serão compactados em .ZIP mantendo os nomes originais`}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Tamanho total: {(matrixFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>

                                    <div className="max-h-52 overflow-y-auto space-y-2 text-left max-w-xl mx-auto">
                                        {matrixFiles.map((file, index) => (
                                            <div
                                                key={`${file.name}-${file.size}-${index}`}
                                                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                                                    <p className="text-[11px] text-gray-400">
                                                        {file.size < 1024 * 100
                                                            ? `${Math.max(1, Math.round(file.size / 1024))} KB`
                                                            : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMatrixFile(index)}
                                                    aria-label={`Remover ${file.name}`}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
                                        {matrixFiles.length < MAX_BUNDLE_ITEMS && (
                                            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFAE00] cursor-pointer hover:underline">
                                                <Plus className="w-3.5 h-3.5" />
                                                Adicionar mais arquivos
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept=".pes,.dst,.jef,.exp,.xxx,.hus,.vp3,.emb,.pxf,.eof,.art,.vip,.pec,.zip"
                                                    className="hidden"
                                                    onChange={(e) => handleMatrixFileChange(e, 'append')}
                                                />
                                            </label>
                                        )}
                                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white cursor-pointer hover:underline">
                                            Substituir todos
                                            <input
                                                type="file"
                                                multiple
                                                accept=".pes,.dst,.jef,.exp,.xxx,.hus,.vp3,.emb,.pxf,.eof,.art,.vip,.pec,.zip"
                                                className="hidden"
                                                onChange={(e) => handleMatrixFileChange(e, 'replace')}
                                            />
                                        </label>
                                    </div>
                                </div>
                            ) : isEditMode && (existingStoragePath || existingFileUrl) ? (
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                                        <FileArchive className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-white">Arquivo atual mantido</p>
                                    <p className="text-xs text-gray-400 truncate max-w-md mx-auto">
                                        {existingStoragePath ? existingStoragePath.split('/').pop() : 'Matriz vinculada ao anúncio'}
                                    </p>
                                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#FFAE00] cursor-pointer hover:underline pt-2">
                                        Enviar novos arquivos para substituir (opcional)
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pes,.dst,.jef,.exp,.xxx,.hus,.vp3,.emb,.pxf,.eof,.art,.vip,.pec,.zip"
                                            className="hidden"
                                            onChange={(e) => handleMatrixFileChange(e, 'replace')}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <label className="cursor-pointer block">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 text-gray-400 flex items-center justify-center mx-auto mb-3 group-hover:text-[#FFAE00] group-hover:scale-105 transition-all">
                                        <UploadCloud className="w-7 h-7" />
                                    </div>
                                    <span className="text-sm font-bold text-white block mb-1">
                                        Clique para anexar os arquivos digitais (1 ou vários)
                                    </span>
                                    <span className="text-xs text-gray-500 block">
                                        Arquivo único: <strong>máx. 2 MB</strong> | Vários arquivos ou (.ZIP): <strong>máx. 30 MB e até 20 arquivos</strong> • Nomes originais preservados
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        required={!isEditMode}
                                        accept=".pes,.dst,.jef,.exp,.xxx,.hus,.vp3,.emb,.pxf,.eof,.art,.vip,.pec,.zip"
                                        className="hidden"
                                        onChange={(e) => handleMatrixFileChange(e, 'append')}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Price and Profit Simulator */}
                    <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                            Preço de Venda (R$ — mínimo R$ 5,00) *
                        </label>
                        <div className="relative w-full sm:w-48 mb-4">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                                R$
                            </span>
                            <input
                                type="text"
                                required
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full bg-[#16191F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-base font-bold text-white focus:outline-none focus:border-[#FFAE00]"
                            />
                        </div>

                        {/* Financial Simulator */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-white/5 text-xs">
                            <div className="bg-[#16191F] p-3 rounded-xl border border-white/5">
                                <span className="text-gray-400 block mb-0.5">Preço Total:</span>
                                <span className="text-base font-bold text-white">
                                    R$ {numPrice.toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-[#16191F] p-3 rounded-xl border border-white/5">
                                <span className="text-gray-400 block mb-0.5">Participação da plataforma (15%):</span>
                                <span className="text-base font-bold text-gray-400">
                                    - R$ {platformShare.toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-[#16191F] p-3 rounded-xl border border-white/5">
                                <span className="text-gray-400 block mb-0.5">Custo da transação:</span>
                                <span className="text-base font-bold text-gray-400">
                                    - R$ {transactionCost.toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-[#FFAE00]/10 p-3 rounded-xl border border-[#FFAE00]/20">
                                <span className="text-[#FFAE00] block mb-0.5 font-bold">Seu Lucro Líquido:</span>
                                <span className="text-base font-black text-[#FFAE00]">
                                    R$ {sellerNet.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full min-h-[52px] py-4 rounded-xl bg-gradient-to-r from-[#FFAE00] to-yellow-400 hover:from-yellow-400 hover:to-[#FFAE00] text-[#0F1115] font-black text-sm uppercase tracking-wider transition-all duration-300 shadow-xl shadow-[#FFAE00]/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-[#0F1115]/30 border-t-[#0F1115] rounded-full animate-spin" />
                                {isEditMode ? 'Salvando alterações...' : 'Publicando na sua lojinha...'}
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                {isEditMode ? 'Salvar Alterações do Anúncio' : 'Publicar Matriz no Marketplace'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function VenderMatrizPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
                </div>
            }
        >
            <VenderMatrizContent />
        </Suspense>
    )
}
