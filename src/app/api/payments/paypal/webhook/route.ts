import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST() {
    return NextResponse.json({ error: 'Endpoint de pagamento descontinuado.' }, { status: 410 })
}
