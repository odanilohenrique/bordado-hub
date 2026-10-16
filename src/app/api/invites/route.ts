import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getInvitesList, insertInvite, InviteRecord } from '@/lib/invitesStore'

// Non-ambiguous character set (excludes 0, O, 1, I, L)
const INVITE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/**
 * Generates an 8-character invite code using unambiguous uppercase letters and digits.
 */
export function generateInviteCode(length = 8): string {
    let result = ''
    for (let i = 0; i < length; i++) {
        const randIndex = crypto.randomInt(0, INVITE_CHARS.length)
        result += INVITE_CHARS[randIndex]
    }
    return result
}

/**
 * Validates the admin secret from the Authorization header.
 */
function isAuthorizedAdmin(request: Request): boolean {
    const adminSecret = process.env.ADMIN_SECRET || 'bordadohub_admin_secret_2026'

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false
    }

    const token = authHeader.substring(7).trim()
    return token === adminSecret.trim()
}

/**
 * POST /api/invites
 * Creates a new invite code. Protected by ADMIN_SECRET.
 * Optional JSON body: { max_uses?: number, code?: string }
 */
export async function POST(request: Request) {
    try {
        if (!isAuthorizedAdmin(request)) {
            return NextResponse.json(
                { error: 'Não autorizado: Token de administrador inválido ou ausente.' },
                { status: 401 }
            )
        }

        let body: any = {}
        try {
            body = await request.json()
        } catch {
            body = {}
        }

        const maxUses = Number.isInteger(body?.max_uses) && body.max_uses > 0 ? body.max_uses : 1
        const customCode = typeof body?.code === 'string' && body.code.trim().length > 0
            ? body.code.trim().toUpperCase()
            : null

        const currentInvites = await getInvitesList()
        let finalCode = customCode || generateInviteCode(8)

        if (customCode && currentInvites.some(i => i.code === finalCode)) {
            return NextResponse.json(
                { error: 'Este código de convite já existe. Escolha outro código.' },
                { status: 409 }
            )
        }

        if (!customCode) {
            let attempts = 0
            while (attempts < 5 && currentInvites.some(i => i.code === finalCode)) {
                finalCode = generateInviteCode(8)
                attempts++
            }
        }

        const newInvite: InviteRecord = {
            id: crypto.randomUUID(),
            code: finalCode,
            created_at: new Date().toISOString(),
            used_at: null,
            used_by: null,
            max_uses: maxUses,
            current_uses: 0,
            active: true
        }

        const saved = await insertInvite(newInvite)

        return NextResponse.json(
            {
                success: true,
                invite: saved
            },
            { status: 201 }
        )
    } catch (err: any) {
        console.error('Server error in POST /api/invites:', err)
        return NextResponse.json(
            { error: `Erro interno no servidor: ${err.message}` },
            { status: 500 }
        )
    }
}

/**
 * GET /api/invites
 * Lists all invite codes and their usage status. Protected by ADMIN_SECRET.
 */
export async function GET(request: Request) {
    try {
        if (!isAuthorizedAdmin(request)) {
            return NextResponse.json(
                { error: 'Não autorizado: Token de administrador inválido ou ausente.' },
                { status: 401 }
            )
        }

        const invites = await getInvitesList()

        return NextResponse.json(
            {
                success: true,
                invites: invites || []
            },
            { status: 200 }
        )
    } catch (err: any) {
        console.error('Server error in GET /api/invites:', err)
        return NextResponse.json(
            { error: `Erro interno no servidor: ${err.message}` },
            { status: 500 }
        )
    }
}
