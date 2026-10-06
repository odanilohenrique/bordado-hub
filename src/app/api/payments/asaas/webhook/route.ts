import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { event, payment } = body

        console.log(' Asaas Webhook Received:', event, payment?.id)

        if (!payment) {
            return NextResponse.json({ received: true })
        }

        const supabase = createServiceClient()

        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            const externalReference = payment.externalReference
            const paymentId = payment.id

            // Find transaction by externalReference (transaction.id) or asaas_payment_id
            let query = supabase.from('transactions').select('*, jobs(*)')

            if (externalReference) {
                query = query.eq('id', externalReference)
            } else if (paymentId) {
                query = query.eq('asaas_payment_id', paymentId)
            } else {
                return NextResponse.json({ received: true })
            }

            const { data: transaction, error } = await query.single()

            if (error || !transaction) {
                console.warn('Webhook: Transaction not found for payment', paymentId)
                return NextResponse.json({ received: true })
            }

            if (transaction.status === 'pendente') {
                // Mark transaction as paid
                await supabase
                    .from('transactions')
                    .update({ status: 'pago' })
                    .eq('id', transaction.id)

                // Update job status to em_progresso
                await supabase
                    .from('jobs')
                    .update({ status: 'em_progresso' })
                    .eq('id', transaction.job_id)

                // Create notification for creator
                await supabase.from('notifications').insert({
                    user_id: transaction.criador_id,
                    title: 'Pagamento Confirmado!',
                    message: `O pagamento do pedido "${transaction.jobs?.title}" foi confirmado. Você pode iniciar o trabalho!`,
                    link_url: `/producao`,
                })
            }
        }

        return NextResponse.json({ received: true })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Asaas Webhook Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
