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
    // Instant sync mount from memory cache
    const [user, setUser] = useState<User | null>(() => getCached<User>('current_user_auth'))
    const [profile, setProfile] = useState<UserProfile | null>(() => getCached<UserProfile>('current_user_profile'))
    const [loading, setLoading] = useState<boolean>(() => !getCached<User>('current_user_auth'))

    const fetchUserProfile = useCallback(async (supabaseUserId: string): Promise<UserProfile | null> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('supabase_user_id', supabaseUserId)
                .maybeSingle()

            if (error) {
                console.error('Error fetching user profile:', error)
                return null
            }

            if (data) {
                setProfile(data)
                setCached('current_user_profile', data, 300000)
                setCached('current_user_profile_id', data.id, 300000)
                return data
            }
        } catch (err) {
            console.error('Exception fetching user profile:', err)
        }
        return null
    }, [])

    const refreshProfile = useCallback(async () => {
        if (user?.id) {
            await fetchUserProfile(user.id)
        }
    }, [user?.id, fetchUserProfile])

    useEffect(() => {
        let isMounted = true

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
                        await fetchUserProfile(currentUser.id)
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
                if (event === 'SIGNED_IN' || !profile) {
                    await fetchUserProfile(currentUser.id)
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

    const profileId = profile?.id ?? getCached<string>('current_user_profile_id') ?? null

    return (
        <AuthContext.Provider value={{ user, profile, profileId, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
