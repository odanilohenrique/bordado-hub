'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { getCached, setCached, clearCache, clearCacheByPrefix } from '@/lib/clientCache'

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
    profileLoading: boolean
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    profileId: null,
    loading: true,
    profileLoading: true,
    refreshProfile: async () => {},
})

function isProfileMatchingUser(cachedProf: UserProfile | null, supabaseUserId?: string | null): boolean {
    if (!cachedProf || !cachedProf.id || !supabaseUserId) return false
    if (!cachedProf.supabase_user_id || cachedProf.supabase_user_id !== supabaseUserId) {
        return false
    }
    return true
}

function clearAuthCaches(): void {
    clearCache('current_user_auth')
    clearCache('current_user_profile')
    clearCache('current_user_profile_id')
    clearCacheByPrefix('profile_')
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.removeItem('current_user_profile')
        } catch {}
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [profileLoading, setProfileLoading] = useState<boolean>(true)

    const isMountedRef = useRef<boolean>(true)
    const activeAuthUserIdRef = useRef<string | null>(null)
    const authEpochRef = useRef<number>(0)
    const pendingProfileEpochRef = useRef<number | null>(null)
    const failsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const profileRef = useRef<UserProfile | null>(null)
    const inFlightProfileRef = useRef<Map<string, { epoch: number; promise: Promise<UserProfile | null> }>>(new Map())
    const inFlightInitRef = useRef<Promise<void> | null>(null)

    const clearFailsafeTimer = useCallback(() => {
        const timeoutTimer = failsafeTimerRef.current
        if (timeoutTimer) {
            clearTimeout(timeoutTimer)
            failsafeTimerRef.current = null
        }
    }, [])

    const armFailsafeTimer = useCallback((expectedEpoch: number) => {
        clearFailsafeTimer()
        const timer = setTimeout(() => {
            if (failsafeTimerRef.current === timer) {
                failsafeTimerRef.current = null
            }
            if (isMountedRef.current && authEpochRef.current === expectedEpoch) {
                if (pendingProfileEpochRef.current === expectedEpoch) {
                    pendingProfileEpochRef.current = null
                }
                setProfileLoading(false)
                setLoading(false)
            }
        }, 8000)
        failsafeTimerRef.current = timer
    }, [clearFailsafeTimer])

    const fetchUserProfile = useCallback(async (
        supabaseUserId: string,
        authUserParam?: User | null,
        options?: { force?: boolean }
    ): Promise<UserProfile | null> => {
        if (!supabaseUserId) return null

        const callEpoch = authEpochRef.current

        if (!options?.force) {
            const existing = inFlightProfileRef.current.get(supabaseUserId)
            if (existing && existing.epoch === callEpoch) {
                return existing.promise
            }
        }

        const isStaleCall = () =>
            !isMountedRef.current ||
            activeAuthUserIdRef.current !== supabaseUserId ||
            authEpochRef.current !== callEpoch

        let settled = false
        let runnerPromise: Promise<UserProfile | null> | null = null
        const runProfileFetch = async (): Promise<UserProfile | null> => {
            try {
                // Check cache first, strictly validating session ownership to prevent cross-session cache bleed
                const cachedProfile = getCached<UserProfile>('current_user_profile')
                const isCachedMatch = Boolean(
                    cachedProfile?.id &&
                    supabaseUserId &&
                    isProfileMatchingUser(cachedProfile, supabaseUserId)
                )

                if (cachedProfile && !isCachedMatch) {
                    clearCache()
                    if (!isStaleCall()) {
                        profileRef.current = null
                        setProfile(null)
                    }
                } else if (isCachedMatch && cachedProfile && !options?.force) {
                    if (!isStaleCall()) {
                        profileRef.current = cachedProfile
                        setProfile(cachedProfile)
                    }
                }

                // Bounded retry on transient query errors (do NOT retry genuine missing rows)
                const retryDelays = [300, 700]
                let lastError: unknown = null
                let querySucceeded = false
                let queriedProfile: UserProfile | null = null

                for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
                    if (isStaleCall()) {
                        return null
                    }

                    try {
                        const { data, error } = await supabase
                            .from('users')
                            .select('*')
                            .eq('supabase_user_id', supabaseUserId)
                            .maybeSingle()

                        if (isStaleCall()) {
                            return null
                        }

                        if (!error) {
                            querySucceeded = true
                            queriedProfile = (data as UserProfile | null) ?? null
                            break
                        }

                        lastError = error
                        console.error(`Error fetching user profile (attempt ${attempt + 1}):`, error)
                    } catch (queryErr) {
                        if (isStaleCall()) {
                            return null
                        }
                        lastError = queryErr
                        console.error(`Exception fetching user profile (attempt ${attempt + 1}):`, queryErr)
                    }

                    if (attempt < retryDelays.length) {
                        await sleep(retryDelays[attempt])
                        if (isStaleCall()) {
                            return null
                        }
                    }
                }

                if (isStaleCall()) {
                    return null
                }

                if (!querySucceeded) {
                    console.warn('Exhausted retries fetching user profile:', lastError)
                    return isCachedMatch && cachedProfile ? cachedProfile : null
                }

                if (queriedProfile) {
                    profileRef.current = queriedProfile
                    setProfile(queriedProfile)
                    setCached('current_user_profile', queriedProfile, 300000)
                    setCached('current_user_profile_id', queriedProfile.id, 300000)
                    setCached(`profile_${queriedProfile.id}`, queriedProfile, 120000)
                    return queriedProfile
                }

                // Auto-heal missing profile row if user is authenticated in Supabase Auth
                let authUser = authUserParam
                if (!authUser) {
                    const { data: { session: curSession } } = await supabase.auth.getSession()
                    authUser = curSession?.user ?? null
                }

                if (isStaleCall()) {
                    return null
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
                        if (isStaleCall()) {
                            return null
                        }
                        if (res.ok) {
                            const resJson = await res.json()
                            const newProfile = resJson?.data as UserProfile | undefined
                            if (newProfile && !isStaleCall()) {
                                profileRef.current = newProfile
                                setProfile(newProfile)
                                setCached('current_user_profile', newProfile, 300000)
                                setCached('current_user_profile_id', newProfile.id, 300000)
                                setCached(`profile_${newProfile.id}`, newProfile, 120000)
                                return newProfile
                            }
                        }
                    } catch (autoErr) {
                        console.error('Failed to auto-provision user profile:', autoErr)
                    }
                }
            } catch (err) {
                console.error('Exception fetching user profile:', err)
            } finally {
                settled = true
                const currentEntry = inFlightProfileRef.current.get(supabaseUserId)
                if (runnerPromise && currentEntry && currentEntry.epoch === callEpoch && currentEntry.promise === runnerPromise) {
                    inFlightProfileRef.current.delete(supabaseUserId)
                }
            }
            return null
        }

        runnerPromise = runProfileFetch()
        if (!settled) {
            inFlightProfileRef.current.set(supabaseUserId, { epoch: callEpoch, promise: runnerPromise })
        }
        return runnerPromise
    }, [])

    const refreshProfile = useCallback(async () => {
        const startEpoch = authEpochRef.current
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user && isMountedRef.current && authEpochRef.current === startEpoch) {
                activeAuthUserIdRef.current = session.user.id
                if (!profileRef.current) {
                    setProfileLoading(true)
                }
                await fetchUserProfile(session.user.id, session.user, { force: true })
            }
        } catch (err) {
            console.warn('Error refreshing profile:', err)
        } finally {
            if (isMountedRef.current && authEpochRef.current === startEpoch) {
                setProfileLoading(false)
            }
        }
    }, [fetchUserProfile])

    useEffect(() => {
        isMountedRef.current = true
        const pendingAuthTimers = new Set<ReturnType<typeof setTimeout>>()

        const clearPendingAuthTimers = () => {
            for (const timer of pendingAuthTimers) {
                clearTimeout(timer)
            }
            pendingAuthTimers.clear()
        }

        // Clean up any legacy localStorage profile cache on mount (post-SSR hydration)
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.removeItem('current_user_profile')
            } catch {}
        }

        // Hydrate warm sessionStorage cache after mount to avoid SSR hydration mismatch
        const cachedAuth = getCached<User>('current_user_auth')
        const cachedProf = getCached<UserProfile>('current_user_profile')
        if (cachedAuth?.id) {
            activeAuthUserIdRef.current = cachedAuth.id
            setUser(cachedAuth)
            if (cachedProf?.id && isProfileMatchingUser(cachedProf, cachedAuth.id)) {
                profileRef.current = cachedProf
                setProfile(cachedProf)
                setLoading(false)
                setProfileLoading(false)
            } else if (cachedProf && !isProfileMatchingUser(cachedProf, cachedAuth.id)) {
                clearAuthCaches()
                setCached('current_user_auth', cachedAuth, 300000)
            }
        }

        // Deadlock failsafe timer (generous 8s so active getSession/fetchUserProfile are never cut off prematurely)
        armFailsafeTimer(authEpochRef.current)

        const initAuth = async () => {
            const myEpoch = authEpochRef.current
            if (inFlightInitRef.current) {
                return inFlightInitRef.current.finally(() => {
                    if (authEpochRef.current === myEpoch) {
                        clearFailsafeTimer()
                    }
                })
            }

            let initPromise: Promise<void> | null = null
            const runInit = async () => {
                try {
                    const { data: { session }, error } = await supabase.auth.getSession()
                    if (error) {
                        console.error('Session error:', error)
                    }

                    if (!isMountedRef.current || authEpochRef.current !== myEpoch) {
                        return
                    }

                    const currentUser = session?.user ?? null
                    setUser(currentUser)

                    if (currentUser) {
                        activeAuthUserIdRef.current = currentUser.id
                        setCached('current_user_auth', currentUser, 300000)
                        const currentCachedProf = getCached<UserProfile>('current_user_profile')
                        if (currentCachedProf && !isProfileMatchingUser(currentCachedProf, currentUser.id)) {
                            clearCache()
                            setCached('current_user_auth', currentUser, 300000)
                            profileRef.current = null
                            setProfile(null)
                        } else if (currentCachedProf?.id && isProfileMatchingUser(currentCachedProf, currentUser.id)) {
                            profileRef.current = currentCachedProf
                            setProfile(currentCachedProf)
                            setLoading(false) // 0ms ready!
                            setProfileLoading(false)
                        }
                        await fetchUserProfile(currentUser.id, currentUser)
                    } else {
                        activeAuthUserIdRef.current = null
                        clearAuthCaches()
                        profileRef.current = null
                        setProfile(null)
                    }
                } catch (err) {
                    console.error('Exception during initAuth:', err)
                } finally {
                    if (initPromise && inFlightInitRef.current === initPromise) {
                        inFlightInitRef.current = null
                    }
                    if (authEpochRef.current === myEpoch) {
                        clearFailsafeTimer()
                        if (isMountedRef.current) {
                            setProfileLoading(false)
                            setLoading(false)
                        }
                    }
                }
            }

            initPromise = runInit()
            inFlightInitRef.current = initPromise
            return initPromise
        }

        void initAuth()

        // IMPORTANT: Do NOT await supabase.from(...) directly inside onAuthStateChange.
        // GoTrueClient holds initializePromise / _acquireLock while notifying subscribers,
        // so synchronous state updates + setTimeout(..., 0) avoid circular lock waits.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isMountedRef.current) return

            if (event === 'INITIAL_SESSION' && inFlightInitRef.current) {
                return
            }

            const currentUser = session?.user ?? null

            if (event === 'SIGNED_OUT' || !currentUser) {
                authEpochRef.current += 1
                pendingProfileEpochRef.current = null
                activeAuthUserIdRef.current = null
                inFlightProfileRef.current.clear()
                clearFailsafeTimer()
                clearPendingAuthTimers()
                if (event === 'SIGNED_OUT') {
                    clearCache()
                } else {
                    clearAuthCaches()
                }
                profileRef.current = null
                setUser(null)
                setProfile(null)
                setProfileLoading(false)
                setLoading(false)
                return
            }

            const isUserSwitch = activeAuthUserIdRef.current !== null && activeAuthUserIdRef.current !== currentUser.id
            const cachedProfile = getCached<UserProfile>('current_user_profile')
            const isCachedMismatch = Boolean(cachedProfile && !isProfileMatchingUser(cachedProfile, currentUser.id))

            // If session switched to a different auth user, purge stale caches immediately
            if (isUserSwitch || isCachedMismatch) {
                clearCache()
                profileRef.current = null
                setProfile(null)
            }

            activeAuthUserIdRef.current = currentUser.id
            setUser(currentUser)
            setCached('current_user_auth', currentUser, 300000)

            const hasMatchingStateProfile = Boolean(
                !isUserSwitch &&
                profileRef.current?.id &&
                isProfileMatchingUser(profileRef.current, currentUser.id)
            )
            const hasMatchingCachedProfile = Boolean(
                !isUserSwitch &&
                !isCachedMismatch &&
                cachedProfile?.id &&
                isProfileMatchingUser(cachedProfile, currentUser.id)
            )
            const hasResolvedProfile = hasMatchingStateProfile || hasMatchingCachedProfile

            if (!hasMatchingStateProfile && hasMatchingCachedProfile && cachedProfile) {
                profileRef.current = cachedProfile
                setProfile(cachedProfile)
            }

            if (!hasResolvedProfile) {
                setLoading(true)
                setProfileLoading(true)
            } else if (event === 'USER_UPDATED') {
                setProfileLoading(true)
            }

            const shouldBumpEpoch = event === 'SIGNED_IN' || event === 'USER_UPDATED' || isUserSwitch
            const shouldFetchProfile =
                event === 'SIGNED_IN' ||
                event === 'USER_UPDATED' ||
                !hasResolvedProfile

            if (shouldBumpEpoch) {
                clearPendingAuthTimers()
            }
            const myEpoch = shouldBumpEpoch ? ++authEpochRef.current : authEpochRef.current

            if (!shouldFetchProfile) {
                if (pendingProfileEpochRef.current !== authEpochRef.current) {
                    setProfileLoading(false)
                    setLoading(false)
                }
                return
            }

            if (!shouldBumpEpoch && pendingProfileEpochRef.current === myEpoch) {
                return
            }

            clearPendingAuthTimers()
            pendingProfileEpochRef.current = myEpoch
            armFailsafeTimer(myEpoch)

            const deferredTimer = setTimeout(() => {
                pendingAuthTimers.delete(deferredTimer)
                if (
                    !isMountedRef.current ||
                    activeAuthUserIdRef.current !== currentUser.id ||
                    authEpochRef.current !== myEpoch
                ) {
                    return
                }

                void fetchUserProfile(
                    currentUser.id,
                    currentUser,
                    event === 'USER_UPDATED' ? { force: true } : undefined
                ).finally(() => {
                    if (authEpochRef.current === myEpoch) {
                        clearFailsafeTimer()
                        if (pendingProfileEpochRef.current === myEpoch) {
                            pendingProfileEpochRef.current = null
                        }
                        if (isMountedRef.current && activeAuthUserIdRef.current === currentUser.id) {
                            setProfileLoading(false)
                            setLoading(false)
                        }
                    }
                })
            }, 0)
            pendingAuthTimers.add(deferredTimer)
        })

        const handleProfileUpdated = (event: Event) => {
            if (!isMountedRef.current) return
            const customEvent = event as CustomEvent<UserProfile | undefined>
            const detail = customEvent?.detail
            if (detail && detail.id) {
                const prev = profileRef.current
                const mergedBase = prev && prev.id === detail.id ? { ...prev, ...detail } : detail
                const stampedSupabaseUserId = activeAuthUserIdRef.current ?? mergedBase.supabase_user_id
                const merged: UserProfile = stampedSupabaseUserId
                    ? { ...mergedBase, supabase_user_id: stampedSupabaseUserId }
                    : mergedBase
                profileRef.current = merged
                setProfile(merged)
                setCached('current_user_profile', merged, 300000)
                setCached('current_user_profile_id', merged.id, 300000)
                setCached(`profile_${merged.id}`, merged, 120000)
            } else {
                void refreshProfile()
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('bordadohub_profile_updated', handleProfileUpdated)
        }

        return () => {
            isMountedRef.current = false
            clearFailsafeTimer()
            clearPendingAuthTimers()
            subscription.unsubscribe()
            if (typeof window !== 'undefined') {
                window.removeEventListener('bordadohub_profile_updated', handleProfileUpdated)
            }
        }
    }, [fetchUserProfile, refreshProfile, clearFailsafeTimer, armFailsafeTimer])

    const profileId = profile?.id ?? null

    const contextValue = useMemo<AuthContextType>(
        () => ({ user, profile, profileId, loading, profileLoading, refreshProfile }),
        [user, profile, profileId, loading, profileLoading, refreshProfile]
    )

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
