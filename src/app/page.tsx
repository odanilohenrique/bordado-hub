'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    if (!loading && user) {
      // If user is already authenticated, take them directly into their working space
      if (profile?.role === 'criador') {
        router.replace('/jobs')
      } else {
        router.replace('/pedidos')
      }
    }
  }, [user, profile, loading, router])

  // While checking auth for logged-in users, prevent landing page flash
  if (user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FFAE00]/20 border-t-[#FFAE00] rounded-full animate-spin" />
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
