'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import GlobalNotificationAlert from '@/components/GlobalNotificationAlert'
import { AuthProvider } from '@/contexts/AuthContext'

export type ThemeMode = 'dark' | 'light'

interface ThemeContextValue {
    theme: ThemeMode
    setTheme: (mode: ThemeMode) => void
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    setTheme: () => {},
    toggleTheme: () => {},
})

export const THEME_STORAGE_KEY = 'bh_theme'

function applyThemeToDom(mode: ThemeMode) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(mode)
    root.style.colorScheme = mode
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>('dark')

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
            const initial: ThemeMode = stored === 'light' ? 'light' : 'dark'
            setThemeState(initial)
            applyThemeToDom(initial)
        } catch {
            applyThemeToDom('dark')
        }
    }, [])

    const setTheme = useCallback((mode: ThemeMode) => {
        setThemeState(mode)
        applyThemeToDom(mode)
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, mode)
        } catch {
            // Safari private mode / disabled storage
        }
    }, [])

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
            applyThemeToDom(next)
            try {
                window.localStorage.setItem(THEME_STORAGE_KEY, next)
            } catch {
                // ignore
            }
            return next
        })
    }, [])

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                {children}
                <GlobalNotificationAlert />
            </AuthProvider>
        </ThemeProvider>
    )
}
