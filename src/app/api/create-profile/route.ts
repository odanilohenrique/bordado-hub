import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase with Service Role Key to bypass RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing')
            return NextResponse.json({ error: 'Configuração de servidor incompleta: SUPABASE_SERVICE_ROLE_KEY ausente.' }, { status: 500 })
        }

        const body = await request.json()
        const { userId, name, email, role } = body

        if (!userId || !email) {
            return NextResponse.json({ error: 'Dados incompletos: userId ou email faltando.' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('users')
            .upsert([
                {
                    supabase_user_id: userId,
                    name,
                    email,
                    role: role || 'cliente'
                },
            ], { onConflict: 'supabase_user_id' })
            .select()

        if (error) {
            console.error('Error creating profile:', error)
            // Handle duplicate key error gracefully if needed, but for now show raw error
            return NextResponse.json({ error: `Erro no banco de dados: ${error.message}` }, { status: 500 })
        }

        return NextResponse.json({ data }, { status: 200 })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Server error:', error)
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 })
    }
}
