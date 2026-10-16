/*
=============================================================================
SUPABASE SQL MIGRATION - Tabela de Convites (invites)
Execute este comando no SQL Editor do Supabase antes de utilizar a API:
=============================================================================

CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    used_at TIMESTAMPTZ,
    used_by TEXT,
    max_uses INTEGER NOT NULL DEFAULT 1,
    current_uses INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Índices recomendados para busca rápida por código e status
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites (code);
CREATE INDEX IF NOT EXISTS idx_invites_active ON public.invites (active);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
=============================================================================
*/

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

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
    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret) {
        console.error('CRITICAL: ADMIN_SECRET environment variable is not defined.')
        return false
    }

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
        if (!process.env.ADMIN_SECRET) {
            return NextResponse.json(
                { error: 'Configuração de servidor incompleta: ADMIN_SECRET ausente.' },
                { status: 500 }
            )
        }

        if (!isAuthorizedAdmin(request)) {
            return NextResponse.json(
                { error: 'Não autorizado: Token de administrador inválido ou ausente.' },
                { status: 401 }
            )
        }

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
            return NextResponse.json(
                { error: 'Configuração do Supabase ausente no servidor.' },
                { status: 500 }
            )
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        let body: any = {}
        try {
            body = await request.json()
        } catch {
            // Body is optional
            body = {}
        }

        const maxUses = Number.isInteger(body?.max_uses) && body.max_uses > 0 ? body.max_uses : 1
        const customCode = typeof body?.code === 'string' && body.code.trim().length > 0
            ? body.code.trim().toUpperCase()
            : null

        let finalCode = customCode || generateInviteCode(8)

        // If auto-generated, ensure collision avoidance
        if (!customCode) {
            let attempts = 0
            while (attempts < 5) {
                const { data: existing } = await supabase
                    .from('invites')
                    .select('id')
                    .eq('code', finalCode)
                    .maybeSingle()

                if (!existing) break
                finalCode = generateInviteCode(8)
                attempts++
            }
        }

        const { data, error } = await supabase
            .from('invites')
            .insert([
                {
                    code: finalCode,
                    max_uses: maxUses,
                    current_uses: 0,
                    active: true
                }
            ])
            .select()
            .single()

        if (error) {
            console.error('Error inserting invite code:', error)
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'Este código de convite já existe. Escolha outro código.' },
                    { status: 409 }
                )
            }
            if (error.code === 'PGRST205') {
                return NextResponse.json(
                    { error: 'Tabela public.invites não existe no banco de dados. Execute o script SQL de migração.' },
                    { status: 500 }
                )
            }
            return NextResponse.json(
                { error: `Erro ao salvar convite: ${error.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json(
            {
                success: true,
                invite: data
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
        if (!process.env.ADMIN_SECRET) {
            return NextResponse.json(
                { error: 'Configuração de servidor incompleta: ADMIN_SECRET ausente.' },
                { status: 500 }
            )
        }

        if (!isAuthorizedAdmin(request)) {
            return NextResponse.json(
                { error: 'Não autorizado: Token de administrador inválido ou ausente.' },
                { status: 401 }
            )
        }

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
            return NextResponse.json(
                { error: 'Configuração do Supabase ausente no servidor.' },
                { status: 500 }
            )
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const { data, error } = await supabase
            .from('invites')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching invites:', error)
            if (error.code === 'PGRST205') {
                return NextResponse.json(
                    { error: 'Tabela public.invites não existe no banco de dados. Execute o script SQL de migração.' },
                    { status: 500 }
                )
            }
            return NextResponse.json(
                { error: `Erro ao consultar convites: ${error.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json(
            {
                success: true,
                invites: data || []
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
