'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Image as ImageIcon, Zap, Clock, Package } from 'lucide-react'
import Link from 'next/link'

export default function NewJob() {
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
    const router = useRouter()

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
                alert('Máximo de 6 imagens permitidas')
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

            // 2. Upload Images
            const imageUrls: string[] = []
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

            // 3. Create Job
            const { error: jobError } = await supabase
                .from('jobs')
                .insert([
                    {
                        cliente_id: userData.id,
                        title,
                        description,
                        fabric_type: fabricType,
                        urgency,
                        formats,
                        image_urls: imageUrls,
                        status: 'aberto'
                    }
                ])

            if (jobError) throw jobError

            router.push('/dashboard')
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
                            placeholder="Ex: Logo da Empresa X em Bordado"
                            className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <FileText className="w-4 h-4 text-[#FFAE00]" />
                            Descrição Detalhada
                        </label>
                        <textarea
                            required
                            rows={5}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Descreva detalhes como tamanhos, cores, quantidade de pontos desejada, tipo de aplicação..."
                            className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    {/* Images Upload */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <ImageIcon className="w-4 h-4 text-[#FFAE00]" />
                            Imagens de Referência <span className="text-gray-500">(Máximo 6)</span>
                        </label>

                        <div className="relative">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
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
                                    <p className="text-[#F3F4F6] font-medium">Clique para enviar imagens</p>
                                    <p className="text-gray-500 text-sm">PNG, JPG até 10MB cada</p>
                                </div>
                            </label>
                        </div>

                        {/* Image Previews */}
                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                                {imagePreviews.map((preview, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={preview}
                                            alt={`Preview ${idx + 1}`}
                                            className="w-full h-32 object-cover rounded-lg border border-[#FFAE00]/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                        <p className="text-xs text-gray-400 mt-1 truncate">{images[idx].name}</p>
                                    </div>
                                ))}
                            </div>
                        )}
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

                    {/* Fabric Type */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <Package className="w-4 h-4 text-[#FFAE00]" />
                            Tipo de Tecido <span className="text-gray-500">(Opcional)</span>
                        </label>
                        <input
                            type="text"
                            value={fabricType}
                            onChange={e => setFabricType(e.target.value)}
                            placeholder="Ex: Algodão, Jeans, Polo, Dry-Fit..."
                            className="w-full bg-[#0F1115] border border-[#FFAE00]/20 rounded-lg px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFAE00] focus:border-transparent transition-all"
                        />
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
