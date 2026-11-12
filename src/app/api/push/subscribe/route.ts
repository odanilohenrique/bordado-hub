import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint, p256dh, auth, userId, role } = body

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Dados de subscrição inválidos.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint,
        p256dh,
        auth,
        user_id: userId || null,
        role: role || 'cliente',
        user_agent: req.headers.get('user-agent') || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

    if (error) {
      console.error('push/subscribe error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('push/subscribe unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
