import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { MercadoPagoConfig, Payment } from 'mercadopago'

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' });

export async function POST(request: Request) {
    try {
        const url = new URL(request.url)
        const topic = url.searchParams.get('topic') || url.searchParams.get('type')
        const id = url.searchParams.get('id') || url.searchParams.get('data.id')

        if (topic === 'payment' && id) {
            const payment = new Payment(client)
            const paymentData = await payment.get({ id })

            if (paymentData.status === 'approved') {
                const transactionId = paymentData.external_reference
                const supabase = createServiceClient()

                // Update transaction status
                await supabase
                    .from('transactions')
                    .update({ status: 'pago', metodo: 'mercadopago' })
                    .eq('id', transactionId)

                // Also update job status? Or keep it 'em_progresso' until delivery?
                // Job status is already 'em_progresso'.
                // We might want to notify user?
            }
        }

        return NextResponse.json({ status: 'ok' })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ status: 'error' }, { status: 500 })
    }
}
