import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

// PayPal SDK would be imported here
// For now, this is a simplified example

export async function POST() {
    return NextResponse.json({ error: 'Endpoint de pagamento descontinuado.' }, { status: 410 })
}
