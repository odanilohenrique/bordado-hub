import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const body = await request.json()

        // PayPal webhook signature verification would go here
        // For MVP, simplified handling

        if (body.event_type === 'CHECKOUT.ORDER.APPROVED') {
            const orderId = body.resource?.id
            const transactionId = body.resource?.purchase_units?.[0]?.custom_id

            if (transactionId) {
                const supabase = createServiceClient()

                await supabase
                    .from('transactions')
                    .update({ status: 'pago', metodo: 'paypal' })
                    .eq('id', transactionId)
            }
        }

        return NextResponse.json({ status: 'ok' })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ status: 'error' }, { status: 500 })
    }
}
