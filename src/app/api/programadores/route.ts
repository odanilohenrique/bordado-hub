import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = createServiceClient()

        // Busca todos os usuários criadores ou que possuem skills/especialidades cadastradas
        const { data: programmers, error } = await supabase
            .from('users')
            .select('id, name, avatar_url, bio, skills, rating, reviews_count, portfolio_urls, created_at')
            .or('role.eq.criador,skills.not.is.null')
            .order('rating', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Erro ao buscar programadores no Supabase:', error)
            return NextResponse.json(
                { error: 'Falha ao consultar banco de dados de programadores' },
                { status: 500 }
            )
        }

        // Filtra perfis válidos: apenas com nome preenchido
        const validProgrammers = (programmers || []).filter(
            (p) => p.name && typeof p.name === 'string' && p.name.trim().length > 0
        )

        return NextResponse.json(
            { programmers: validProgrammers },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120'
                }
            }
        )
    } catch (err: any) {
        console.error('Exceção ao listar programadores:', err)
        return NextResponse.json(
            { error: 'Erro interno ao listar programadores' },
            { status: 500 }
        )
    }
}
