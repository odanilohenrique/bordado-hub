import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { checkPaymentStatus } from '@/lib/asaas'

export async function POST(request: Request) {
    try {
        const { orderId } = await request.json()

        if (!orderId) {
            return NextResponse.json({ error: 'ID do pedido obrigatório.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Fetch Order with product
        const { data: order, error: orderErr } = await supabase
            .from('marketplace_orders')
            .select('*, product:product_id(*)')
            .eq('id', orderId)
            .single()

        if (orderErr || !order) {
            return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
        }

        // If already marked as paid
        if (order.status === 'paid') {
            return NextResponse.json({
                status: 'paid',
                downloadUrl: order.product?.file_url || null,
            })
        }

        // 2. Check status with Asaas if paymentId exists
        let isPaid = false
        if (order.asaas_payment_id) {
            const asaasStatus = await checkPaymentStatus(order.asaas_payment_id)
            if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasStatus.status)) {
                isPaid = true
            }
        }

        if (isPaid) {
            // Update order to paid
            await supabase
                .from('marketplace_orders')
                .update({ status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', orderId)

            // Increment sales count on product
            if (order.product_id) {
                const currentSales = Number(order.product?.sales_count || 0)
                await supabase
                    .from('marketplace_products')
                    .update({ sales_count: currentSales + 1 })
                    .eq('id', order.product_id)
            }

            // Register in transactions table as 'liberado' for the seller's wallet
            await supabase
                .from('transactions')
                .insert({
                    cliente_id: order.buyer_id,
                    criador_id: order.seller_id,
                    amount: order.amount,
                    taxa_cliente: 0,
                    valor_liquido: order.seller_net,
                    status: 'liberado', // Instantly available to withdraw!
                    metodo: 'asaas_pix',
                    asaas_payment_id: order.asaas_payment_id,
                })

            // Send in-app notification to seller
            await supabase
                .from('notifications')
                .insert({
                    user_id: order.seller_id,
                    type: 'marketplace_sale',
                    title: 'Venda Realizada no Marketplace!',
                    message: `Sua matriz "${order.product?.title || 'Matriz'}" foi vendida! R$ ${Number(order.seller_net).toFixed(2)} já estão disponíveis para saque no seu painel financeiro.`,
                    link_url: '/financeiro',
                    is_read: false,
                })

            return NextResponse.json({
                status: 'paid',
                downloadUrl: order.product?.file_url || null,
            })
        }

        return NextResponse.json({
            status: 'pending',
            downloadUrl: null,
        })

    } catch (err: any) {
        console.error('Erro ao checar status do pedido marketplace:', err)
        return NextResponse.json(
            { error: err.message || 'Erro ao checar status.' },
            { status: 500 }
        )
    }
}
