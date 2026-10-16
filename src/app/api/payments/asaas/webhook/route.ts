import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { checkPaymentStatus } from '@/lib/asaas'

export async function POST(request: Request) {
    try {
        // 1. Optional Webhook Secret Token validation
        const configuredToken = process.env.ASAAS_WEBHOOK_TOKEN
        if (configuredToken) {
            const incomingToken = request.headers.get('asaas-access-token')
            if (incomingToken !== configuredToken) {
                console.warn('⛔ Asaas Webhook: Unauthorized incoming token')
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        const body = await request.json()
        const { event, payment } = body

        console.log(' Asaas Webhook Received:', event, payment?.id)

        if (!payment || !payment.id) {
            return NextResponse.json({ received: true })
        }

        const supabase = createServiceClient()

        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            const externalReference = payment.externalReference
            const paymentId = payment.id

            // 2. Anti-fraud: Live check directly with Asaas server (defense-in-depth against fake payloads)
            let realPayment: any = null
            try {
                realPayment = await checkPaymentStatus(paymentId)
            } catch (verifErr: any) {
                console.error('⛔ Asaas Webhook: Failed to verify payment with Asaas API:', verifErr.message)
                return NextResponse.json({ received: true })
            }

            const isReallyPaid = realPayment && (
                realPayment.status === 'RECEIVED' ||
                realPayment.status === 'CONFIRMED' ||
                realPayment.status === 'RECEIVED_IN_CASH'
            )

            if (!isReallyPaid) {
                console.warn(`⛔ Asaas Webhook: Live check says payment ${paymentId} is ${realPayment?.status || 'UNKNOWN'}. Ignored.`)
                return NextResponse.json({ received: true })
            }

            // 2.1 Handle Marketplace Orders (externalReference format: mkt_orderId)
            if (externalReference && externalReference.startsWith('mkt_')) {
                const orderId = externalReference.replace('mkt_', '')
                const { data: order } = await supabase
                    .from('marketplace_orders')
                    .select('*, product:product_id(*)')
                    .eq('id', orderId)
                    .single()

                if (order && order.status === 'pending') {
                    if (realPayment.value >= (Number(order.amount) - 0.05)) {
                        const { data: updatedOrder } = await supabase
                            .from('marketplace_orders')
                            .update({ 
                                status: 'paid', 
                                asaas_payment_id: paymentId, 
                                updated_at: new Date().toISOString() 
                            })
                            .eq('id', orderId)
                            .eq('status', 'pending')
                            .select()
                            .single()

                        if (updatedOrder) {
                            if (order.product_id) {
                                const currentSales = Number(order.product?.sales_count || 0)
                                await supabase
                                    .from('marketplace_products')
                                    .update({ sales_count: currentSales + 1 })
                                    .eq('id', order.product_id)
                            }

                            await supabase.from('transactions').insert({
                                cliente_id: order.buyer_id,
                                criador_id: order.seller_id,
                                amount: order.amount,
                                taxa_cliente: 0,
                                valor_liquido: order.seller_net,
                                status: 'liberado',
                                metodo: 'asaas_pix',
                                asaas_payment_id: paymentId,
                            })

                            await supabase.from('notifications').insert({
                                user_id: order.seller_id,
                                type: 'marketplace_sale',
                                title: 'Venda Realizada no Marketplace!',
                                message: `Sua matriz "${order.product?.title || 'Matriz'}" foi vendida! R$ ${Number(order.seller_net).toFixed(2)} já estão disponíveis para saque no seu painel financeiro.`,
                                link_url: '/financeiro',
                                is_read: false,
                            })
                        }
                    } else {
                        console.warn(`⛔ Asaas Webhook: Underpayment on marketplace order ${orderId}: ${realPayment.value} < ${order.amount}`)
                    }
                }
                return NextResponse.json({ received: true })
            }

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

            // 3. Amount integrity verification (prevents paying R$ 1,00 for a R$ 100,00 job)
            const expectedTotal = Number(transaction.total_pago || (Number(transaction.amount) + Number(transaction.taxa_cliente || 0)))
            if (realPayment.value < (expectedTotal - 0.05)) {
                console.warn(`⛔ Asaas Webhook: Underpayment detected! Real: R$ ${realPayment.value}, Expected: R$ ${expectedTotal}`)
                return NextResponse.json({ received: true })
            }

            if (transaction.status === 'pendente') {
                // Mark transaction as paid
                await supabase
                    .from('transactions')
                    .update({ 
                        status: 'pago',
                        asaas_payment_id: paymentId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', transaction.id)

                // Update job status to em_progresso
                await supabase
                    .from('jobs')
                    .update({ status: 'em_progresso' })
                    .eq('id', transaction.job_id)

                // Create notification for creator
                await supabase.from('notifications').insert({
                    user_id: transaction.criador_id,
                    type: 'pagamento_aprovado',
                    title: 'Pagamento Confirmado!',
                    message: `O pagamento do pedido "${transaction.jobs?.title}" foi confirmado. O valor está seguro em caução (escrow). Você pode iniciar o trabalho!`,
                    link_url: `/jobs/${transaction.job_id}`,
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
