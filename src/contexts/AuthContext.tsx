'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { getCached, setCached, clearCache } from '@/lib/clientCache'

export interface UserProfile {
    id: string
    supabase_user_id?: string
    name: string
    role: string
    avatar_url?: string | null
    bio?: string | null
    email?: string | null
    whatsapp?: string | null
    is_programmer?: boolean
    is_client?: boolean
    client_business_type?: string | null
    client_machine_brand?: string | null
    skills?: string[] | null
    formats?: string[] | null
    experience_level?: string | null
    portfolio_urls?: string[] | null
    cpf_cnpj?: string | null
    pix_key?: string | null
    pix_key_type?: string | null
    rating?: number | null
    reviews_count?: number | null
}

interface AuthContextType {
    user: User | null
    profile: UserProfile | null
    profileId: string | null
    loading: boolean
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    profileId: null,
    loading: true,
    refreshProfile: async () => {},
})

function isProfileMatchingUser(cachedProf: UserProfile | null, supabaseUserId?: string | null): boolean {
    if (!cachedProf || !cachedProf.id) return false
    if (!supabaseUserId) return true
    if (cachedProf.supabase_user_id && cachedProf.supabase_user_id !== supabaseUserId) {
        return false
    }
    return true
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(() => getCached<User>('current_user_auth'))
    const [profile, setProfile] = useState<UserProfile | null>(() => {
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.removeItem('current_user_profile')
            } catch {}
        }
        const cachedAuth = getCached<User>('current_user_auth')
        const cachedProf = getCached<UserProfile>('current_user_profile')
        if (cachedProf && isProfileMatchingUser(cachedProf, cachedAuth?.id)) {
            return cachedProf
        }
        return null
    })
    const [loading, setLoading] = useState<boolean>(() => !getCached<User>('current_user_auth'))

    const fetchUserProfile = useCallback(async (supabaseUserId: string, authUserParam?: User | null): Promise<UserProfile | null> => {
        try {
            // Check cache first, strictly validating session ownership to prevent cross-session cache bleed
            const cachedProfile = getCached<UserProfile>('current_user_profile')
            if (cachedProfile && !isProfileMatchingUser(cachedProfile, supabaseUserId)) {
                clearCache()
                setProfile(null)
            } else if (cachedProfile && cachedProfile.id) {
                setProfile(cachedProfile)
            }

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('supabase_user_id', supabaseUserId)
                .maybeSingle()

            if (error) {
                console.error('Error fetching user profile:', error)
                return (cachedProfile && isProfileMatchingUser(cachedProfile, supabaseUserId)) ? cachedProfile : null
            }

            if (data) {
                setProfile(data)
                setCached('current_user_profile', data, 300000)
                setCached('current_user_profile_id', data.id, 300000)
                setCached(`profile_${data.id}`, data, 120000)
                return data
            }

            // Auto-heal missing profile row if user is authenticated in Supabase Auth
            let authUser = authUserParam
            if (!authUser) {
                const { data: { session: curSession } } = await supabase.auth.getSession()
                authUser = curSession?.user ?? null
            }

            if (authUser?.email) {
                try {
                    const res = await fetch('/api/create-profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: supabaseUserId,
                            email: authUser.email,
                            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split('@')[0],
                            avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
                            role: 'cliente',
                            is_programmer: false
                        })
                    })
                    const resJson = await res.json()
                    const newProfile = resJson?.data
                    if (newProfile) {
                        setProfile(newProfile)
                        setCached('current_user_profile', newProfile, 300000)
                        setCached('current_user_profile_id', newProfile.id, 300000)
                        setCached(`profile_${newProfile.id}`, newProfile, 120000)
                        return newProfile
                    }
                } catch (autoErr) {
                    console.error('Failed to auto-provision user profile:', autoErr)
                }
            }
        } catch (err) {
            console.error('Exception fetching user profile:', err)
        }
        return null
    }, [])

    const refreshProfile = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                await fetchUserProfile(session.user.id, session.user)
            }
        } catch (err) {
            console.warn('Error refreshing profile:', err)
        }
    }, [fetchUserProfile])

    useEffect(() => {
        let isMounted = true

        // Clean up any legacy localStorage profile cache on mount
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.removeItem('current_user_profile')
            } catch {}
        }

        // Guaranteed timeout: auth loading will NEVER be stuck longer than 1.5s
        const timeoutTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 1500)

        const initAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()
                if (error) {
                    console.error('Session error:', error)
                }

                const currentUser = session?.user ?? null
                if (isMounted) {
                    setUser(currentUser)
                    if (currentUser) {
                        setCached('current_user_auth', currentUser, 300000)
                        const cachedProf = getCached<UserProfile>('current_user_profile')
                        if (cachedProf && !isProfileMatchingUser(cachedProf, currentUser.id)) {
                            clearCache()
                            setProfile(null)
                        } else if (cachedProf && cachedProf.id) {
                            setProfile(cachedProf)
                            setLoading(false) // 0ms ready!
                        }
                        await fetchUserProfile(currentUser.id, currentUser)
                    } else {
                        clearCache()
                        setProfile(null)
                    }
                }
            } catch (err) {
                console.error('Exception during initAuth:', err)
            } finally {
                clearTimeout(timeoutTimer)
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return

            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (event === 'SIGNED_OUT' || !currentUser) {
                clearCache()
                setProfile(null)
                setLoading(false)
                return
            }

            setCached('current_user_auth', currentUser, 300000)
            const cachedProfile = getCached<UserProfile>('current_user_profile')

            // If session switched to a different auth user, purge stale caches immediately
            if (cachedProfile && !isProfileMatchingUser(cachedProfile, currentUser.id)) {
                clearCache()
                setCached('current_user_auth', currentUser, 300000)
                setProfile(null)
            }

            if (
                event === 'SIGNED_IN' ||
                event === 'USER_UPDATED' ||
                event === 'TOKEN_REFRESHED' ||
                !cachedProfile ||
                !isProfileMatchingUser(cachedProfile, currentUser.id)
            ) {
                await fetchUserProfile(currentUser.id, currentUser)
            }

            if (isMounted) {
                setLoading(false)
            }
        })

        const handleProfileUpdated = (event: Event) => {
            if (!isMounted) return
            const customEvent = event as CustomEvent<UserProfile | undefined>
            const detail = customEvent?.detail
            if (detail && detail.id) {
                setProfile(prev => {
                    const merged = prev && prev.id === detail.id ? { ...prev, ...detail } : detail
                    setCached('current_user_profile', merged, 300000)
                    setCached('current_user_profile_id', merged.id, 300000)
                    setCached(`profile_${merged.id}`, merged, 120000)
                    return merged
                })
            } else {
                refreshProfile()
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('bordadohub_profile_updated', handleProfileUpdated)
        }

        return () => {
            isMounted = false
            clearTimeout(timeoutTimer)
            subscription.unsubscribe()
            if (typeof window !== 'undefined') {
                window.removeEventListener('bordadohub_profile_updated', handleProfileUpdated)
            }
        }
    }, [fetchUserProfile, refreshProfile])

    const profileId = profile?.id ?? null

    return (
        <AuthContext.Provider value={{ user, profile, profileId, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
