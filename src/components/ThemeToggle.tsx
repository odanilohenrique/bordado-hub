'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/ClientProviders'

interface ThemeToggleProps {
    className?: string
    showLabel?: boolean
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
    const { theme, toggleTheme } = useTheme()

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            className={`inline-flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--btn-glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass)] transition-colors cursor-pointer ${className}`}
        >
            <Sun className="w-4 h-4 hidden dark:block shrink-0" />
            <Moon className="w-4 h-4 block dark:hidden shrink-0" />
            {showLabel && (
                <span className="text-xs font-medium">
                    <span className="hidden dark:inline">Tema Claro</span>
                    <span className="inline dark:hidden">Tema Escuro</span>
                </span>
            )}
        </button>
    )
}
