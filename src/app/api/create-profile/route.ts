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
        const { userId, name, email, role, avatar_url } = body

        if (!userId || !email) {
            return NextResponse.json({ error: 'Dados incompletos: userId ou email faltando.' }, { status: 400 })
        }

        const validRole = role === 'criador' ? 'criador' : 'cliente'
        const isProgrammer = role === 'criador' || body.is_programmer === true

        // Creators/Programmers require a valid invite code
        if (isProgrammer) {
            const rawInviteCode = body.invite_code
            if (!rawInviteCode || typeof rawInviteCode !== 'string' || !rawInviteCode.trim()) {
                return NextResponse.json({ error: 'Código de convite inválido ou expirado.' }, { status: 403 })
            }

            const normalizedCode = rawInviteCode.trim().toUpperCase()

            const { data: invite, error: inviteErr } = await supabase
                .from('invites')
                .select('*')
                .eq('code', normalizedCode)
                .maybeSingle()

            if (inviteErr) {
                console.error('Error querying invite in create-profile:', inviteErr)
                if (inviteErr.code === 'PGRST205') {
                    return NextResponse.json({ error: 'Tabela de convites não configurada no banco de dados.' }, { status: 500 })
                }
                return NextResponse.json({ error: 'Código de convite inválido ou expirado.' }, { status: 403 })
            }

            if (!invite) {
                return NextResponse.json({ error: 'Código de convite inválido ou expirado.' }, { status: 403 })
            }

            const maxUses = invite.max_uses ?? 1
            const currentUses = invite.current_uses ?? 0
            const isActive = Boolean(invite.active)

            if (!isActive || currentUses >= maxUses) {
                return NextResponse.json({ error: 'Código de convite inválido ou expirado.' }, { status: 403 })
            }

            // Increment current_uses and record usage details
            const newUses = currentUses + 1
            const isNowExhausted = newUses >= maxUses

            const { error: updateInviteErr } = await supabase
                .from('invites')
                .update({
                    current_uses: newUses,
                    used_by: email,
                    used_at: new Date().toISOString(),
                    active: !isNowExhausted
                })
                .eq('id', invite.id)

            if (updateInviteErr) {
                console.error('Error updating invite in create-profile:', updateInviteErr)
                return NextResponse.json({ error: 'Erro ao validar código de convite.' }, { status: 500 })
            }
        }

        const { data, error } = await supabase
            .from('users')
            .upsert([
                {
                    supabase_user_id: userId,
                    name: name || email.split('@')[0],
                    email,
                    role: validRole,
                    is_client: true,
                    is_programmer: isProgrammer,
                    ...(avatar_url ? { avatar_url } : {})
                },
            ], { onConflict: 'supabase_user_id' })
            .select()
            .single()

        if (error) {
            console.error('Error creating profile:', error)
            return NextResponse.json({ error: `Erro no banco de dados: ${error.message}` }, { status: 500 })
        }

        return NextResponse.json({ data }, { status: 200 })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Server error:', error)
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 })
    }
}
