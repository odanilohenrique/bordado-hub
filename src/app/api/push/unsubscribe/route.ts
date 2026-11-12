import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint é obrigatório.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      console.error('push/unsubscribe error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('push/unsubscribe unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
