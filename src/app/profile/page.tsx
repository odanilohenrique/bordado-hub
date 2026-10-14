'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ProfileRedirect() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
        router.replace(`/profile/me${query}`)
    }, [router, searchParams])

    return (
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#FFAE00]/20 border-t-[#FFAE00] rounded-full animate-spin" />
        </div>
    )
}

export default function ProfileIndexPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#FFAE00]/20 border-t-[#FFAE00] rounded-full animate-spin" />
            </div>
        }>
            <ProfileRedirect />
        </Suspense>
    )
}
