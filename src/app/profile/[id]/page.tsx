'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User, Star, MapPin, Calendar, Award, Package, Code } from 'lucide-react'
import Image from 'next/image'

interface UserProfile {
    id: string
    name: string
    role: string
    avatar_url?: string
    bio?: string
    skills?: string[]
    portfolio_urls?: string[]
    rating?: number
    matrices_count?: number
    reviews_count?: number
    created_at: string
}

export default function ProfilePage() {
    const params = useParams()
    const id = params?.id as string
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [newRole, setNewRole] = useState('cliente')
    const router = useRouter()

    useEffect(() => {
        async function loadData() {
            // Get current auth user
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            if (!id) return

            // Load profile from public table
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                // If error is 406/Not Found, profile is null. 
            } else {
                setProfile(data)
            }
            setLoading(false)
        }

        loadData()
    }, [id])

    const handleCreateProfile = async () => {
        if (!currentUser) return
        setIsCreating(true)
        try {
            const res = await fetch('/api/create-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuário',
                    email: currentUser.email,
                    role: newRole
                })
            })

            if (!res.ok) throw new Error('Falha ao criar perfil')

            window.location.reload()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsCreating(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
            </div>
        )
    }

    // If profile missing BUT it's the current user -> Show Create Form
    if (!profile && currentUser && currentUser.id === id) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center p-4">
                <div className="bg-[#1A1D23] border border-[#FFAE00] p-8 rounded-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-[#FFAE00]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-[#FFAE00]" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Complete seu Perfil</h2>
                    <p className="text-gray-400 mb-6">Parece que você ainda não finalizou seu cadastro.</p>

                    <div className="text-left mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Eu quero:</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setNewRole('cliente')}
                                className={`p-3 rounded-lg border text-sm font-bold transition-all ${newRole === 'cliente'
                                        ? 'bg-[#FFAE00] text-black border-[#FFAE00]'
                                        : 'bg-[#0F1115] text-gray-400 border-gray-700 hover:border-[#FFAE00]'
                                    }`}
                            >
                                Contratar Matrizes
                            </button>
                            <button
                                onClick={() => setNewRole('criador')}
                                className={`p-3 rounded-lg border text-sm font-bold transition-all ${newRole === 'criador'
                                        ? 'bg-[#FFAE00] text-black border-[#FFAE00]'
                                        : 'bg-[#0F1115] text-gray-400 border-gray-700 hover:border-[#FFAE00]'
                                    }`}
                            >
                                Trabalhar como Programador
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleCreateProfile}
                        disabled={isCreating}
                        className="w-full bg-[#FFAE00] text-black font-bold py-3 rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-50"
                    >
                        {isCreating ? 'Finalizando...' : 'Concluir Cadastro'}
                    </button>
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center text-white">
                Perfil não encontrado.
            </div>
        )
    }

    const defaultSkills = ['Wilcom', 'Embird', 'PE-Design']

    return (
        <div className="min-h-screen bg-[#0F1115] pb-12">
            {/* Header / Banner */}
            <div className="h-48 bg-gradient-to-r from-[#1A1D23] to-[#0F1115] border-b border-[#FFAE00]/10 relative">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
                <div className="flex flex-col md:flex-row gap-6 items-start">

                    {/* Sidebar / Info Card */}
                    <div className="w-full md:w-80 flex-shrink-0">
                        <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/20 p-6 shadow-2xl">
                            {/* Avatar */}
                            <div className="w-32 h-32 mx-auto rounded-full border-4 border-[#0F1115] bg-[#2A2D35] flex items-center justify-center overflow-hidden mb-4 relative shadow-[0_0_20px_rgba(255,174,0,0.2)]">
                                {profile.avatar_url ? (
                                    <Image
                                        src={profile.avatar_url}
                                        alt={profile.name}
                                        width={128}
                                        height={128}
                                        className="object-cover"
                                    />
                                ) : (
                                    <User className="w-16 h-16 text-gray-500" />
                                )}
                            </div>

                            <h1 className="text-2xl font-bold text-[#F3F4F6] text-center mb-1">{profile.name}</h1>
                            <p className="text-[#FFAE00] text-center text-sm font-medium uppercase tracking-wider mb-6">
                                {profile.role}
                            </p>

                            <div className="space-y-4 border-t border-gray-800 pt-6">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 flex items-center gap-2">
                                        <Star className="w-4 h-4 text-[#FFAE00]" /> Avaliação
                                    </span>
                                    <span className="text-white font-bold">{profile.rating?.toFixed(1) || '5.0'}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-[#FFAE00]" /> Matrizes
                                    </span>
                                    <span className="text-white font-bold">{profile.matrices_count || 0}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-[#FFAE00]" /> Membro desde
                                    </span>
                                    <span className="text-white font-bold">
                                        {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-8">
                                <button className="w-full bg-[#FFAE00] hover:bg-[#D97706] text-[#0F1115] font-bold py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(255,174,0,0.3)]">
                                    Enviar Mensagem
                                </button>
                            </div>
                        </div>

                        {/* Skills - Mobile/Desktop Sidebar */}
                        <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/20 p-6 mt-6 shadow-xl">
                            <h3 className="text-[#F3F4F6] font-bold mb-4 flex items-center gap-2">
                                <Code className="w-4 h-4 text-[#FFAE00]" />
                                Softwares & Habilidades
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {(profile.skills && profile.skills.length > 0 ? profile.skills : defaultSkills).map((skill, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-[#0F1115] border border-gray-700 text-gray-300 text-xs rounded-full"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 w-full space-y-6">

                        {/* Bio / About */}
                        <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/20 p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-[#F3F4F6] mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-[#FFAE00]" />
                                Histórico Profissional
                            </h2>
                            <p className="text-gray-300 leading-relaxed text-sm">
                                {profile.bio || "Este usuário ainda não preencheu sua biografia profissional. Entre em contato para saber mais sobre sua experiência e trabalhos anteriores."}
                            </p>
                        </div>

                        {/* Portfolio Grid */}
                        <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/20 p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-[#F3F4F6] mb-6 flex items-center gap-2">
                                <Award className="w-5 h-5 text-[#FFAE00]" />
                                Portfólio
                            </h2>

                            {profile.portfolio_urls && profile.portfolio_urls.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {profile.portfolio_urls.map((url, idx) => (
                                        <div key={idx} className="aspect-square bg-[#0F1115] rounded-lg overflow-hidden border border-gray-800 hover:border-[#FFAE00] transition-colors cursor-pointer group relative">
                                            <Image
                                                src={url}
                                                alt={`Portfolio ${idx}`}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl bg-[#0F1115]/50">
                                    <Package className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">Nenhum projeto no portfólio ainda.</p>
                                </div>
                            )}
                        </div>

                        {/* Reviews (Placeholder) */}
                        <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/20 p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-[#F3F4F6] mb-6 flex items-center gap-2">
                                <Star className="w-5 h-5 text-[#FFAE00]" />
                                Avaliações Recentes
                            </h2>
                            <div className="text-center py-8 text-gray-500 text-sm">
                                Nenhuma avaliação recebida ainda.
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}
