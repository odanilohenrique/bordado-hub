import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const token = authHeader.substring(7).trim()
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data: authData, error: authErr } = await supabase.auth.getUser(token)

    const authUserId = authData?.user?.id
    if (authErr || !authUserId || !UUID_REGEX.test(authUserId)) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })
    }

    const url = new URL(request.url)
    const requestedUserId = url.searchParams.get('userId')
    if (requestedUserId !== null && !UUID_REGEX.test(requestedUserId)) {
      return NextResponse.json({ error: 'userId inválido.' }, { status: 400 })
    }

    const { data: profileByAuth, error: profileErr } = await supabase
      .from('users')
      .select('id, supabase_user_id')
      .eq('supabase_user_id', authUserId)
      .maybeSingle()

    if (profileErr) {
      console.error('push/status profile lookup error:', profileErr)
      return NextResponse.json({ error: 'Erro ao verificar perfil.' }, { status: 500 })
    }

    let callerProfile = profileByAuth as { id: string; supabase_user_id?: string | null } | null

    if (!callerProfile) {
      const { data: profileById, error: fallbackErr } = await supabase
        .from('users')
        .select('id, supabase_user_id')
        .eq('id', authUserId)
        .maybeSingle()

      if (fallbackErr) {
        console.error('push/status fallback profile lookup error:', fallbackErr)
        return NextResponse.json({ error: 'Erro ao verificar perfil.' }, { status: 500 })
      }
      callerProfile = profileById as { id: string; supabase_user_id?: string | null } | null
    }

    if (requestedUserId !== null) {
      const isOwner =
        requestedUserId === authUserId ||
        (callerProfile !== null &&
          (requestedUserId === callerProfile.id ||
            requestedUserId === callerProfile.supabase_user_id))

      if (!isOwner) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
      }
    }

    const idsToCheck = Array.from(
      new Set([callerProfile?.id, authUserId].filter((id): id is string => Boolean(id)))
    )

    if (idsToCheck.length === 0) {
      return NextResponse.json(
        { hasSubscription: false },
        { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
      )
    }

    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('id')
      .in('user_id', idsToCheck)
      .limit(1)

    if (subErr) {
      console.error('push/status query error:', subErr)
      return NextResponse.json(
        { error: 'Erro ao consultar status de notificações.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { hasSubscription: Boolean(subs && subs.length > 0) },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('push/status unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno ao verificar notificações.' }, { status: 500 })
  }
}
