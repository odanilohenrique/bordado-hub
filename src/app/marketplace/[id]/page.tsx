'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { getCached, setCached } from '@/lib/clientCache'
import { 
    ArrowLeft, 
    Download, 
    CheckCircle, 
    Store, 
    Sparkles, 
    ShieldCheck, 
    Zap, 
    Copy, 
    Check, 
    Loader2, 
    AlertCircle,
    Package,
    Clock,
    Pencil,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

const PUBLIC_PRODUCT_DETAIL_COLUMNS =
    'id, seller_id, title, description, price, category, formats, image_url, image_urls, is_bundle, items_count, sales_count, is_active, created_at, seller:seller_id(id, name, avatar_url, rating, reviews_count, supabase_user_id)'

export default function MarketplaceProductPage() {
    const params = useParams()
    const router = useRouter()
    const { user, profile, profileId } = useAuth()
    const productId = params?.id as string

    const [product, setProduct] = useState<any>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [activeImage, setActiveImage] = useState<string | null>(null)
    const [cpfCnpj, setCpfCnpj] = useState('')
    
    // Checkout states
    const [isPurchasing, setIsPurchasing] = useState(false)
    const [orderData, setOrderData] = useState<any>(null)
    const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null)
    const [copied, setCopied] = useState(false)
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'paid'>('idle')
    const [, setDownloadUrl] = useState<string | null>(null)
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownloadSecure = async () => {
        const currentUserId = profileId || profile?.id || user?.id
        if (!currentUserId) {
            toast.error('Faça login para baixar seus arquivos.')
            return
        }

        setIsDownloading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(`/api/marketplace/download/${productId}?userId=${currentUserId}`, {
                headers: {
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
            })
            const data = await res.json()
            if (!res.ok || data.error || !data.downloadUrl) {
                throw new Error(data.error || 'Erro ao gerar download seguro.')
            }

            // Abre o link temporário assinado (expira em 60s)
            window.location.href = data.downloadUrl
            toast.success('Download iniciado com sucesso!')
        } catch (err: any) {
            console.error('Download error:', err)
            toast.error(err.message || 'Falha no download.')
        } finally {
            setIsDownloading(false)
        }
    }
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    // 1. Fetch Product (SSR-safe cache mount + aligned timeouts)
    useEffect(() => {
        if (!productId) return
        let isMounted = true

        const cached = getCached<any>(`marketplace_product_${productId}`)
        if (cached) {
            setProduct(cached)
            setFetchError(null)
            setLoading(false)
        }

        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 8500)

        async function loadProduct() {
            try {
                const queryPromise = supabase
                    .from('marketplace_products')
                    .select(PUBLIC_PRODUCT_DETAIL_COLUMNS)
                    .eq('id', productId)
                    .single()

                const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
                    setTimeout(() => resolve({ data: null, error: new Error('Product query timeout') }), 8000)
                )

                const { data, error } = await Promise.race([queryPromise, timeoutPromise])
                if (!isMounted) return

                if (error) {
                    console.error('Erro ao buscar produto:', error)
                    if ((error as any).code === 'PGRST116') {
                        setProduct(null)
                        setFetchError(null)
                    } else if (!cached) {
                        setFetchError('Não foi possível carregar os detalhes desta matriz. Verifique sua conexão e tente novamente.')
                    }
                } else if (!data) {
                    setProduct(null)
                    setFetchError(null)
                } else {
                    setFetchError(null)
                    setProduct(data)
                    setCached(`marketplace_product_${productId}`, data, 60000)
                }
            } catch (err) {
                console.error('Erro ao carregar produto:', err)
                if (isMounted && !cached) {
                    setFetchError('Não foi possível carregar os detalhes desta matriz. Verifique sua conexão e tente novamente.')
                }
            } finally {
                clearTimeout(safetyTimer)
                if (isMounted) setLoading(false)
            }
        }

        loadProduct()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [productId, retryCount])

    // Reset active gallery photo when product or cover changes
    useEffect(() => {
        setActiveImage(product?.image_url || null)
    }, [product?.id, product?.image_url])

    // 2. Verifica se o usuário logado já comprou este produto
    useEffect(() => {
        if (!productId) return
        if (!user) {
            if (!orderData) {
                setPaymentStatus('idle')
                setDownloadUrl(null)
            }
            return
        }

        const buyerIds = Array.from(new Set([profileId, profile?.id, user.id].filter(Boolean))) as string[]
        if (buyerIds.length === 0) return

        let isMounted = true

        async function checkAlreadyPurchased() {
            try {
                const { data, error } = await supabase
                    .from('marketplace_orders')
                    .select('id, status')
                    .eq('product_id', productId)
                    .in('buyer_id', buyerIds)
                    .eq('status', 'paid')
                    .limit(1)
                    .maybeSingle()

                if (!isMounted || error) {
                    if (error) console.warn('Erro ao verificar compra anterior:', error)
                    return
                }

                if (data) {
                    setPaymentStatus('paid')
                    setDownloadUrl(`/api/marketplace/download/${productId}`)
                }
            } catch (err) {
                console.warn('Erro inesperado ao verificar compra anterior:', err)
            }
        }

        checkAlreadyPurchased()

        return () => {
            isMounted = false
        }
    }, [user, profile?.id, profileId, productId, orderData])

    // 3. Polling de status quando PIX estiver aberto
    useEffect(() => {
        if (paymentStatus !== 'pending' || !orderData?.id) return

        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch('/api/marketplace/check-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: orderData.id })
                })
                const result = await res.json()

                if (result.status === 'paid') {
                    setPaymentStatus('paid')
                    setDownloadUrl(result.downloadUrl)
                    toast.success('Pagamento confirmado! Seu download foi liberado.')
                    if (pollingRef.current) clearInterval(pollingRef.current)
                }
            } catch (err) {
                console.error('Erro no polling de status:', err)
            }
        }, 3000)

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current)
        }
    }, [paymentStatus, orderData])

    // Iniciar compra PIX
    const handleBuyPix = async () => {
        if (!user) {
            toast.error('Faça login para comprar.')
            router.push(`/login?redirect=/marketplace/${productId}`)
            return
        }

        const cleanCpf = cpfCnpj.replace(/\D/g, '')
        if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
            toast.error('Digite um CPF ou CNPJ válido para gerar a cobrança PIX.')
            return
        }

        setIsPurchasing(true)
        try {
            const res = await fetch('/api/marketplace/create-pix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    buyerId: profile?.id || user.id,
                    cpfCnpj: cleanCpf
                })
            })

            const data = await res.json()
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Erro ao gerar PIX.')
            }

            setOrderData(data.order)
            setPixData({
                qrCode: data.pixQrCode,
                copyPaste: data.pixCopyPaste
            })
            setPaymentStatus('pending')
            toast.success('Chave PIX gerada com sucesso! Pague para liberar o download.')
        } catch (err: any) {
            console.error('Erro ao comprar matriz:', err)
            toast.error(err.message || 'Erro ao processar compra.')
        } finally {
            setIsPurchasing(false)
        }
    }

    const handleCopyPix = () => {
        if (!pixData?.copyPaste) return
        navigator.clipboard.writeText(pixData.copyPaste)
        setCopied(true)
        toast.success('Código PIX Copia e Cola copiado!')
        setTimeout(() => setCopied(false), 3000)
    }

    const gallery = useMemo<string[]>(() => {
        if (!product) return []
        const cover = typeof product.image_url === 'string' ? product.image_url.trim() : ''
        const extras = Array.isArray(product.image_urls)
            ? product.image_urls.map((u: unknown) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean)
            : []
        return Array.from(new Set([cover, ...extras].filter(Boolean)))
    }, [product])

    const normalizedFormats = useMemo<string[]>(() => {
        if (!Array.isArray(product?.formats)) return []
        return Array.from(
            new Set(
                product.formats
                    .map((f: unknown) => String(f ?? '').trim().replace(/^\.+/, '').toUpperCase())
                    .filter(Boolean)
            )
        )
    }, [product?.formats])

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#2563EB] dark:text-[#60A5FA] animate-spin" />
            </div>
        )
    }

    if (fetchError && !product) {
        return (
            <div className="min-h-[60vh] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-[#DC2626] dark:text-[#EF4444]" />
                <h1 className="text-xl font-semibold">Erro ao carregar matriz</h1>
                <p className="text-sm text-[var(--text-secondary)] max-w-md">{fetchError}</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setFetchError(null)
                            setLoading(true)
                            setRetryCount((c) => c + 1)
                        }}
                        className="min-h-[48px] inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-colors cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" /> Tentar novamente
                    </button>
                    <Link
                        href="/marketplace"
                        className="min-h-[48px] inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[var(--btn-glass-bg)] border border-[var(--border-glass)] text-[var(--text-primary)] font-semibold text-sm hover:border-[#2563EB]/40 dark:hover:border-[#3B82F6]/40 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                    </Link>
                </div>
            </div>
        )
    }

    if (!product) {
        return (
            <div className="min-h-[60vh] text-[var(--text-primary)] flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-12 h-12 text-[#DC2626] dark:text-[#EF4444] mb-3" />
                <h1 className="text-xl font-semibold">Matriz não encontrada</h1>
                <Link href="/marketplace" className="mt-4 min-h-[44px] px-4 text-[#2563EB] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-2 font-medium">
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                </Link>
            </div>
        )
    }

    const displayedImage = activeImage && gallery.includes(activeImage)
        ? activeImage
        : (gallery[0] || null)
    const activePhotoIndex = displayedImage ? Math.max(0, gallery.indexOf(displayedImage)) : 0

    const isOwnProduct = Boolean(
        product && (
            (profile?.id && product.seller_id === profile.id) ||
            (profileId && product.seller_id === profileId) ||
            (user?.id && (product.seller_id === user.id || product.seller?.supabase_user_id === user.id))
        )
    )

    return (
        <div className="py-2 sm:py-4">
            <div className="max-w-6xl mx-auto">
                {/* Back Link */}
                <Link 
                    href="/marketplace" 
                    className="min-h-[44px] inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar para o Marketplace
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Coluna Esquerda: Preview da Imagem e Galeria */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)]">
                            {displayedImage ? (
                                <Image 
                                    src={displayedImage} 
                                    alt={product.title} 
                                    fill 
                                    unoptimized={displayedImage.toLowerCase().endsWith('.svg')}
                                    sizes="(max-width: 1024px) 100vw, 60vw"
                                    priority
                                    className="object-cover object-center"
                                />
                            ) : (
                                <>
                                    <img
                                        src="/brand/v2/logo-bg-dark.svg"
                                        alt={product.title}
                                        width={720}
                                        height={720}
                                        decoding="async"
                                        className="hidden dark:block w-full h-full object-cover object-center select-none"
                                    />
                                    <img
                                        src="/brand/v2/logo-bg-light.svg"
                                        alt={product.title}
                                        width={720}
                                        height={720}
                                        decoding="async"
                                        className="block dark:hidden w-full h-full object-cover object-center select-none"
                                    />
                                </>
                            )}
                            {product.is_bundle && (
                                <div className="absolute top-4 left-4 bg-[#0F766E] text-white font-semibold text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" />
                                    Pacote ({product.items_count} Matrizes)
                                </div>
                            )}
                            {gallery.length > 1 && (
                                <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-sm border border-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                    {activePhotoIndex + 1}/{gallery.length}
                                </div>
                            )}
                        </div>

                        {gallery.length > 1 && (
                            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
                                {gallery.map((url, idx) => {
                                    const isActive = displayedImage === url
                                    return (
                                        <button
                                            key={`${url}_${idx}`}
                                            type="button"
                                            onClick={() => setActiveImage(url)}
                                            aria-label={`Ver foto ${idx + 1} de ${gallery.length}`}
                                            className={`relative aspect-square min-h-[48px] rounded-xl overflow-hidden border transition-colors bg-[var(--bg-surface-elevated)] cursor-pointer ${
                                                isActive
                                                    ? 'border-[#2563EB] ring-2 ring-[#2563EB]/30 opacity-100'
                                                    : 'border-[var(--border-hairline)] opacity-70 hover:opacity-100'
                                            }`}
                                        >
                                            <Image
                                                src={url}
                                                alt={`${product.title} - foto ${idx + 1}`}
                                                fill
                                                unoptimized={url.toLowerCase().endsWith('.svg')}
                                                sizes="96px"
                                                className="object-cover object-center"
                                            />
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Formatos incluídos */}
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-4">
                            <p className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold mb-2">Formatos Disponíveis no Download:</p>
                            <div className="flex flex-wrap gap-2">
                                {normalizedFormats.length > 0 ? (
                                    normalizedFormats.map((fmt) => (
                                        <span key={fmt} className="bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] px-3 py-1 rounded-lg text-sm font-semibold text-[#2563EB] dark:text-[#60A5FA]">
                                            .{fmt}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-[var(--text-secondary)]">.PES, .DST, .JEF</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Detalhes, Vendedor e Compra */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-6 sm:p-8 space-y-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 uppercase">
                                        {product.category || 'Geral'}
                                    </span>
                                    <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                                        {product.sales_count || 0} {product.sales_count === 1 ? 'venda' : 'vendas'}
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
                                    {product.title}
                                </h1>
                            </div>

                            {/* Preço */}
                            <div className="pt-2 border-t border-[var(--border-hairline)]">
                                <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium">Preço à vista via PIX</span>
                                <div className="text-4xl font-bold text-[var(--text-primary)] mt-1">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))}
                                </div>
                            </div>

                            {/* Vendedor */}
                            <div className="pt-4 border-t border-[var(--border-hairline)]">
                                <Link 
                                    href={`/loja/${product.seller_id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface-elevated)] hover:border-[var(--border-glass)] border border-[var(--border-hairline)] transition-colors group"
                                >
                                    {product.seller?.avatar_url ? (
                                        <img src={product.seller.avatar_url} alt={product.seller.name} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover border border-[var(--border-hairline)]" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] font-semibold flex items-center justify-center">
                                            {product.seller?.name?.[0]?.toUpperCase() || 'P'}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-[var(--text-secondary)]">Criado e vendido por</p>
                                        <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors truncate">
                                            {product.seller?.name || 'Programador BordadoHub'}
                                        </p>
                                    </div>
                                    <Store className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors" />
                                </Link>
                            </div>

                            {/* Bloco de Ação: Download (se pago) ou Checkout PIX */}
                            {paymentStatus === 'paid' ? (
                                <div className="bg-[#0D9488]/10 border border-[#0D9488]/30 rounded-xl p-5 space-y-4 text-center">
                                    <div className="w-12 h-12 bg-[#0D9488]/15 rounded-full flex items-center justify-center mx-auto text-[#0F766E] dark:text-[#14B8A6]">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-[#0F766E] dark:text-[#14B8A6]">Matriz Liberada!</h3>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">Seu pagamento foi confirmado. Baixe os arquivos agora.</p>
                                    </div>
                                    <button
                                        onClick={handleDownloadSecure}
                                        disabled={isDownloading}
                                        className="w-full min-h-[48px] py-3.5 px-4 bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isDownloading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Gerando link seguro...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-5 h-5" />
                                                Baixar Arquivos da Matriz
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : paymentStatus === 'pending' && pixData ? (
                                <div className="bg-[var(--bg-surface-elevated)] border border-[#2563EB]/30 rounded-xl p-5 space-y-4">
                                    <div className="text-center space-y-1">
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">
                                            <Clock className="w-4 h-4 animate-spin" />
                                            Aguardando pagamento PIX...
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)]">Escaneie o QR Code ou copie o código abaixo</p>
                                    </div>

                                    {/* QR Code Img (fundo branco fixo para leitura por câmera em ambos os temas) */}
                                    <div className="bg-white p-3 rounded-xl mx-auto w-48 h-48 flex items-center justify-center border border-[var(--border-hairline)]">
                                        <img 
                                            src={`data:image/png;base64,${pixData.qrCode}`} 
                                            alt="QR Code PIX" 
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    {/* Copia e Cola */}
                                    <button
                                        onClick={handleCopyPix}
                                        className="w-full min-h-[44px] py-2.5 px-3 bg-[var(--btn-glass-bg)] hover:border-[var(--border-glass)] border border-[var(--border-hairline)] rounded-lg text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" /> : <Copy className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />}
                                        {copied ? 'Código Copiado!' : 'Copiar Chave Copia e Cola'}
                                    </button>

                                    <div className="text-[11px] text-[var(--text-secondary)] text-center">
                                        Assim que pagar no app do seu banco, esta página liberará o download automaticamente.
                                    </div>
                                </div>
                            ) : isOwnProduct ? (
                                <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl p-4 text-center space-y-3">
                                    <p className="text-xs text-[var(--text-secondary)]">Esta matriz pertence à sua loja.</p>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                                        <Link
                                            href={`/marketplace/vender?edit=${product.id}`}
                                            className="w-full sm:w-auto min-h-[48px] px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" /> Editar Matriz
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={handleDownloadSecure}
                                            disabled={isDownloading}
                                            className="w-full sm:w-auto min-h-[48px] px-4 py-2.5 rounded-lg bg-[var(--btn-glass-bg)] hover:border-[var(--border-glass)] disabled:opacity-50 border border-[var(--border-hairline)] text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                        >
                                            {isDownloading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Gerando link seguro...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4" /> Baixar arquivo original
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                            CPF ou CNPJ para emissão do PIX:
                                        </label>
                                        <input
                                            type="text"
                                            value={cpfCnpj}
                                            onChange={(e) => setCpfCnpj(e.target.value)}
                                            placeholder="000.000.000-00"
                                            className="w-full min-h-[44px] px-3.5 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 transition-colors"
                                        />
                                    </div>

                                    <button
                                        onClick={handleBuyPix}
                                        disabled={isPurchasing}
                                        className="w-full min-h-[48px] py-4 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-base rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {isPurchasing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Gerando cobrança PIX...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-5 h-5 fill-current" />
                                                Comprar com PIX e Baixar Agora
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)] pt-2">
                                        <ShieldCheck className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
                                        Entrega imediata e garantia BordadoHub
                                    </div>
                                </div>
                            )}

                            {/* Descrição */}
                            {product.description && (
                                <div className="pt-4 border-t border-[var(--border-hairline)]">
                                    <h3 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold mb-2">Descrição da Matriz:</h3>
                                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                                        {product.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
