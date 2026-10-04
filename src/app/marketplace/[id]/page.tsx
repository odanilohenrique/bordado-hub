'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { 
    ArrowLeft, 
    Download, 
    ShieldCheck, 
    Layers, 
    Store, 
    User, 
    Tag, 
    CheckCircle2, 
    Copy, 
    Check, 
    Clock, 
    AlertCircle, 
    ExternalLink,
    Sparkles,
    FileArchive
} from 'lucide-react'

interface Product {
    id: string
    title: string
    description: string | null
    price: number
    image_url: string
    file_url: string
    formats: string[]
    category: string
    is_bundle: boolean
    items_count: number
    sales_count: number
    created_at: string
    seller: {
        id: string
        name: string
        avatar_url: string | null
        bio: string | null
        rating?: number
    }
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: productId } = use(params)
    const router = useRouter()

    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [isOwner, setIsOwner] = useState(false)
    const [hasPurchased, setHasPurchased] = useState(false)
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

    // Checkout modal state
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [cpf, setCpf] = useState('')
    const [generatingPix, setGeneratingPix] = useState(false)
    const [pixData, setPixData] = useState<{
        orderId: string
        pixQrCode: string
        pixCopyPaste: string
        amount: number
    } | null>(null)
    const [copied, setCopied] = useState(false)
    const [checkoutError, setCheckoutError] = useState<string | null>(null)
    const [paymentApproved, setPaymentApproved] = useState(false)

    useEffect(() => {
        async function loadProductAndStatus() {
            setLoading(true)

            // 1. Fetch Product
            const { data: prod, error: prodErr } = await supabase
                .from('marketplace_products')
                .select('*, seller:seller_id(id, name, avatar_url, bio, rating)')
                .eq('id', productId)
                .single()

            if (prodErr || !prod) {
                setLoading(false)
                return
            }

            setProduct(prod)

            // 2. Fetch current session & user profile
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('supabase_user_id', session.user.id)
                    .maybeSingle()

                if (profile) {
                    setCurrentUser(profile)

                    // Check if owner
                    if (prod.seller_id === profile.id) {
                        setIsOwner(true)
                        setDownloadUrl(prod.file_url)
                    } else {
                        // Check if already purchased
                        const { data: order } = await supabase
                            .from('marketplace_orders')
                            .select('id, status')
                            .eq('product_id', prod.id)
                            .eq('buyer_id', profile.id)
                            .eq('status', 'paid')
                            .maybeSingle()

                        if (order) {
                            setHasPurchased(true)
                            setDownloadUrl(prod.file_url)
                        }
                    }
                }
            }

            setLoading(false)
        }

        loadProductAndStatus()
    }, [productId])

    // Poll for payment confirmation
    useEffect(() => {
        if (!pixData?.orderId || paymentApproved) return

        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/marketplace/check-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: pixData.orderId }),
                })
                const data = await res.json()
                if (data.status === 'paid') {
                    setPaymentApproved(true)
                    setHasPurchased(true)
                    setDownloadUrl(data.downloadUrl || product?.file_url || null)
                    clearInterval(interval)
                }
            } catch {
                // silent
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [pixData?.orderId, paymentApproved, product?.file_url])

    const handleStartCheckout = () => {
        if (!currentUser) {
            router.push(`/login?redirect=/marketplace/${productId}`)
            return
        }
        setCheckoutOpen(true)
        setCheckoutError(null)
    }

    const handleGeneratePix = async (e: React.FormEvent) => {
        e.preventDefault()
        setCheckoutError(null)

        const cleanCpf = cpf.replace(/\D/g, '')
        if (cleanCpf.length !== 11) {
            setCheckoutError('Por favor, informe um CPF válido com 11 dígitos.')
            return
        }

        setGeneratingPix(true)

        try {
            const res = await fetch('/api/marketplace/create-pix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product?.id,
                    buyerId: currentUser?.id,
                    cpfCnpj: cleanCpf,
                }),
            })

            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Erro ao gerar o Pix.')
            }

            setPixData({
                orderId: data.orderId,
                pixQrCode: data.pixQrCode,
                pixCopyPaste: data.pixCopyPaste,
                amount: data.amount,
            })
        } catch (err: any) {
            setCheckoutError(err.message || 'Falha ao conectar com o gateway de pagamento.')
        } finally {
            setGeneratingPix(false)
        }
    }

    const handleCopyPix = () => {
        if (pixData?.pixCopyPaste) {
            navigator.clipboard.writeText(pixData.pixCopyPaste)
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
            </div>
        )
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-[#0F1115] text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-black mb-2">Matriz não encontrada</h1>
                <p className="text-gray-400 mb-6">Este produto foi removido ou não está mais disponível.</p>
                <Link
                    href="/marketplace"
                    className="px-6 py-2.5 rounded-xl bg-[#FFAE00] text-[#0F1115] font-bold text-sm"
                >
                    Voltar ao Marketplace
                </Link>
            </div>
        )
    }

    const canDownload = isOwner || hasPurchased

    return (
        <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Back Link */}
                <div className="mb-6">
                    <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#FFAE00] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                    </Link>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Image Gallery (7 cols) */}
                    <div className="lg:col-span-7 bg-[#16191F] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                        <div className="relative w-full h-80 sm:h-[420px] rounded-2xl overflow-hidden bg-[#0F1115] flex items-center justify-center border border-white/5">
                            <Image
                                src={product.image_url}
                                alt={product.title}
                                fill
                                sizes="(max-width: 1024px) 100vw, 600px"
                                className="object-contain p-4"
                                priority
                            />
                        </div>

                        {/* Formats Pills */}
                        <div className="mt-6 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">
                                Formatos Inclusos:
                            </span>
                            {product.formats?.map((fmt) => (
                                <span
                                    key={fmt}
                                    className="px-3 py-1 rounded-lg text-xs font-bold bg-[#0F1115] border border-white/10 text-gray-300"
                                >
                                    .{fmt}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Details & Purchase (5 cols) */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Title and Badge Card */}
                        <div className="bg-[#16191F] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {product.is_bundle ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFAE00]/15 text-[#FFAE00] text-xs font-black uppercase tracking-wider border border-[#FFAE00]/30">
                                        <Layers className="w-3.5 h-3.5" />
                                        Pacote com {product.items_count} Matrizes
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-gray-300 text-xs font-bold uppercase tracking-wider border border-white/10">
                                        Matriz Individual
                                    </span>
                                )}
                                <span className="text-xs text-gray-500 uppercase tracking-wider">
                                    • {product.category}
                                </span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                                {product.title}
                            </h1>

                            {/* Price */}
                            <div className="pt-3 pb-1 border-t border-white/5 flex items-baseline gap-2">
                                <span className="text-3xl sm:text-4xl font-black text-[#FFAE00]">
                                    R$ {Number(product.price).toFixed(2).replace('.', ',')}
                                </span>
                                <span className="text-xs text-gray-400">
                                    pagamento único via Pix
                                </span>
                            </div>

                            {/* Action Buttons */}
                            {canDownload ? (
                                <div className="space-y-3 pt-2">
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs">
                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        <span>
                                            {isOwner 
                                                ? 'Você é o criador desta matriz.' 
                                                : 'Compra confirmada! Seus arquivos estão liberados para download.'}
                                        </span>
                                    </div>
                                    {downloadUrl && (
                                        <a
                                            href={downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download
                                            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                                        >
                                            <Download className="w-5 h-5" />
                                            Baixar Arquivos da Matriz (.ZIP)
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3 pt-2">
                                    <button
                                        onClick={handleStartCheckout}
                                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FFAE00] to-yellow-400 hover:from-yellow-400 hover:to-[#FFAE00] text-[#0F1115] font-black text-sm uppercase tracking-wider transition-all duration-300 shadow-xl shadow-[#FFAE00]/25 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Comprar Agora no Pix • Download Imediato
                                    </button>
                                    <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 text-center">
                                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                        Download liberado automaticamente após confirmação
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Seller Store Card */}
                        <div className="bg-[#16191F] border border-white/5 rounded-3xl p-6 shadow-2xl">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-3">
                                Criado & Publicado Por
                            </span>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border border-[#FFAE00]/30 shrink-0">
                                        {product.seller?.avatar_url ? (
                                            <img
                                                src={product.seller.avatar_url}
                                                alt={product.seller.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                <User className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-white truncate">
                                            {product.seller?.name || 'Programador'}
                                        </h3>
                                        <p className="text-xs text-gray-400 truncate">
                                            {product.seller?.bio || 'Programador de Matrizes'}
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href={`/loja/${product.seller?.id}`}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-[#FFAE00]/10 hover:text-[#FFAE00] text-gray-300 text-xs font-bold border border-white/10 hover:border-[#FFAE00]/30 transition-all shrink-0 flex items-center gap-1.5"
                                >
                                    <Store className="w-3.5 h-3.5" />
                                    Ver Lojinha
                                </Link>
                            </div>
                        </div>

                        {/* Description Card */}
                        {product.description && (
                            <div className="bg-[#16191F] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
                                    Sobre Esta Matriz
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                                    {product.description}
                                </p>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* PIX CHECKOUT MODAL */}
            {checkoutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#16191F] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
                        
                        {/* Close button */}
                        <button
                            onClick={() => setCheckoutOpen(false)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg"
                        >
                            ✕
                        </button>

                        <div className="text-center">
                            <span className="text-[11px] font-black uppercase tracking-widest text-[#FFAE00] bg-[#FFAE00]/10 px-3 py-1 rounded-full border border-[#FFAE00]/20">
                                Pagamento Seguro Pix
                            </span>
                            <h3 className="text-xl font-black text-white mt-3">
                                {paymentApproved ? 'Pagamento Aprovado!' : 'Finalizar Compra'}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {product.title}
                            </p>
                        </div>

                        {paymentApproved ? (
                            <div className="text-center py-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h4 className="text-lg font-bold text-white">Parabéns pela compra!</h4>
                                <p className="text-xs text-gray-400">
                                    Seu pagamento foi confirmado instantaneamente. O arquivo já está liberado para você baixar.
                                </p>
                                {downloadUrl && (
                                    <a
                                        href={downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <Download className="w-5 h-5" />
                                        Baixar Matriz Agora (.ZIP)
                                    </a>
                                )}
                            </div>
                        ) : !pixData ? (
                            /* Step 1: Request CPF */
                            <form onSubmit={handleGeneratePix} className="space-y-4">
                                {checkoutError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{checkoutError}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                                        Informe seu CPF (exigência do Banco Central para emissão do Pix) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={(e) => setCpf(e.target.value)}
                                        className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FFAE00]"
                                    />
                                </div>

                                <div className="p-3 bg-[#0F1115] rounded-xl border border-white/5 flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Total a pagar:</span>
                                    <span className="text-base font-black text-[#FFAE00]">
                                        R$ {Number(product.price).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={generatingPix}
                                    className="w-full py-3.5 rounded-xl bg-[#FFAE00] hover:bg-yellow-400 text-[#0F1115] font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FFAE00]/20 disabled:opacity-50"
                                >
                                    {generatingPix ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-[#0F1115]/30 border-t-[#0F1115] rounded-full animate-spin" />
                                            Gerando Pix...
                                        </>
                                    ) : (
                                        'Gerar Código Pix'
                                    )}
                                </button>
                            </form>
                        ) : (
                            /* Step 2: Show Pix QR Code and Copy/Paste string */
                            <div className="space-y-4 text-center">
                                <div className="bg-white p-4 rounded-2xl inline-block mx-auto border-4 border-[#FFAE00]/30 shadow-lg">
                                    <img
                                        src={`data:image/png;base64,${pixData.pixQrCode}`}
                                        alt="QR Code Pix"
                                        className="w-48 h-48 mx-auto"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <span className="text-xs text-gray-400 block">
                                        Ou use o Pix Copia e Cola:
                                    </span>
                                    <div className="flex items-center gap-2 bg-[#0F1115] border border-white/10 rounded-xl p-2.5">
                                        <input
                                            type="text"
                                            readOnly
                                            value={pixData.pixCopyPaste}
                                            className="w-full bg-transparent text-xs text-gray-300 font-mono focus:outline-none"
                                        />
                                        <button
                                            onClick={handleCopyPix}
                                            className="p-2 rounded-lg bg-[#FFAE00]/10 hover:bg-[#FFAE00]/20 text-[#FFAE00] shrink-0 transition-colors"
                                            title="Copiar Código"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-gray-400">
                                    <div className="w-3 h-3 border-2 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
                                    <span>Aguardando pagamento no banco... Liberando download automático</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
