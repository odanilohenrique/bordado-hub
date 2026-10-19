import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getWaitlist, insertWaitlistRecord, WaitlistRecord } from '@/lib/waitlistStore'

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
 * POST /api/waitlist
 * Coleta novos candidatos à lista de espera de programadores.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, whatsapp, softwares } = body

        if (!name || !email || !whatsapp) {
            return NextResponse.json(
                { error: 'Por favor, preencha seu nome, e-mail e WhatsApp.' },
                { status: 400 }
            )
        }

        // Validação simples de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Formato de e-mail inválido.' },
                { status: 400 }
            )
        }

        const newRecord: WaitlistRecord = {
            id: crypto.randomUUID(),
            name: String(name).trim(),
            email: String(email).trim().toLowerCase(),
            whatsapp: String(whatsapp).trim(),
            softwares: softwares ? String(softwares).trim() : null,
            created_at: new Date().toISOString(),
            status: 'pendente'
        }

        const saved = await insertWaitlistRecord(newRecord)

        return NextResponse.json(
            {
                success: true,
                message: 'Inscrição na lista de espera realizada com sucesso!',
                data: saved
            },
            { status: 201 }
        )
    } catch (err: any) {
        console.error('Erro ao processar waitlist:', err)
        return NextResponse.json(
            { error: `Erro interno no servidor: ${err.message}` },
            { status: 500 }
        )
    }
}

/**
 * GET /api/waitlist
 * Retorna lista de espera (restrito ao administrador).
 */
export async function GET(request: Request) {
    try {
        if (!isAuthorizedAdmin(request)) {
            return NextResponse.json(
                { error: 'Não autorizado: Token de administrador inválido ou ausente.' },
                { status: 401 }
            )
        }

        const list = await getWaitlist()

        return NextResponse.json(
            {
                success: true,
                waitlist: list
            },
            { status: 200 }
        )
    } catch (err: any) {
        console.error('Erro ao consultar waitlist:', err)
        return NextResponse.json(
            { error: `Erro interno no servidor: ${err.message}` },
            { status: 500 }
        )
    }
}
