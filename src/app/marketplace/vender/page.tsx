'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { 
    ArrowLeft, 
    UploadCloud, 
    Tag, 
    Layers, 
    DollarSign, 
    CheckCircle2, 
    AlertCircle, 
    Sparkles, 
    Image as ImageIcon,
    FileArchive,
    Store
} from 'lucide-react'

const AVAILABLE_FORMATS = ['PES', 'DST', 'JEF', 'EXP', 'XXX', 'HUS', 'EMB']

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

export default function VenderMatrizPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [profile, setProfile] = useState<any>(null)

    // Form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState<string>('19.90')
    const [category, setCategory] = useState('geral')
    const [isBundle, setIsBundle] = useState(false)
    const [itemsCount, setItemsCount] = useState<number>(1)
    const [selectedFormats, setSelectedFormats] = useState<string[]>(['PES', 'DST', 'JEF'])
    
    // File uploads
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [matrixFile, setMatrixFile] = useState<File | null>(null)
    
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    useEffect(() => {
        async function checkUser() {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) {
                router.push('/login?redirect=/marketplace/vender')
                return
            }

            const { data: userProfile } = await supabase
                .from('users')
                .select('id, name, role')
                .eq('supabase_user_id', session.user.id)
                .maybeSingle()

            if (!userProfile) {
                router.push('/login')
                return
            }

            setProfile(userProfile)
            setCheckingAuth(false)
        }

        checkUser()
    }, [router])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
        }
    }

    const handleMatrixFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setMatrixFile(file)
        }
    }

    const toggleFormat = (format: string) => {
        if (selectedFormats.includes(format)) {
            if (selectedFormats.length > 1) {
                setSelectedFormats(selectedFormats.filter(f => f !== format))
            }
        } else {
            setSelectedFormats([...selectedFormats, format])
        }
    }

    // Calculations
    const numPrice = parseFloat(price.replace(',', '.')) || 0
    const platformFee = numPrice * 0.15 // 15%
    const sellerNet = numPrice - platformFee // 85%

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)
        setSuccessMessage(null)

        if (!title.trim()) {
            setErrorMessage('Informe o título da matriz ou pacote.')
            return
        }

        if (numPrice <= 0) {
            setErrorMessage('O valor deve ser maior que zero.')
            return
        }

        if (!imageFile) {
            setErrorMessage('Selecione uma imagem de capa / mockup do bordado.')
            return
        }

        if (!matrixFile) {
            setErrorMessage('Envie o arquivo digital (.ZIP ou matriz) para entrega aos compradores.')
            return
        }

        setLoading(true)

        try {
            // 1. Upload preview image
            const imageExt = imageFile.name.split('.').pop()
            const imagePath = `${profile.id}/${Date.now()}_preview.${imageExt}`
            const { error: uploadImgErr } = await supabase.storage
                .from('marketplace-previews')
                .upload(imagePath, imageFile, { upsert: true })

            if (uploadImgErr) {
                throw new Error(`Falha no upload da imagem: ${uploadImgErr.message}`)
            }

            const { data: { publicUrl: imageUrl } } = supabase.storage
                .from('marketplace-previews')
                .getPublicUrl(imagePath)

            // 2. Upload matrix file (.zip / .pes / etc.)
            const fileExt = matrixFile.name.split('.').pop()
            const filePath = `${profile.id}/${Date.now()}_file.${fileExt}`
            const { error: uploadFileErr } = await supabase.storage
                .from('marketplace-files')
                .upload(filePath, matrixFile, { upsert: true })

            if (uploadFileErr) {
                throw new Error(`Falha no upload do arquivo da matriz: ${uploadFileErr.message}`)
            }

            const { data: { publicUrl: fileUrl } } = supabase.storage
                .from('marketplace-files')
                .getPublicUrl(filePath)

            // 3. Insert product record
            const { data: insertedProduct, error: insertErr } = await supabase
                .from('marketplace_products')
                .insert({
                    seller_id: profile.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    price: numPrice,
                    image_url: imageUrl,
                    file_url: fileUrl,
                    formats: selectedFormats,
                    category: category,
                    is_bundle: isBundle,
                    items_count: isBundle ? Math.max(2, itemsCount) : 1,
                    sales_count: 0,
                    is_active: true,
                })
                .select('id')
                .single()

            if (insertErr) {
                throw new Error(`Erro ao salvar produto: ${insertErr.message}`)
            }

            setSuccessMessage('Matriz publicada com sucesso na sua lojinha!')
            setTimeout(() => {
                router.push(`/marketplace/${insertedProduct.id}`)
            }, 1200)

        } catch (err: any) {
            setErrorMessage(err.message || 'Erro inesperado ao cadastrar produto.')
        } finally {
            setLoading(false)
        }
    }

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Back button */}
                <div className="mb-6">
                    <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#FFAE00] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
                    </Link>
                </div>

                {/* Header Card */}
                <div className="bg-[#16191F] border border-white/5 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFAE00]/10 border border-[#FFAE00]/20 text-[#FFAE00] text-xs font-bold uppercase tracking-wider mb-3">
                        <Store className="w-3.5 h-3.5" /> Sua Lojinha de Matrizes
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Anunciar Matriz para Venda
                    </h1>
                    <p className="mt-2 text-xs sm:text-sm text-gray-400 leading-relaxed">
                        Publique uma matriz individual ou um pacote completo. O comprador paga no Pix e o download é liberado instantaneamente. Você recebe <strong>85% líquido</strong> de cada venda direto na sua carteira virtual.
                    </p>
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
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    !isBundle
                                        ? 'bg-[#FFAE00] text-[#0F1115] shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Matriz Individual
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsBundle(true)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
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
                                value={itemsCount}
                                onChange={(e) => setItemsCount(parseInt(e.target.value) || 2)}
                                className="w-32 bg-[#0F1115] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#FFAE00]"
                            />
                            <p className="text-[11px] text-gray-400 mt-2">
                                Pacotes com muitas matrizes têm taxa de conversão até 4x maior.
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

                    {/* Formats Badges */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                            Formatos de Máquina Inclusos
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_FORMATS.map((fmt) => {
                                const selected = selectedFormats.includes(fmt)
                                return (
                                    <button
                                        type="button"
                                        key={fmt}
                                        onClick={() => toggleFormat(fmt)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                            selected
                                                ? 'bg-[#FFAE00]/15 border-[#FFAE00] text-[#FFAE00]'
                                                : 'bg-[#0F1115] border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        .{fmt}
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2">
                            Selecione as extensões que estarão disponíveis no arquivo final.
                        </p>
                    </div>

                    {/* Image Preview Upload */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                            Foto de Capa / Amostra do Bordado *
                        </label>
                        <div className="border-2 border-dashed border-white/10 hover:border-[#FFAE00]/40 rounded-2xl p-6 text-center transition-colors bg-[#0F1115] relative group">
                            {imagePreview ? (
                                <div className="space-y-4">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-48 h-48 object-contain mx-auto rounded-xl border border-white/10 bg-[#16191F]"
                                    />
                                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#FFAE00] cursor-pointer hover:underline">
                                        Trocar imagem
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <label className="cursor-pointer block">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 text-gray-400 flex items-center justify-center mx-auto mb-3 group-hover:text-[#FFAE00] group-hover:scale-105 transition-all">
                                        <ImageIcon className="w-7 h-7" />
                                    </div>
                                    <span className="text-sm font-bold text-white block mb-1">
                                        Clique para selecionar a foto da matriz
                                    </span>
                                    <span className="text-xs text-gray-500 block">
                                        JPG, PNG ou WEBP (recomendado imagem nítida do bordado ou simulação)
                                    </span>
                                    <input
                                        type="file"
                                        required
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Matrix File (.ZIP) Upload */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                            Arquivo para Download (.ZIP ou Matriz) *
                        </label>
                        <div className="border-2 border-dashed border-white/10 hover:border-[#FFAE00]/40 rounded-2xl p-6 text-center transition-colors bg-[#0F1115] relative group">
                            {matrixFile ? (
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                                        <FileArchive className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-white">{matrixFile.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {(matrixFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#FFAE00] cursor-pointer hover:underline pt-2">
                                        Substituir arquivo
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={handleMatrixFileChange}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <label className="cursor-pointer block">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 text-gray-400 flex items-center justify-center mx-auto mb-3 group-hover:text-[#FFAE00] group-hover:scale-105 transition-all">
                                        <UploadCloud className="w-7 h-7" />
                                    </div>
                                    <span className="text-sm font-bold text-white block mb-1">
                                        Clique para anexar o arquivo digital
                                    </span>
                                    <span className="text-xs text-gray-500 block">
                                        Envie preferencialmente um arquivo <strong>.ZIP</strong> contendo os formatos ou o arquivo da matriz
                                    </span>
                                    <input
                                        type="file"
                                        required
                                        className="hidden"
                                        onChange={handleMatrixFileChange}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Price and Profit Simulator */}
                    <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                            Preço de Venda (R$) *
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/5 text-xs">
                            <div className="bg-[#16191F] p-3 rounded-xl border border-white/5">
                                <span className="text-gray-400 block mb-0.5">Preço Total:</span>
                                <span className="text-base font-bold text-white">
                                    R$ {numPrice.toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-[#16191F] p-3 rounded-xl border border-white/5">
                                <span className="text-gray-400 block mb-0.5">Taxa Plataforma (15%):</span>
                                <span className="text-base font-bold text-gray-400">
                                    - R$ {platformFee.toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-[#FFAE00]/10 p-3 rounded-xl border border-[#FFAE00]/20">
                                <span className="text-[#FFAE00] block mb-0.5 font-bold">Seu Lucro Líquido (85%):</span>
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
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FFAE00] to-yellow-400 hover:from-yellow-400 hover:to-[#FFAE00] text-[#0F1115] font-black text-sm uppercase tracking-wider transition-all duration-300 shadow-xl shadow-[#FFAE00]/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-[#0F1115]/30 border-t-[#0F1115] rounded-full animate-spin" />
                                Publicando na sua lojinha...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Publicar Matriz no Marketplace
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
