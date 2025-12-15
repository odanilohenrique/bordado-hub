'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Save, X, Upload, Trash2, ImageIcon } from 'lucide-react'
import Image from 'next/image'

// Comprehensive list of embroidery software
const SOFTWARE_OPTIONS = [
    'Wilcom Embroidery Studio',
    'Embird',
    'Brother PE-Design',
    'Janome Digitizer MBX',
    'Hatch Embroidery',
    'Bernina Artlink',
    'Sierra Stick',
    'Floriani Total Control',
    'Chroma',
    'Wings XP',
    'Pulse',
    'Compucon'
]

const FORMAT_OPTIONS = ['PES', 'DST', 'JEF', 'XXX', 'EXP', 'HUS', 'VIP', 'VP3']
const LEVEL_OPTIONS = ['Iniciante', 'Intermediário', 'Avançado', 'Profissional / Atelier']

interface UserProfile {
    id: string
    name?: string
    avatar_url?: string
    bio?: string
    role?: string
    skills?: string[]
    formats?: string[]
    experience_level?: string
    portfolio_urls?: string[]
}

interface ProfileEditorProps {
    profile: UserProfile
    onCancel: () => void
    onSave: () => void
}

export default function ProfileEditor({ profile, onCancel, onSave }: ProfileEditorProps) {
    const [formData, setFormData] = useState({
        name: profile.name || '',
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
        role: profile.role || 'cliente',
        skills: profile.skills || [],
        formats: profile.formats || [],
        experience_level: profile.experience_level || 'Iniciante',
        portfolio_urls: profile.portfolio_urls || []
    })
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [portfolioUploading, setPortfolioUploading] = useState(false)

    // Handlers
    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0) return

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${profile.id}-${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            setUploading(true)

            // Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

            // Update local state
            handleChange('avatar_url', data.publicUrl)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            alert('Erro ao fazer upload: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const toggleArrayItem = (field: 'skills' | 'formats', item: string) => {
        setFormData(prev => {
            const list = prev[field] || []
            if (list.includes(item)) {
                return { ...prev, [field]: list.filter((i: string) => i !== item) }
            } else {
                return { ...prev, [field]: [...list, item] }
            }
        })
    }

    // Portfolio Upload Handler
    const handlePortfolioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0) return
            if (formData.portfolio_urls.length >= 12) {
                alert('Máximo de 12 imagens no portfólio')
                return
            }

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

            setPortfolioUploading(true)

            // Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from('portfolio')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            // Get Public URL
            const { data } = supabase.storage.from('portfolio').getPublicUrl(fileName)

            // Add to portfolio_urls
            setFormData(prev => ({
                ...prev,
                portfolio_urls: [...prev.portfolio_urls, data.publicUrl]
            }))

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            alert('Erro ao fazer upload: ' + error.message)
        } finally {
            setPortfolioUploading(false)
        }
    }

    // Remove Portfolio Image
    const removePortfolioImage = (urlToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            portfolio_urls: prev.portfolio_urls.filter(url => url !== urlToRemove)
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    name: formData.name,
                    avatar_url: formData.avatar_url,
                    bio: formData.bio,
                    skills: formData.skills,
                    formats: formData.formats,
                    experience_level: formData.experience_level,
                    portfolio_urls: formData.portfolio_urls
                })
                .eq('id', profile.id)

            if (error) throw error
            onSave()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/30 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Editar Perfil</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="space-y-6">
                {/* Avatar Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Foto de Perfil</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-[#0F1115] border border-gray-700 flex items-center justify-center overflow-hidden relative">
                            {formData.avatar_url ? (
                                <Image src={formData.avatar_url} alt="Avatar" fill className="object-cover" />
                            ) : (
                                <span className="text-gray-500 text-xs">Sem foto</span>
                            )}
                        </div>
                        <label className="bg-[#0F1115] border border-gray-700 text-gray-300 px-4 py-2 rounded-lg cursor-pointer hover:border-[#FFAE00] hover:text-[#FFAE00] transition-all flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Enviando...' : 'Alterar Foto'}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Nome de Exibição</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full bg-[#0F1115] border border-gray-700 rounded-lg p-3 text-white focus:border-[#FFAE00] focus:ring-1 focus:ring-[#FFAE00] transition-all"
                    />
                </div>

                {/* Bio */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Biografia / Sobre</label>
                    <textarea
                        value={formData.bio}
                        onChange={(e) => handleChange('bio', e.target.value)}
                        rows={4}
                        className="w-full bg-[#0F1115] border border-gray-700 rounded-lg p-3 text-white focus:border-[#FFAE00] focus:ring-1 focus:ring-[#FFAE00] transition-all"
                        placeholder={
                            profile.role === 'cliente'
                                ? "Explique se você faz bordados casualmente, se tem um ateliê, uma confecção ou empresa maior. Cite quais máquinas você utiliza (ex: Brother PE-810, Janome MC500E) e que tipo de serviços costuma buscar."
                                : "Conte um pouco sobre sua experiência..."
                        }
                    />
                </div>

                {/* Conditional Fields based on Role */}
                {profile.role === 'criador' ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-3">Softwares que Domina</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {SOFTWARE_OPTIONS.map(software => (
                                <button
                                    key={software}
                                    onClick={() => toggleArrayItem('skills', software)}
                                    className={`px-3 py-2 rounded-lg text-sm text-left transition-all ${formData.skills.includes(software)
                                        ? 'bg-[#FFAE00] text-black font-bold'
                                        : 'bg-[#0F1115] text-gray-400 border border-gray-800 hover:border-gray-600'
                                        }`}
                                >
                                    {software}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Client Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-3">Nível de Conhecimento</label>
                                <select
                                    value={formData.experience_level}
                                    onChange={(e) => handleChange('experience_level', e.target.value)}
                                    className="w-full bg-[#0F1115] border border-gray-700 rounded-lg p-3 text-white focus:border-[#FFAE00]"
                                >
                                    {LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-3">Formatos de Arquivo</label>
                                <div className="flex flex-wrap gap-2">
                                    {FORMAT_OPTIONS.map(format => (
                                        <button
                                            key={format}
                                            onClick={() => toggleArrayItem('formats', format)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${formData.formats.includes(format)
                                                ? 'bg-[#FFAE00] text-black'
                                                : 'bg-[#0F1115] text-gray-400 border border-gray-700'
                                                }`}
                                        >
                                            {format}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Portfolio Section (Programmer Only) */}
                {profile.role === 'criador' && (
                    <div className="border-t border-gray-800 pt-6">
                        <label className="block text-sm font-medium text-gray-400 mb-3">
                            Portfólio ({formData.portfolio_urls.length}/12 imagens)
                        </label>
                        <p className="text-xs text-gray-500 mb-4">
                            Mostre seus melhores trabalhos para atrair mais clientes.
                        </p>

                        {/* Image Grid */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                            {formData.portfolio_urls.map((url, index) => (
                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-700">
                                    <Image
                                        src={url}
                                        alt={`Portfolio ${index + 1}`}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePortfolioImage(url)}
                                        className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <Trash2 className="w-6 h-6 text-white" />
                                    </button>
                                </div>
                            ))}

                            {/* Add Button */}
                            {formData.portfolio_urls.length < 12 && (
                                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-600 hover:border-[#FFAE00] cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors bg-[#0F1115]">
                                    <ImageIcon className="w-6 h-6 text-gray-500" />
                                    <span className="text-xs text-gray-500">
                                        {portfolioUploading ? 'Enviando...' : 'Adicionar'}
                                    </span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handlePortfolioUpload}
                                        disabled={portfolioUploading}
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="px-6 py-2 rounded-lg text-gray-300 hover:text-white font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-[#FFAE00] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#D97706] transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Salvar Alterações
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
