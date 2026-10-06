import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { checkPaymentStatus } from '@/lib/asaas'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const paymentId = searchParams.get('paymentId')
        const transactionId = searchParams.get('transactionId')

        if (!paymentId && !transactionId) {
            return NextResponse.json({ error: 'ID do pagamento ou transação é obrigatório' }, { status: 400 })
        }

        const supabase = createServiceClient()

        let asaasId = paymentId

        if (!asaasId && transactionId) {
            const { data: tx } = await supabase
                .from('transactions')
                .select('asaas_payment_id, status')
                .eq('id', transactionId)
                .single()

            if (tx?.asaas_payment_id) {
                asaasId = tx.asaas_payment_id
            }

            if (tx?.status === 'pago' || tx?.status === 'liberado') {
                return NextResponse.json({ status: 'PAYMENT_RECEIVED', isPaid: true })
            }
        }

        if (!asaasId) {
            return NextResponse.json({ status: 'PENDING', isPaid: false })
        }

        const asaasStatus = await checkPaymentStatus(asaasId)
        const isPaid = asaasStatus.status === 'RECEIVED' || asaasStatus.status === 'CONFIRMED' || asaasStatus.status === 'RECEIVED_IN_CASH'

        if (isPaid && transactionId) {
            // Update transaction to paid if not already
            const { data: tx } = await supabase
                .from('transactions')
                .select('job_id, status, criador_id, jobs(title)')
                .eq('id', transactionId)
                .single()

            if (tx && tx.status === 'pendente') {
                await supabase.from('transactions').update({ status: 'pago' }).eq('id', transactionId)
                await supabase.from('jobs').update({ status: 'em_progresso' }).eq('id', tx.job_id)
                
                // Notifica o programador que o pagamento caiu
                if (tx.criador_id) {
                    const jobTitle = (Array.isArray((tx as any)?.jobs) ? (tx as any)?.jobs[0]?.title : (tx as any)?.jobs?.title) || 'Bordado'
                    await supabase.from('notifications').insert({
                        user_id: tx.criador_id,
                        type: 'pagamento_aprovado',
                        title: 'Pagamento Aprovado!',
                        message: `O pagamento do pedido "${jobTitle}" foi confirmado. O dinheiro já está retido em segurança. Você já pode iniciar a produção e enviar a matriz!`,
                        link_url: `/jobs/${tx.job_id}`
                    })
                }
            }
        }

        return NextResponse.json({
            status: asaasStatus.status,
            isPaid,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Error checking payment status:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
