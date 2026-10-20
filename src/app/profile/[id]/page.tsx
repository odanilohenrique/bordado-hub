'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { User, Star, MapPin, Calendar, Award, Package, Code, Edit2, Eye, FileJson, Layers, Upload, Camera, Sparkles, ArrowRight, CheckCircle2, Trash2, Loader2, FileText } from 'lucide-react'
import Image from 'next/image'
import ProfileEditor from '@/components/ProfileEditor'
import ProgrammerAccessModal from '@/components/ProgrammerAccessModal'
import { toast } from 'sonner'
import { optimizeImageFile } from '@/lib/helpers'

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
    const router = useRouter()
    const id = params?.id as string

    // Instant hydration from cached profile if present (ZERO loading delay)
    const [profile, setProfile] = useState<UserProfile | null>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('current_user_profile')
                if (cached) {
                    const parsed = JSON.parse(cached)
                    if (parsed && (id === 'me' || parsed.id === id || parsed.supabase_user_id === id)) {
                        return parsed
                    }
                }
            } catch {}
        }
        return null
    })

    const [reviews, setReviews] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('current_user_profile')
                if (cached) {
                    const parsed = JSON.parse(cached)
                    if (parsed && (id === 'me' || parsed.id === id || parsed.supabase_user_id === id)) {
                        return false
                    }
                }
            } catch {}
        }
        return true
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [newRole, setNewRole] = useState('cliente')
    const [isEditing, setIsEditing] = useState(false)
    const [isProgrammerModalOpen, setIsProgrammerModalOpen] = useState(false)
    const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState('')

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
            const codeParam = (urlParams.get('convite') || urlParams.get('invite') || '').trim().toUpperCase()
            if (codeParam) {
                setInviteCodeFromUrl(codeParam)
                setIsProgrammerModalOpen(true)
            }
            if (urlParams.get('activate') === 'programmer') {
                setIsProgrammerModalOpen(true)
            }
        }
    }, [])

    useEffect(() => {
        loadData(true)

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setCurrentUser(session.user)
            }
        })
        return () => subscription.unsubscribe()
    }, [id])

    async function loadData(showSpinner = true) {
        if (showSpinner && !profile) setLoading(true)

        // Failsafe timer: NUNCA deixa a tela congelada em loading por mais de 2 segundos
        const failsafe = setTimeout(() => {
            setLoading(false)
        }, 2000)

        try {
            // Get current auth user
            const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
            let user = session?.user ?? null

            if (!user && typeof window !== 'undefined') {
                const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
                if (userData?.user) user = userData.user
            }
            setCurrentUser(user)

            if (!id) {
                clearTimeout(failsafe)
                setLoading(false)
                return
            }

            let targetId = id
            if (id === 'me') {
                if (!user) {
                    const query = typeof window !== 'undefined' ? window.location.search : ''
                    router.push(`/login?redirect=${encodeURIComponent(`/profile/me${query}`)}`)
                    clearTimeout(failsafe)
                    setLoading(false)
                    return
                }
                targetId = user.id
            }

            let profileData: any = null
            let reviewsData: any[] = []

            // 1. Carrega via API interna com timeout estrito de 2.5s
            try {
                const res = await fetch(`/api/profile/${targetId}`, { 
                    cache: 'no-store',
                    signal: AbortSignal.timeout(2500)
                })
                if (res.ok) {
                    const json = await res.json()
                    if (json.success && json.profile) {
                        profileData = json.profile
                        reviewsData = json.reviews || []
                    }
                }
            } catch (apiErr) {
                console.warn('API profile fetch error, fallback to client:', apiErr)
            }

            // 2. Fallback: Consulta direta via Supabase Client se a API falhar
            if (!profileData) {
                const { data } = await supabase
                    .from('users')
                    .select('*')
                    .or(`id.eq.${targetId},supabase_user_id.eq.${targetId}`)
                    .maybeSingle()
                if (data) {
                    profileData = data
                }
            }

            // 3. Se for 'me' e não tiver perfil no banco ainda, auto-provisiona
            if (!profileData && id === 'me' && user) {
                const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
                const { data: newProfile } = await supabase
                    .from('users')
                    .insert({
                        supabase_user_id: user.id,
                        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
                        email: user.email,
                        role: 'cliente',
                        is_programmer: false,
                        avatar_url: googleAvatar || null
                    })
                    .select()
                    .single()
                if (newProfile) profileData = newProfile
            }

            if (!profileData) {
                console.warn('Profile not found for ID:', targetId)
                setProfile(null)
                return
            }

            setProfile(profileData)
            setReviews(reviewsData)
            setPreviewRole(profileData.role)
        } catch (err) {
            console.error('Error in loadData:', err)
        } finally {
            clearTimeout(failsafe)
            setLoading(false)
        }
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

    // Quick portfolio upload from profile page (with client-side compression and validation)
    const handleQuickPortfolioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileInput = event.target
        if (!fileInput.files || fileInput.files.length === 0 || !profile) return

        const currentPortfolio = (profile.portfolio_urls || []).filter(
            (u): u is string => Boolean(u && typeof u === 'string' && u.trim().length > 0)
        )
        const remainingCapacity = 12 - currentPortfolio.length
        if (remainingCapacity <= 0) {
            toast.error('Limite máximo de 12 fotos no portfólio já foi atingido.')
            return
        }

        const filesArray = Array.from(fileInput.files)

        // Validação estrita: rejeita arquivos que não sejam imagens (ex: PDFs)
        const nonImageFiles = filesArray.filter(f => !f.type.startsWith('image/'))
        if (nonImageFiles.length > 0) {
            toast.error('O portfólio aceita apenas fotos/imagens (JPG, PNG ou WebP). Arquivos PDF não são suportados como fotos.')
            if (fileInput) fileInput.value = ''
            return
        }

        const filesToUpload = filesArray.slice(0, Math.min(10, remainingCapacity))

        if (filesArray.length > remainingCapacity) {
            toast.info(`Você selecionou ${filesArray.length} fotos. Apenas as ${filesToUpload.length} que cabem no limite serão enviadas.`)
        }

        setAvatarUploading(true) // Reuso do estado para indicador de carregamento
        try {
            // Upload de cada arquivo individualmente com compressão para evitar payload 413 na Vercel
            const uploadPromises = filesToUpload.map(async (rawFile) => {
                const optimized = await optimizeImageFile(rawFile, 1600, 0.82)
                const uploadData = new FormData()
                uploadData.append('file', optimized)
                uploadData.append('userId', profile.id)
                uploadData.append('isPortfolio', 'true')

                const res = await fetch('/api/upload-avatar', {
                    method: 'POST',
                    body: uploadData
                })

                if (!res.ok) {
                    const text = await res.text()
                    let errMsg = 'Erro no envio de foto'
                    try {
                        const errJson = JSON.parse(text)
                        errMsg = errJson.error || errMsg
                    } catch {
                        errMsg = `Erro (${res.status}): ${text.slice(0, 100)}`
                    }
                    throw new Error(errMsg)
                }

                const json = await res.json()
                const url = json.publicUrl || json.avatarUrl || (json.urls && json.urls[0])
                return url as string
            })

            const uploadedResults = await Promise.all(uploadPromises)
            const newUrls = uploadedResults.filter(
                (url): url is string => Boolean(url && typeof url === 'string' && url.trim().length > 0)
            )

            if (newUrls.length === 0) {
                throw new Error('Nenhuma foto válida foi retornada do servidor.')
            }

            const updatedPortfolio = [...currentPortfolio, ...newUrls]

            // Atualiza no banco de dados de forma resiliente
            const { error: updateError } = await supabase
                .from('users')
                .update({ portfolio_urls: updatedPortfolio })
                .or(`id.eq.${profile.id},supabase_user_id.eq.${profile.supabase_user_id || profile.id}`)

            if (updateError) throw updateError

            toast.success(`${newUrls.length} foto(s) adicionada(s) com sucesso ao portfólio!`)
            await loadData()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Erro no upload rápido do portfólio:', error)
            toast.error('Falha ao adicionar fotos: ' + (error.message || 'Tente novamente'))
        } finally {
            setAvatarUploading(false)
            if (fileInput) fileInput.value = ''
        }
    }

    // Remoção rápida de item do portfólio com 1 clique (para apagar arquivos corrompidos ou indesejados)
    const handleRemovePortfolioItem = async (urlToRemove: string) => {
        if (!profile) return
        const currentPortfolio = (profile.portfolio_urls || []).filter(
            (u): u is string => Boolean(u && typeof u === 'string' && u.trim().length > 0)
        )
        const updatedPortfolio = currentPortfolio.filter(u => u !== urlToRemove)

        try {
            const { error: updateError } = await supabase
                .from('users')
                .update({ portfolio_urls: updatedPortfolio })
                .or(`id.eq.${profile.id},supabase_user_id.eq.${profile.supabase_user_id || profile.id}`)

            if (updateError) throw updateError

            setProfile(prev => prev ? { ...prev, portfolio_urls: updatedPortfolio } : null)
            toast.success('Item removido do portfólio com sucesso.')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Erro ao remover item do portfólio:', err)
            toast.error('Erro ao remover item: ' + (err.message || 'Tente novamente'))
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
    const isOwner = Boolean(
        id === 'me' ||
        (currentUser?.id && (
            currentUser.id === profile.supabase_user_id ||
            currentUser.id === profile.id ||
            currentUser.id === id
        ))
    )

    const isProgrammer = Boolean(profile.is_programmer || profile.role === 'criador')

    // 3. EDIT MODE
    if (isEditing) {
        return (
            <div className="min-h-screen bg-[#0B0D11] p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    <ProfileEditor
                        profile={profile}
                        onCancel={() => {
                            setIsEditing(false)
                            if (typeof window !== 'undefined') {
                                router.replace(`/profile/${profile?.id || id}`)
                            }
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onSave={(updatedUser?: any) => {
                            setIsEditing(false)
                            if (updatedUser) {
                                setProfile(prev => prev ? { ...prev, ...updatedUser } : updatedUser)
                                if (updatedUser.role) setPreviewRole(updatedUser.role)
                            }
                            toast.success('Perfil atualizado com sucesso!')

                            if (typeof window !== 'undefined') {
                                const urlParams = new URLSearchParams(window.location.search)
                                const returnTo = urlParams.get('returnTo')
                                if (returnTo && returnTo.startsWith('/')) {
                                    router.push(returnTo)
                                    return
                                }
                                router.replace(`/profile/${updatedUser?.id || profile?.id || id}`)
                            }

                            // Re-sync silenciosamente no background sem acionar tela de carregamento cheia
                            loadData(false)
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
                    <div className="absolute top-4 right-4 z-50 flex flex-wrap gap-2.5 items-center justify-end">
                        {(profile.is_programmer || profile.role === 'criador') && (
                            <button
                                onClick={toggleView}
                                className="bg-black/80 hover:bg-black text-white px-3 py-2 rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm shadow-md"
                            >
                                <Eye className="w-3.5 h-3.5 text-[#FFAE00]" />
                                {isProgrammerView ? 'Ver como Cliente' : 'Ver como Programador'}
                            </button>
                        )}

                        <button
                            onClick={() => {
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
                                {!(profile.is_programmer || profile.role === 'criador') && (profile.is_client || profile.client_business_type) && (
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

                            {/* Ações do Proprietário do Perfil */}
                            {isOwner && (
                                <div className="mt-4 mb-2 flex flex-col gap-2">
                                    <button
                                        onClick={() => {
                                            setIsEditing(true)
                                        }}
                                        className="w-full bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black px-4 py-2.5 rounded-xl text-xs font-black shadow-md shadow-[#FFB703]/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Configurar / Editar Perfil
                                    </button>

                                    {(!profile.is_programmer && profile.role !== 'criador') && (
                                        <button
                                            onClick={() => {
                                                setIsProgrammerModalOpen(true)
                                            }}
                                            className="w-full bg-[#181C26] hover:bg-[#202533] text-[#FFAE00] border border-[#FFAE00]/30 hover:border-[#FFAE00] px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Code className="w-3.5 h-3.5" /> Quero Produzir Matrizes
                                        </button>
                                    )}
                                </div>
                            )}

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
                                    {!isProgrammer ? (
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsProgrammerModalOpen(true)
                                                }}
                                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-black text-xs shadow-lg shadow-[#FFB703]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                                            >
                                                <Code className="w-4 h-4" />
                                                Quero Produzir Matrizes
                                            </button>
                                            <p className="text-[11px] text-gray-400 text-center mt-2 leading-tight">
                                                Acesso exclusivo para novos programadores
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(true)}
                                                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-black text-xs shadow-md shadow-[#FFB703]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                Configurar Portfólio & Softwares
                                            </button>
                                            <Link
                                                href="/jobs"
                                                className="block w-full text-center bg-[#1A1D23] border border-[#FFAE00] text-[#FFAE00] hover:bg-[#FFAE00] hover:text-[#0F1115] font-bold py-2.5 rounded-xl transition-colors text-xs"
                                            >
                                                Mural de Pedidos
                                            </Link>
                                        </div>
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

                        {/* Banner de Onboarding para Programador Aprovado configurar portfólio */}
                        {isOwner && isProgrammer && (!profile.skills || profile.skills.length === 0) && (
                            <div className="bg-gradient-to-r from-[#181C26] via-[#151922] to-[#181C26] rounded-2xl border-2 border-[#FFB703]/30 p-6 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[#FFB703]/10 rounded-full blur-2xl pointer-events-none" />
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                                    <div className="space-y-2 max-w-xl">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Acesso de Programador Liberado!
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-black text-white">
                                            Complete seu Perfil Profissional de Programador
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                            Seu convite foi validado com sucesso! Agora configure seus softwares (Wilcom, Embird, etc.), biografia, portfólio de matrizes e chave PIX para começar a enviar propostas no mural.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(true)
                                        }}
                                        className="shrink-0 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-black text-sm shadow-xl shadow-[#FFB703]/25 transition-all cursor-pointer"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Configurar Perfil e Portfólio
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Banner de Onboarding para Comprador que deseja virar Programador */}
                        {isOwner && !isProgrammer && (
                            <div className="bg-gradient-to-r from-[#181C26] via-[#151922] to-[#181C26] rounded-2xl border-2 border-white/10 p-6 shadow-2xl relative overflow-hidden">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                                    <div className="space-y-2 max-w-xl">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFB703]/10 border border-[#FFB703]/30 text-[#FFB703] text-xs font-bold uppercase tracking-wider">
                                            <Code className="w-3.5 h-3.5" />
                                            Mural de Pedidos
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-black text-white">
                                            Deseja produzir matrizes e enviar propostas?
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                            O cadastro de novos programadores é exclusivo para convidados selecionados. Se você é um profissional de bordado, clique abaixo para solicitar convite ou validar seu código.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsProgrammerModalOpen(true)
                                        }}
                                        className="shrink-0 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 active:scale-95 text-black font-black text-sm shadow-xl shadow-[#FFB703]/25 transition-all cursor-pointer"
                                    >
                                        <Code className="w-4 h-4" />
                                        Quero Produzir Matrizes
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
                                        <label className={`text-xs cursor-pointer transition-colors flex items-center gap-1.5 bg-[#0F1115] px-3 py-1.5 rounded-lg border ${avatarUploading ? 'text-gray-500 border-gray-800 cursor-not-allowed opacity-70' : 'text-gray-300 hover:text-[#FFAE00] border-gray-700 hover:border-[#FFAE00]'}`}>
                                            {avatarUploading ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFAE00]" />
                                                    <span>Enviando fotos...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-3.5 h-3.5" />
                                                    <span>Adicionar Fotos</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                accept="image/png, image/jpeg, image/jpg, image/webp"
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
                                            .map((url, idx) => {
                                                const isPdf = typeof url === 'string' && (url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf?') || url.toLowerCase().includes('.pdf'))

                                                if (isPdf) {
                                                    return (
                                                        <div key={idx} className="aspect-square bg-[#0F1115] rounded-xl overflow-hidden border border-red-900/40 hover:border-red-500/60 transition-all p-3 flex flex-col items-center justify-center text-center group relative">
                                                            <FileText className="w-10 h-10 text-red-400 mb-2 group-hover:scale-110 transition-transform" />
                                                            <span className="text-xs font-bold text-gray-300 line-clamp-1 px-1">Arquivo PDF</span>
                                                            <span className="text-[10px] text-gray-500 mb-2">Não pré-visualizável</span>
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[11px] font-semibold text-[#FFAE00] hover:underline bg-[#FFAE00]/10 px-2.5 py-1 rounded-md"
                                                            >
                                                                Abrir arquivo
                                                            </a>
                                                            {isOwner && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        if (confirm('Deseja remover este PDF do seu portfólio?')) {
                                                                            handleRemovePortfolioItem(url)
                                                                        }
                                                                    }}
                                                                    title="Remover do portfólio"
                                                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white transition-all shadow-lg cursor-pointer"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )
                                                }

                                                return (
                                                    <div key={idx} className="aspect-square bg-black rounded-xl overflow-hidden border border-gray-800 hover:border-[#FFAE00] transition-colors group relative">
                                                        <Image
                                                            src={url}
                                                            alt={`Portfolio ${idx + 1}`}
                                                            fill
                                                            className="object-contain group-hover:scale-105 transition-transform duration-300"
                                                            unoptimized
                                                        />
                                                        {isOwner && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    if (confirm('Deseja remover esta imagem do seu portfólio?')) {
                                                                        handleRemovePortfolioItem(url)
                                                                    }
                                                                }}
                                                                title="Remover foto do portfólio"
                                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 hover:bg-red-600 text-white transition-all shadow-lg opacity-90 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            })}
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

            {/* Modal de Acesso a Programadores (Convite ou Lista de Espera) */}
            <ProgrammerAccessModal
                isOpen={isProgrammerModalOpen}
                onClose={() => setIsProgrammerModalOpen(false)}
                userProfile={profile}
                defaultCode={inviteCodeFromUrl}
                onProgrammerActivated={(updated) => {
                    const fullUpdated = {
                        ...profile,
                        ...updated,
                        is_programmer: true,
                        role: 'criador'
                    }
                    setProfile(fullUpdated)
                    setPreviewRole('criador')
                    try {
                        localStorage.setItem('current_user_profile', JSON.stringify(fullUpdated))
                    } catch {}
                    setIsEditing(true)
                    loadData(false)
                }}
                onConfigureProfile={() => {
                    setIsEditing(true)
                }}
            />
        </div>
    )
}
