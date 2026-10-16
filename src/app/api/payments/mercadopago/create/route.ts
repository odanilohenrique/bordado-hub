import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' });

export async function POST() {
    return NextResponse.json({ error: 'Endpoint de pagamento descontinuado.' }, { status: 410 })
}
