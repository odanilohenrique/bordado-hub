'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function NewJob() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [fabricType, setFabricType] = useState('')
    const [urgency, setUrgency] = useState('sem_pressa')
    const [formats, setFormats] = useState<string[]>([])
    const [images, setImages] = useState<File[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

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
            setImages(prev => [...prev, ...newFiles])
        }
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
                    .from('portfolio') // Using portfolio bucket for public access
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
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold mb-6">Novo Pedido de Matriz</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Título do Pedido</label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ex: Logo da Empresa X em Bordado"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Descrição Detalhada</label>
                    <textarea
                        required
                        rows={4}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Descreva detalhes, tamanhos, cores..."
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Images */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Imagens de Referência (Máx 6)</label>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <div className="mt-2 flex gap-2 flex-wrap">
                        {images.map((img, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">{img.name}</span>
                        ))}
                    </div>
                </div>

                {/* Formats */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Formatos Desejados</label>
                    <div className="flex flex-wrap gap-4">
                        {availableFormats.map(fmt => (
                            <label key={fmt} className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formats.includes(fmt)}
                                    onChange={() => handleFormatChange(fmt)}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                />
                                <span className="ml-2 text-sm text-gray-600">{fmt}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Fabric Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Tecido (Opcional)</label>
                    <input
                        type="text"
                        value={fabricType}
                        onChange={e => setFabricType(e.target.value)}
                        placeholder="Ex: Algodão, Jeans, Polo..."
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Urgency */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Urgência</label>
                    <select
                        value={urgency}
                        onChange={e => setUrgency(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="sem_pressa">Sem Pressa (Padrão)</option>
                        <option value="prazo_curto">Prazo Curto</option>
                        <option value="urgente">Urgente</option>
                    </select>
                </div>

                {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {loading ? 'Enviando Pedido...' : 'Enviar Pedido'}
                </button>
            </form>
        </div>
    )
}
