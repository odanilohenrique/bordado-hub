import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * POST /api/invites/validate
 * Validates whether an invite code is active and has remaining uses.
 * Request body: { code: string }
 * Response: { valid: boolean, message?: string }
 */
export async function POST(request: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
            return NextResponse.json(
                { valid: false, message: 'Configuração do Supabase ausente no servidor.' },
                { status: 500 }
            )
        }

        let body: any = {}
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { valid: false, message: 'Formato de requisição inválido.' },
                { status: 400 }
            )
        }

        const rawCode = body?.code
        if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
            return NextResponse.json(
                { valid: false, message: 'Código de convite não informado.' },
                { status: 400 }
            )
        }

        const normalizedCode = rawCode.trim().toUpperCase()

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const { data: invite, error } = await supabase
            .from('invites')
            .select('id, code, active, current_uses, max_uses')
            .eq('code', normalizedCode)
            .maybeSingle()

        if (error) {
            console.error('Error querying invite for validation:', error)
            if (error.code === 'PGRST205') {
                return NextResponse.json(
                    { valid: false, message: 'Tabela de convites não configurada no banco de dados.' },
                    { status: 500 }
                )
            }
            return NextResponse.json(
                { valid: false, message: 'Erro ao consultar código de convite.' },
                { status: 500 }
            )
        }

        if (!invite) {
            return NextResponse.json(
                { valid: false, message: 'Código de convite não encontrado.' },
                { status: 200 }
            )
        }

        const maxUses = invite.max_uses ?? 1
        const currentUses = invite.current_uses ?? 0
        const isActive = Boolean(invite.active)

        if (!isActive || currentUses >= maxUses) {
            return NextResponse.json(
                { valid: false, message: 'Código de convite expirado ou já utilizado.' },
                { status: 200 }
            )
        }

        return NextResponse.json(
            {
                valid: true,
                message: 'Código de convite válido!'
            },
            { status: 200 }
        )
    } catch (err: any) {
        console.error('Server error in POST /api/invites/validate:', err)
        return NextResponse.json(
            { valid: false, message: `Erro interno no servidor: ${err.message}` },
            { status: 500 }
        )
    }
}
