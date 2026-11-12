'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
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
    Tag,
    Clock
} from 'lucide-react'
import { toast } from 'sonner'

export default function MarketplaceProductPage() {
    const params = useParams()
    const router = useRouter()
    const { user, profile } = useAuth()
    const productId = params?.id as string

    const [product, setProduct] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [cpfCnpj, setCpfCnpj] = useState('')
    
    // Checkout states
    const [isPurchasing, setIsPurchasing] = useState(false)
    const [orderData, setOrderData] = useState<any>(null)
    const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null)
    const [copied, setCopied] = useState(false)
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'paid'>('idle')
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    // 1. Fetch Product
    useEffect(() => {
        if (!productId) return

        async function loadProduct() {
            try {
                const { data, error } = await supabase
                    .from('marketplace_products')
                    .select('*, seller:seller_id(id, name, avatar_url, rating, reviews_count)')
                    .eq('id', productId)
                    .single()

                if (error || !data) {
                    console.error('Produto não encontrado:', error)
                    toast.error('Produto não encontrado.')
                } else {
                    setProduct(data)
                }
            } catch (err) {
                console.error('Erro ao carregar produto:', err)
            } finally {
                setLoading(false)
            }
        }

        loadProduct()
    }, [productId])

    // 2. Verifica se o usuário logado já comprou este produto
    useEffect(() => {
        if (!user || !productId) return

        async function checkAlreadyPurchased() {
            const currentId = profile?.id || user?.id
            if (!currentId) return

            const { data } = await supabase
                .from('marketplace_orders')
                .select('id, status, product:product_id(file_url)')
                .eq('product_id', productId)
                .eq('buyer_id', currentId)
                .eq('status', 'paid')
                .maybeSingle()

            if (data) {
                setPaymentStatus('paid')
                const fileUrl = (data as any).product?.file_url
                if (fileUrl) setDownloadUrl(fileUrl)
            }
        }

        checkAlreadyPurchased()
    }, [user, profile, productId])

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
                    toast.success('🎉 Pagamento confirmado! Seu download foi liberado.')
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0D11] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#FFAE00] animate-spin" />
            </div>
        )
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-[#0B0D11] text-white flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                <h1 className="text-xl font-bold">Matriz não encontrada</h1>
                <Link href="/marketplace" className="mt-4 text-[#FFAE00] hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                </Link>
            </div>
        )
    }

    const isOwnProduct = user && product.seller_id === (profile?.id || user.id)

    return (
        <div className="min-h-screen bg-[#0B0D11] text-white py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Back Link */}
                <Link 
                    href="/marketplace" 
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar para o Marketplace
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Coluna Esquerda: Preview da Imagem */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#161920] border border-white/10 shadow-2xl">
                            <Image 
                                src={product.image_url} 
                                alt={product.title} 
                                fill 
                                sizes="(max-width: 1024px) 100vw, 60vw"
                                priority
                                className="object-cover"
                            />
                            {product.is_bundle && (
                                <div className="absolute top-4 left-4 bg-gradient-to-r from-[#FFAE00] to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" />
                                    Pacote ({product.items_count} Matrizes)
                                </div>
                            )}
                        </div>

                        {/* Formatos incluídos */}
                        <div className="bg-[#12151C] border border-white/5 rounded-xl p-4">
                            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Formatos Disponíveis no Download:</p>
                            <div className="flex flex-wrap gap-2">
                                {product.formats && product.formats.length > 0 ? (
                                    product.formats.map((fmt: string) => (
                                        <span key={fmt} className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-sm font-bold text-[#FFAE00]">
                                            .{fmt.toUpperCase()}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-400">PES, DST, JEF</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Detalhes, Vendedor e Compra */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-[#12151C] border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#FFAE00]/10 text-[#FFAE00] border border-[#FFAE00]/20 uppercase">
                                        {product.category || 'Geral'}
                                    </span>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-[#FFAE00]" />
                                        {product.sales_count || 0} {product.sales_count === 1 ? 'venda' : 'vendas'}
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                                    {product.title}
                                </h1>
                            </div>

                            {/* Preço */}
                            <div className="pt-2 border-t border-white/5">
                                <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">Preço à vista via PIX</span>
                                <div className="text-4xl font-black text-[#FFAE00] mt-1">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))}
                                </div>
                            </div>

                            {/* Vendedor */}
                            <div className="pt-4 border-t border-white/5">
                                <Link 
                                    href={`/loja/${product.seller_id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all group"
                                >
                                    {product.seller?.avatar_url ? (
                                        <img src={product.seller.avatar_url} alt={product.seller.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#FFAE00]/20 text-[#FFAE00] font-bold flex items-center justify-center">
                                            {product.seller?.name?.[0]?.toUpperCase() || 'P'}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-400">Criado e vendido por</p>
                                        <p className="text-sm font-bold text-white group-hover:text-[#FFAE00] transition-colors truncate">
                                            {product.seller?.name || 'Programador BordadoHub'}
                                        </p>
                                    </div>
                                    <Store className="w-4 h-4 text-gray-500 group-hover:text-[#FFAE00] transition-colors" />
                                </Link>
                            </div>

                            {/* Bloco de Ação: Download (se pago) ou Checkout PIX */}
                            {paymentStatus === 'paid' && downloadUrl ? (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 space-y-4 text-center">
                                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-green-400">Matriz Liberada!</h3>
                                        <p className="text-xs text-gray-300 mt-1">Seu pagamento foi confirmado. Baixe os arquivos agora.</p>
                                    </div>
                                    <a
                                        href={downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="w-full py-3.5 px-4 bg-green-500 hover:bg-green-400 text-black font-extrabold rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-5 h-5" />
                                        Baixar Arquivos da Matriz
                                    </a>
                                </div>
                            ) : paymentStatus === 'pending' && pixData ? (
                                <div className="bg-[#0B0D11] border border-[#FFAE00]/30 rounded-xl p-5 space-y-4">
                                    <div className="text-center space-y-1">
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#FFAE00]">
                                            <Clock className="w-4 h-4 animate-spin" />
                                            Aguardando pagamento PIX...
                                        </div>
                                        <p className="text-xs text-gray-400">Escaneie o QR Code ou copie o código abaixo</p>
                                    </div>

                                    {/* QR Code Img */}
                                    <div className="bg-white p-3 rounded-xl mx-auto w-48 h-48 flex items-center justify-center shadow-lg">
                                        <img 
                                            src={`data:image/png;base64,${pixData.qrCode}`} 
                                            alt="QR Code PIX" 
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    {/* Copia e Cola */}
                                    <button
                                        onClick={handleCopyPix}
                                        className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-200 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-[#FFAE00]" />}
                                        {copied ? 'Código Copiado!' : 'Copiar Chave Copia e Cola'}
                                    </button>

                                    <div className="text-[11px] text-gray-500 text-center">
                                        Assim que pagar no app do seu banco, esta página liberará o download automaticamente.
                                    </div>
                                </div>
                            ) : isOwnProduct ? (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                    <p className="text-xs text-gray-400">Esta matriz pertence à sua loja.</p>
                                    <a
                                        href={product.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#FFAE00] hover:underline"
                                    >
                                        <Download className="w-4 h-4" /> Baixar seu arquivo original
                                    </a>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                            CPF ou CNPJ para emissão do PIX:
                                        </label>
                                        <input
                                            type="text"
                                            value={cpfCnpj}
                                            onChange={(e) => setCpfCnpj(e.target.value)}
                                            placeholder="000.000.000-00"
                                            className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#FFAE00] transition-colors"
                                        />
                                    </div>

                                    <button
                                        onClick={handleBuyPix}
                                        disabled={isPurchasing}
                                        className="w-full py-4 px-6 bg-gradient-to-r from-[#FFAE00] to-amber-500 hover:from-yellow-400 hover:to-[#FFAE00] text-black font-extrabold text-base rounded-xl transition-all shadow-xl shadow-[#FFAE00]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

                                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
                                        <ShieldCheck className="w-4 h-4 text-green-400" />
                                        Entrega imediata e garantia BordadoHub
                                    </div>
                                </div>
                            )}

                            {/* Descrição */}
                            {product.description && (
                                <div className="pt-4 border-t border-white/5">
                                    <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Descrição da Matriz:</h3>
                                    <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
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
