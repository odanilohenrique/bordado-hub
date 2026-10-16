'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Hero from '@/components/Hero'
import Categories from '@/components/Categories'
import HowItWorks from '@/components/HowItWorks'
import Testimonials from '@/components/Testimonials'
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
      <div className="min-h-screen bg-[#0F1115] flex flex-col items-center justify-center text-center px-4">
        <div className="w-12 h-12 border-4 border-[#FFAE00]/20 border-t-[#FFAE00] rounded-full animate-spin mb-4" />
        <p className="text-gray-300 font-semibold text-sm">
          {isProcessingAuth ? 'Confirmando seu e-mail e preparando sua conta...' : 'Carregando sua conta...'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1115]">
      <Hero />
      <Categories />
      <HowItWorks />
      <Testimonials />
      <Footer />
    </div>
  )
}
