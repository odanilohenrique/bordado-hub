import { NextResponse } from 'next/server'
import { checkInviteValidity } from '@/lib/invitesStore'

/**
 * POST /api/invites/validate
 * Validates whether an invite code is active and has remaining uses.
 * Request body: { code: string }
 * Response: { valid: boolean, message?: string }
 */
export async function POST(request: Request) {
    try {
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

        const result = await checkInviteValidity(rawCode)
        return NextResponse.json(result, { status: 200 })
    } catch (err: any) {
        console.error('Server error in POST /api/invites/validate:', err)
        return NextResponse.json(
            { valid: false, message: `Erro interno no servidor: ${err.message}` },
            { status: 500 }
        )
    }
}
