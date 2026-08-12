import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { createCreditCardCharge } from '@/lib/asaas'

export async function POST(request: Request) {
    try {
        const {
            transactionId,
            cpfCnpj,
            holderName,
            cardNumber,
            expiryMonth,
            expiryYear,
            ccv,
            installmentCount,
            postalCode,
            phone,
        } = await request.json()

        if (!transactionId || !cpfCnpj || !cardNumber || !ccv) {
            return NextResponse.json({ error: 'Dados do cartão são obrigatórios' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Fetch transaction with job and client details
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*, jobs(title), cliente:cliente_id(name, email)')
            .eq('id', transactionId)
            .single()

        if (error || !transaction) {
            return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
        }

        const totalAmount = Number(transaction.amount) + Number(transaction.taxa_cliente)
        const jobTitle = transaction.jobs?.title || 'Serviço de Matriz de Bordado'
        const clientName = transaction.cliente?.name || 'Cliente BordadoHub'
        const clientEmail = transaction.cliente?.email || 'cliente@bordadohub.com'

        // Process credit card payment via Asaas
        const cardResult = await createCreditCardCharge({
            customerName: clientName,
            customerCpfCnpj: cpfCnpj,
            customerEmail: clientEmail,
            amount: totalAmount,
            description: `BordadoHub - Job: ${jobTitle}`,
            externalReference: transaction.id,
            holderName,
            cardNumber,
            expiryMonth,
            expiryYear,
            ccv,
            installmentCount: installmentCount || 1,
            postalCode,
            phone,
        })

        // Determine status based on Asaas response
        const isPaid = cardResult.status === 'CONFIRMED' || cardResult.status === 'RECEIVED'

        // Update transaction in database
        await supabase
            .from('transactions')
            .update({
                asaas_payment_id: cardResult.paymentId,
                metodo: 'asaas_cartao',
                status: isPaid ? 'pago' : 'pendente',
            })
            .eq('id', transactionId)

        // If payment was immediately confirmed, update job status
        if (isPaid) {
            await supabase
                .from('jobs')
                .update({ status: 'em_progresso' })
                .eq('id', transaction.job_id)

            // Notify creator
            await supabase.from('notifications').insert({
                user_id: transaction.criador_id,
                title: '🎉 Pagamento Confirmado!',
                message: `O pagamento via Cartão de Crédito do pedido "${jobTitle}" foi confirmado. Você pode iniciar o trabalho!`,
                link_url: `/producao`,
            })
        }

        return NextResponse.json({
            success: true,
            paymentId: cardResult.paymentId,
            status: cardResult.status,
            isPaid,
            installmentCount: cardResult.installmentCount,
            installmentValue: cardResult.installmentValue,
            totalAmount,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Error processing credit card:', error)
        return NextResponse.json({ error: error.message || 'Erro ao processar cartão' }, { status: 500 })
    }
}
