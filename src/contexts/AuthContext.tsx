'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { getCached, setCached, clearCache } from '@/lib/clientCache'

export interface UserProfile {
    id: string
    name: string
    role: string
    avatar_url?: string | null
    bio?: string | null
    email?: string | null
    whatsapp?: string | null
    skills?: string[] | null
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(() => getCached<User>('current_user_auth'))
    const [profile, setProfile] = useState<UserProfile | null>(() => getCached<UserProfile>('current_user_profile'))
    const [loading, setLoading] = useState<boolean>(() => !getCached<User>('current_user_auth'))

    const fetchUserProfile = useCallback(async (supabaseUserId: string, authUserParam?: User | null): Promise<UserProfile | null> => {
        try {
            // Check cache first for 0ms retrieval
            const cachedProfile = getCached<UserProfile>('current_user_profile')
            if (cachedProfile && cachedProfile.id) {
                setProfile(cachedProfile)
            }

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('supabase_user_id', supabaseUserId)
                .maybeSingle()

            if (error) {
                console.error('Error fetching user profile:', error)
                return cachedProfile || null
            }

            if (data) {
                setProfile(data)
                setCached('current_user_profile', data, 300000)
                setCached('current_user_profile_id', data.id, 300000)
                return data
            }

            // Auto-heal missing profile row if user is authenticated in Supabase Auth (safe getSession, no lock contention)
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
                            role: 'criador'
                        })
                    })
                    const resJson = await res.json()
                    const newProfile = resJson?.data
                    if (newProfile) {
                        setProfile(newProfile)
                        setCached('current_user_profile', newProfile, 300000)
                        setCached('current_user_profile_id', newProfile.id, 300000)
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
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
            await fetchUserProfile(session.user.id, session.user)
        }
    }, [fetchUserProfile])

    useEffect(() => {
        let isMounted = true

        // Guaranteed timeout: auth loading will NEVER be stuck longer than 3.5 seconds
        const timeoutTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 3500)

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
                        await fetchUserProfile(currentUser.id, currentUser)
                    } else {
                        clearCache('current_user_auth')
                        clearCache('current_user_profile')
                        clearCache('current_user_profile_id')
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

            if (currentUser) {
                setCached('current_user_auth', currentUser, 300000)
                if (event === 'SIGNED_IN') {
                    await fetchUserProfile(currentUser.id, currentUser)
                }
            } else {
                clearCache('current_user_auth')
                clearCache('current_user_profile')
                clearCache('current_user_profile_id')
                setProfile(null)
            }
            setLoading(false)
        })

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [fetchUserProfile])

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
