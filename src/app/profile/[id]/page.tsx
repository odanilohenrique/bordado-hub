'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { User, Star, MapPin, Calendar, Award, Package, Code, Edit2, Eye, FileJson, Layers, Upload, Camera, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import ProfileEditor from '@/components/ProfileEditor'

interface UserProfile {
    id: string
    supabase_user_id?: string
    name: string
    role: string
    avatar_url?: string
    bio?: string
    is_client?: boolean
    is_programmer?: boolean
    client_business_type?: string
    client_machine_brand?: string
    skills?: string[]
    formats?: string[]
    experience_level?: string
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
    const [reviews, setReviews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [newRole, setNewRole] = useState('cliente')
    const [isEditing, setIsEditing] = useState(false)
    const [activateProgrammer, setActivateProgrammer] = useState(false)

    // Toggle for owner to preview their profile
    const [previewRole, setPreviewRole] = useState<string | null>(null)

    // Quick avatar upload state
    const [avatarUploading, setAvatarUploading] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search)
            if (urlParams.get('edit') === 'true') {
                setIsEditing(true)
            }
            if (urlParams.get('activate') === 'programmer') {
                setActivateProgrammer(true)
            }
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [id])

    async function loadData() {
        setLoading(true)
        try {
            // Get current auth user
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user ?? null
            setCurrentUser(user)

            if (!id) { setLoading(false); return }

            // Load profile from public table
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .or(`id.eq.${id},supabase_user_id.eq.${id}`)
                .single()

            if (error || !data) {
                console.error('Error loading profile:', error)
                setLoading(false)
                return
            }

            // If user is owner and has no avatar, but has Google picture, auto-sync it!
            const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
            const isUserOwner = user?.id === data.supabase_user_id || user?.id === id || user?.id === data.id
            if (isUserOwner && !data.avatar_url && googleAvatar) {
                await supabase
                    .from('users')
                    .update({ avatar_url: googleAvatar })
                    .eq('id', data.id)
                data.avatar_url = googleAvatar
            }

            // Load reviews received by this user
            try {
                const { data: reviewsData } = await supabase
                    .from('reviews')
                    .select('*, jobs(title)')
                    .or(`reviewee_id.eq.${data.id}${data.supabase_user_id ? `,reviewee_id.eq.${data.supabase_user_id}` : ''}`)
                    .order('created_at', { ascending: false })

                if (reviewsData && reviewsData.length > 0) {
                    const reviewerIds = Array.from(new Set(reviewsData.map(r => r.reviewer_id).filter(Boolean)))
                    
                    let reviewerMap = new Map()
                    if (reviewerIds.length > 0) {
                        const { data: reviewers } = await supabase
                            .from('users')
                            .select('id, supabase_user_id, name, avatar_url')
                            .or(`id.in.(${reviewerIds.join(',')}),supabase_user_id.in.(${reviewerIds.join(',')})`)

                        reviewers?.forEach(u => {
                            reviewerMap.set(u.id, u)
                            if (u.supabase_user_id) reviewerMap.set(u.supabase_user_id, u)
                        })
                    }

                    const enrichedReviews = reviewsData.map(r => ({
                        ...r,
                        reviewer: reviewerMap.get(r.reviewer_id) || { name: 'Cliente' }
                    }))

                    setReviews(enrichedReviews)

                    // Calculate dynamic average rating
                    const sum = reviewsData.reduce((acc, r) => acc + (r.rating || 5), 0)
                    const calculatedRating = Number((sum / reviewsData.length).toFixed(1))
                    const calculatedCount = reviewsData.length

                    // Auto-sync back to users table if different so directories and cards stay 100% accurate
                    if (data.rating !== calculatedRating || data.reviews_count !== calculatedCount) {
                        supabase
                            .from('users')
                            .update({ rating: calculatedRating, reviews_count: calculatedCount })
                            .eq('id', data.id)
                            .then()
                    }

                    data.rating = calculatedRating
                    data.reviews_count = calculatedCount
                } else {
                    if (data.rating !== 0 || data.reviews_count !== 0) {
                        supabase
                            .from('users')
                            .update({ rating: 0, reviews_count: 0 })
                            .eq('id', data.id)
                            .then()
                    }
                    data.rating = 0
                    data.reviews_count = 0
                    setReviews([])
                }
            } catch (reviewErr) {
                console.warn('Could not load reviews:', reviewErr)
                data.reviews_count = 0
                setReviews([])
            }

            setProfile(data)
            setPreviewRole(data.role) // Initialize view with actual role
        } catch (err) {
            console.error('Error in loadData:', err)
        }
        setLoading(false)
    }

    const handleCreateProfile = async () => {
        if (!currentUser) return
        setIsCreating(true)
        try {
            const googleAvatar = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null
            const res = await fetch('/api/create-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuário',
                    email: currentUser.email,
                    role: newRole,
                    avatar_url: googleAvatar
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Falha ao criar perfil')

            window.location.reload()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            alert('Falha: ' + error.message)
        } finally {
            setIsCreating(false)
        }
    }

    const toggleView = () => {
        setPreviewRole(prev => prev === 'criador' ? 'cliente' : 'criador')
    }

    // Quick avatar upload from profile page (without entering Edit mode)
    const handleQuickAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !profile) return

        const file = event.target.files[0]
        setAvatarUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('userId', profile.id)

            const res = await fetch('/api/upload-avatar', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao fazer upload da foto')

            // Reload data to show new avatar
            await loadData()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            alert('Erro ao alterar foto: ' + error.message)
        } finally {
            setAvatarUploading(false)
        }
    }

    // Use Google Avatar
    const handleUseGoogleAvatar = async () => {
        const googleAvatar = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture
        if (!googleAvatar || !profile) return

        setAvatarUploading(true)
        try {
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: googleAvatar })
                .eq('id', profile.id)

            if (updateError) throw updateError
            await loadData()
        } catch (error: any) {
            alert('Erro ao atualizar foto: ' + error.message)
        } finally {
            setAvatarUploading(false)
        }
    }

    // Quick portfolio upload from profile page (without entering Edit mode)
    const handleQuickPortfolioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileInput = event.target
        if (!fileInput.files || fileInput.files.length === 0 || !profile) return

        const currentPortfolio = (profile.portfolio_urls || []).filter(
            (u): u is string => Boolean(u && typeof u === 'string' && u.trim().length > 0)
        )
        const remainingCapacity = 12 - currentPortfolio.length
        if (remainingCapacity <= 0) {
            alert('Limite máximo de 12 imagens no portfólio já foi atingido.')
            return
        }

        const filesArray = Array.from(fileInput.files)
        const filesToUpload = filesArray.slice(0, Math.min(10, remainingCapacity))

        if (filesArray.length > remainingCapacity) {
            alert(`Você selecionou ${filesArray.length} imagens. Apenas as ${filesToUpload.length} que cabem no limite serão enviadas.`)
        }

        setAvatarUploading(true) // Reuse state for loading indicator
        try {
            const uploadData = new FormData()
            filesToUpload.forEach(file => uploadData.append('files', file))
            uploadData.append('userId', profile.id)
            uploadData.append('isPortfolio', 'true')

            const res = await fetch('/api/upload-avatar', {
                method: 'POST',
                body: uploadData
            })

            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Erro no upload')

            const newUrls: string[] = (json.urls || [json.publicUrl || json.avatarUrl])
                .filter((url: any) => Boolean(url && typeof url === 'string' && url.trim().length > 0))

            if (newUrls.length === 0) {
                throw new Error('Nenhuma imagem válida foi retornada do servidor.')
            }

            const updatedPortfolio = [...currentPortfolio, ...newUrls]

            // Update DB with new portfolio array
            const { error: updateError } = await supabase
                .from('users')
                .update({ portfolio_urls: updatedPortfolio })
                .eq('id', profile.id)

            if (updateError) throw updateError

            // Reload data to show new images
            await loadData()

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            alert('Erro ao fazer upload: ' + error.message)
        } finally {
            setAvatarUploading(false)
            if (fileInput) fileInput.value = ''
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#FFAE00]/30 border-t-[#FFAE00] rounded-full animate-spin" />
            </div>
        )
    }

    // 1. CREATE PROFILE FALLBACK
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
                                Trabalhar
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

    if (!profile) return <div className="min-h-screen bg-[#0F1115] flex items-center justify-center text-white">Perfil não encontrado.</div>

    // 2. CHECK OWNERSHIP
    const isOwner = currentUser?.id === profile.supabase_user_id || currentUser?.id === id || currentUser?.id === profile.id

    // 3. EDIT MODE
    if (isEditing) {
        return (
            <div className="min-h-screen bg-[#0B0D11] p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    <ProfileEditor
                        profile={profile}
                        defaultProgrammer={activateProgrammer}
                        onCancel={() => {
                            setIsEditing(false)
                            setActivateProgrammer(false)
                        }}
                        onSave={() => {
                            setIsEditing(false)
                            setActivateProgrammer(false)
                            loadData()
                        }}
                    />
                </div>
            </div>
        )
    }

    // 4. DISPLAY LOGIC
    const defaultSkills = ['Bordado Geral']

    // Determine view type based on Toggle (previewRole) or actual role
    const currentViewRole = previewRole || profile.role
    const isProgrammerView = currentViewRole === 'criador'

    return (
        <div className="min-h-screen bg-[#0F1115] pb-12">
            {/* Header / Banner */}
            <div className="h-48 bg-gradient-to-r from-[#1A1D23] to-[#0F1115] border-b border-[#FFAE00]/10 relative">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                {isOwner && (
                    <div className="absolute top-4 right-4 z-50 flex flex-col md:flex-row gap-3">
                        <button
                            onClick={toggleView}
                            className="bg-black/80 text-white px-3 py-2 rounded-full text-xs font-bold border border-white/20 hover:bg-black transition-all flex items-center gap-2 backdrop-blur-sm shadow-md"
                        >
                            <Eye className="w-3 h-3" />
                            {isProgrammerView ? 'Ver como Cliente' : 'Ver como Programador'}
                        </button>

                        <button
                            onClick={() => {
                                setActivateProgrammer(false)
                                setIsEditing(true)
                            }}
                            className="bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-[#FFB703]/20 transition-all flex items-center gap-2"
                        >
                            <Edit2 className="w-3.5 h-3.5" /> Configurar / Editar Perfil
                        </button>
                    </div>
                )}
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
                <div className="flex flex-col md:flex-row gap-6 items-start">

                    {/* Sidebar / Info Card */}
                    <div className="w-full md:w-80 flex-shrink-0">
                        <div className="bg-[#12151C] rounded-2xl border border-white/[0.07] p-6 shadow-2xl relative overflow-hidden">
                            {/* Role & Business Type Badges */}
                            <div className="absolute top-0 right-0 p-3 flex flex-col items-end gap-1.5">
                                {(profile.is_programmer || (profile.skills && profile.skills.length > 0) || profile.role === 'criador') && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/30">
                                        Programador
                                    </span>
                                )}
                                {(profile.is_client || profile.client_business_type) && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-white/5 text-gray-300 border border-white/10">
                                        {profile.client_business_type || 'Cliente'}
                                    </span>
                                )}
                            </div>

                            {/* Avatar & Alterar foto de perfil */}
                            {(() => {
                                const googleAvatar = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture
                                const displayAvatar = profile.avatar_url || (isOwner ? googleAvatar : null)

                                return (
                                    <>
                                        <div className="w-32 h-32 mx-auto rounded-full border-4 border-[#0F1115] bg-[#2A2D35] flex items-center justify-center overflow-hidden mb-3 relative shadow-[0_0_20px_rgba(255,174,0,0.2)]">
                                            {displayAvatar ? (
                                                <Image
                                                    src={displayAvatar}
                                                    alt={profile.name}
                                                    width={128}
                                                    height={128}
                                                    className="object-cover w-full h-full"
                                                    unoptimized
                                                />
                                            ) : (
                                                <User className="w-16 h-16 text-gray-500" />
                                            )}
                                        </div>

                                        {/* Botão único: Alterar foto de perfil */}
                                        {isOwner && (
                                            <div className="flex justify-center mb-4">
                                                <label className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-[#0F1115] border border-gray-700 text-xs font-medium text-gray-300 hover:text-[#FFAE00] hover:border-[#FFAE00]/50 cursor-pointer transition-all shadow-sm group">
                                                    <Camera className="w-3.5 h-3.5 text-[#FFAE00]" />
                                                    {avatarUploading ? 'Enviando foto...' : 'Alterar foto de perfil'}
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={handleQuickAvatarUpload}
                                                        disabled={avatarUploading}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </>
                                )
                            })()}

                            <h1 className="text-2xl font-bold text-[#F3F4F6] text-center mb-1">{profile.name}</h1>

                            <div className="space-y-4 border-t border-gray-800 pt-6 mt-6">
                                {/* Common Stats */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 flex items-center gap-2">
                                        {profile.reviews_count && profile.reviews_count > 0 ? (
                                            <Star className="w-4 h-4 text-[#F5A623] fill-[#F5A623]" />
                                        ) : null}
                                        Avaliação
                                    </span>
                                    <span className="text-white font-bold">
                                        {profile.reviews_count && profile.reviews_count > 0
                                            ? `${profile.rating?.toFixed(1)} (${profile.reviews_count})`
                                            : 'Sem avaliações ainda'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-[#FFAE00]" /> Membro desde
                                    </span>
                                    <span className="text-white font-bold">
                                        {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>

                                {/* Role Specific Stats */}
                                {isProgrammerView ? (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400 flex items-center gap-2">
                                            <Package className="w-4 h-4 text-[#FFAE00]" /> Matrizes
                                        </span>
                                        <span className="text-white font-bold">{profile.matrices_count || 0}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400 flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-[#FFAE00]" /> Perfil
                                            </span>
                                            <span className="text-white font-bold text-xs">{profile.client_business_type || profile.experience_level || 'Iniciante'}</span>
                                        </div>
                                        {profile.client_machine_brand && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-400 flex items-center gap-2">
                                                    <Layers className="w-4 h-4 text-[#FFAE00]" /> Máquina
                                                </span>
                                                <span className="text-white font-bold text-xs">{profile.client_machine_brand}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Direct Request Button (Client visiting Programmer) */}
                            {!isOwner && isProgrammerView && currentUser && (
                                <div className="mt-8">
                                    <Link
                                        href={`/jobs/new?programmer_id=${profile.id}`}
                                        className="block w-full text-center bg-[#FFAE00] hover:bg-[#D97706] text-[#0F1115] font-bold py-3 rounded-lg transition-colors shadow-[0_0_15px_rgba(255,174,0,0.3)]"
                                    >
                                        Solicitar Matriz Direta
                                    </Link>
                                    <p className="text-xs text-gray-500 text-center mt-2">
                                        Envie um pedido privado para este programador
                                    </p>
                                </div>
                            )}

                            {isOwner && (
                                <div className="mt-6 pt-5 border-t border-white/[0.08] space-y-3">
                                    {(!profile.is_programmer || !profile.skills || profile.skills.length === 0) ? (
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActivateProgrammer(true)
                                                    setIsEditing(true)
                                                }}
                                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-black text-xs shadow-lg shadow-[#FFB703]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                                            >
                                                <Code className="w-4 h-4" />
                                                Ativar Perfil de Programador
                                            </button>
                                            <p className="text-[11px] text-gray-400 text-center mt-2 leading-tight">
                                                Necessário para enviar orçamentos
                                            </p>
                                        </div>
                                    ) : (
                                        <Link
                                            href="/jobs"
                                            className="block w-full text-center bg-[#1A1D23] border border-[#FFAE00] text-[#FFAE00] hover:bg-[#FFAE00] hover:text-[#0F1115] font-bold py-2.5 rounded-xl transition-colors text-xs"
                                        >
                                            Mural de Pedidos
                                        </Link>
                                    )}

                                    <Link
                                        href="/pedidos"
                                        className="block w-full text-center bg-[#12151C] border border-white/10 hover:border-white/30 text-gray-300 hover:text-white font-medium py-2 rounded-xl transition-all text-xs"
                                    >
                                        Meus Pedidos de Bordado
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Sidebar: Skills (Programmer) OR Formats (Client) */}
                        <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/20 p-6 mt-6 shadow-xl">
                            <h3 className="text-[#F3F4F6] font-bold mb-4 flex items-center gap-2">
                                {isProgrammerView ? <Code className="w-4 h-4 text-[#FFAE00]" /> : <FileJson className="w-4 h-4 text-[#FFAE00]" />}
                                {isProgrammerView ? 'Softwares & Habilidades' : 'Formatos Utilizados'}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {(isProgrammerView
                                    ? (profile.skills && profile.skills.length > 0 ? profile.skills : defaultSkills)
                                    : (profile.formats && profile.formats.length > 0 ? profile.formats : ['Não especificado'])
                                ).map((item, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-[#0F1115] border border-gray-700 text-gray-300 text-xs rounded-full"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 w-full space-y-6">

                        {/* Onboarding Callout for Profile Owner needing to configure Programmer Profile */}
                        {isOwner && (!profile.is_programmer || !profile.skills || profile.skills.length === 0) && (
                            <div className="bg-gradient-to-r from-[#181C26] via-[#151922] to-[#181C26] rounded-2xl border-2 border-[#FFB703]/30 p-6 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[#FFB703]/10 rounded-full blur-2xl pointer-events-none" />
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                                    <div className="space-y-2 max-w-xl">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFB703]/10 border border-[#FFB703]/30 text-[#FFB703] text-xs font-bold uppercase tracking-wider">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Envio de Propostas no Mural
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-black text-white">
                                            Deseja enviar propostas e trabalhar como programador?
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                            Para enviar orçamentos nos pedidos dos clientes e receber pagamentos com segurança via chave PIX, complete seu perfil ativando a opção de <strong className="text-gray-200">Programador</strong> e selecionando os softwares de matrizes que você domina (Wilcom, Embird, Tajima, etc.).
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActivateProgrammer(true)
                                            setIsEditing(true)
                                        }}
                                        className="shrink-0 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-black text-sm shadow-xl shadow-[#FFB703]/25 transition-all cursor-pointer"
                                    >
                                        <Code className="w-4 h-4" />
                                        Ativar e Completar Perfil
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Bio / About */}
                        <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/20 p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-[#F3F4F6] mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-[#FFAE00]" />
                                {isProgrammerView ? 'Histórico Profissional' : 'Sobre o Cliente'}
                            </h2>
                            <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">
                                {profile.bio || (isOwner ? "Clique em 'Editar Perfil' para adicionar sua biografia." : "Este usuário ainda não preencheu sua biografia.")}
                            </p>
                        </div>

                        {/* Portfolio (Programmer Only) */}
                        {isProgrammerView && (
                            <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/20 p-6 shadow-xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
                                        <Award className="w-5 h-5 text-[#FFAE00]" />
                                        Portfólio
                                    </h2>
                                    {isOwner && (
                                        <label className="text-xs text-gray-400 hover:text-[#FFAE00] cursor-pointer transition-colors flex items-center gap-1 bg-[#0F1115] px-3 py-1.5 rounded-lg border border-gray-700 hover:border-[#FFAE00]">
                                            <Upload className="w-3 h-3" />
                                            Adicionar Fotos
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleQuickPortfolioUpload}
                                                disabled={avatarUploading}
                                            />
                                        </label>
                                    )}
                                </div>

                                {profile.portfolio_urls && profile.portfolio_urls.filter(u => Boolean(u && typeof u === 'string' && u.trim().length > 0)).length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {profile.portfolio_urls
                                            .filter((url): url is string => Boolean(url && typeof url === 'string' && url.trim().length > 0))
                                            .map((url, idx) => (
                                                <div key={idx} className="aspect-square bg-black rounded-lg overflow-hidden border border-gray-800 hover:border-[#FFAE00] transition-colors cursor-pointer group relative">
                                                    <Image
                                                        src={url}
                                                        alt={`Portfolio ${idx + 1}`}
                                                        fill
                                                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                                                        unoptimized
                                                    />
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl bg-[#0F1115]/50">
                                        <Package className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm">
                                            {isOwner ? "Clique em 'Adicionar' acima para incluir fotos do seu trabalho." : "Nenhum projeto no portfólio ainda."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reviews (Common) */}
                        <div className="bg-[#1A1D23] rounded-xl border border-[#FFAE00]/20 p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
                                    <Star className="w-5 h-5 text-[#FFAE00] fill-[#FFAE00]" />
                                    Avaliações Recentes
                                </h2>
                                {reviews.length > 0 && (
                                    <span className="text-xs font-bold text-gray-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                                        {reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'}
                                    </span>
                                )}
                            </div>

                            {reviews.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    Nenhuma avaliação recebida ainda.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reviews.map((rev) => (
                                        <div key={rev.id} className="bg-[#0F1115] border border-white/5 hover:border-[#FFAE00]/30 rounded-xl p-5 transition-all">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#1A1D23] border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                                                        {rev.reviewer?.avatar_url ? (
                                                            <img src={rev.reviewer.avatar_url} alt={rev.reviewer.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-5 h-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white leading-tight">{rev.reviewer?.name || 'Cliente'}</h4>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                                            {new Date(rev.created_at).toLocaleDateString('pt-BR')}
                                                            {rev.jobs?.title && (
                                                                <span className="text-gray-400"> • Pedido: <strong className="text-gray-300 font-medium">{rev.jobs.title}</strong></span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Stars */}
                                                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#1A1D23] px-3 py-1.5 rounded-lg border border-white/5">
                                                    <div className="flex">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star
                                                                key={s}
                                                                className={`w-3.5 h-3.5 ${s <= (rev.rating || 5) ? 'text-[#FFAE00] fill-[#FFAE00]' : 'text-gray-700'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-bold text-white ml-1">{(rev.rating || 5).toFixed(1)}</span>
                                                </div>
                                            </div>

                                            {/* Matrix & Service breakdown */}
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {rev.rating_matrix && (
                                                    <span className="text-[10px] font-medium text-gray-300 bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                                        Matriz: <strong className="text-[#F5A623]">{rev.rating_matrix}.0</strong>
                                                        <Star className="w-3 h-3 text-[#F5A623] fill-[#F5A623]" />
                                                    </span>
                                                )}
                                                {rev.rating_service && (
                                                    <span className="text-[10px] font-medium text-gray-300 bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                                        Atendimento / Prazo: <strong className="text-[#F5A623]">{rev.rating_service}.0</strong>
                                                        <Star className="w-3 h-3 text-[#F5A623] fill-[#F5A623]" />
                                                    </span>
                                                )}
                                            </div>

                                            {/* Comment text */}
                                            {rev.comment && (
                                                <p className="text-sm text-gray-300 leading-relaxed italic bg-white/[0.01] p-3 rounded-lg border border-white/5">
                                                    &quot;{rev.comment}&quot;
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}
