'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import HeroSection from '@/components/home/HeroSection'
import TrustLogowall from '@/components/home/TrustLogowall'
import MarketplaceShowcase from '@/components/home/MarketplaceShowcase'
import EnginesCaseCards from '@/components/home/EnginesCaseCards'
import FinalCta from '@/components/home/FinalCta'
import Footer from '@/components/Footer'

export default function Home() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [isProcessingAuth, setIsProcessingAuth] = useState(false)

  useEffect(() => {
    // Detecta se a home foi aberta a partir de um link de confirmação do Supabase
    if (typeof window !== 'undefined') {
      const search = window.location.search
      const hash = window.location.hash

      // Se a URL contém token de confirmação ou código PKCE do Supabase
      const hasAuthCode = search.includes('code=')
      const hasAccessToken = hash.includes('access_token=')
      const isSignupConfirmation = search.includes('type=signup') || hash.includes('type=signup')

      if (hasAuthCode || hasAccessToken || isSignupConfirmation) {
        setIsProcessingAuth(true)
        router.replace(`/auth/callback${search}${hash}`)
        return
      }
    }

    if (!loading && user) {
      // Se usuário já autenticado, leva diretamente para a área de trabalho
      if (profile?.role === 'criador') {
        router.replace('/jobs')
      } else {
        router.replace('/pedidos')
      }
    }
  }, [user, profile, loading, router])

  // Feedback visual enquanto processa confirmação de autenticação ou checa sessão
  if (isProcessingAuth || user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center text-center px-4">
        <div className="w-11 h-11 border-4 border-[#2563EB]/20 border-t-[#2563EB] dark:border-[#3B82F6]/20 dark:border-t-[#3B82F6] rounded-full animate-spin mb-4" />
        <p className="text-[var(--text-secondary)] font-semibold text-sm">
          {isProcessingAuth ? 'Confirmando seu e-mail e preparando sua conta...' : 'Carregando sua conta...'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <HeroSection />
      <TrustLogowall />
      <MarketplaceShowcase />
      <EnginesCaseCards />
      <FinalCta />
      <Footer />
    </div>
  )
}
