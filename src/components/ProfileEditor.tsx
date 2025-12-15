'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Save, X, Upload, Plus, Trash } from 'lucide-react'
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
    bio?: string
    role?: string
    skills?: string[]
    formats?: string[]
    experience_level?: string
}

interface ProfileEditorProps {
    profile: UserProfile
    onCancel: () => void
    onSave: () => void
}

export default function ProfileEditor({ profile, onCancel, onSave }: ProfileEditorProps) {
    const [formData, setFormData] = useState({
        name: profile.name || '',
        bio: profile.bio || '',
        role: profile.role || 'cliente',
        skills: profile.skills || [],
        formats: profile.formats || [],
        experience_level: profile.experience_level || 'Iniciante'
    })
    const [saving, setSaving] = useState(false)

    // Handlers
    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
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

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    name: formData.name,
                    bio: formData.bio,
                    skills: formData.skills,
                    formats: formData.formats,
                    experience_level: formData.experience_level
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

    /* 
       NOTE: File Upload logic (Avatar/Portfolio) requires Supabase Storage setup.
       We will implement basic text editing first as verified in Phase 4 plan.
       Full file upload needs the bucket existence check.
    */

    return (
        <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/30 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Editar Perfil</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="space-y-6">
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
                        placeholder="Conte um pouco sobre sua experiência..."
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
