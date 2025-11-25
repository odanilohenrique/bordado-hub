'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function checkUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('supabase_user_id', user.id)
                .single()

            if (profile) {
                if (profile.role === 'cliente') {
                    router.push('/dashboard/client')
                } else if (profile.role === 'criador') {
                    router.push('/dashboard/creator')
                }
            } else {
                // Handle case where profile doesn't exist (shouldn't happen if register flow works)
                setLoading(false)
            }
        }

        checkUser()
    }, [router])

    if (loading) {
        return <div className="flex justify-center items-center h-64">Carregando...</div>
    }

    return (
        <div className="text-center mt-10">
            <h2 className="text-xl font-semibold">Perfil não encontrado ou erro ao carregar.</h2>
        </div>
    )
}
