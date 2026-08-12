import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { transferPixToCreator } from '@/lib/asaas'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const supabase = createServiceClient()

        // Fetch transaction details with creator profile
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .select('*, jobs(title), criador:criador_id(name, pix_key, pix_key_type)')
            .eq('job_id', id)
            .single()

        if (txError || !transaction) {
            return NextResponse.json({ error: 'Transação não encontrada para este pedido' }, { status: 404 })
        }

        // Update job status to finalized
        await supabase
            .from('jobs')
            .update({ status: 'finalizado' })
            .eq('id', id)

        // Update transaction status to 'liberado'
        await supabase
            .from('transactions')
            .update({ status: 'liberado' })
            .eq('job_id', id)

        // Automatic PIX Payout to Creator via Asaas
        let transferInfo = null
        const criador = transaction.criador

        if (criador?.pix_key && criador?.pix_key_type) {
            try {
                const payoutResult = await transferPixToCreator({
                    pixKey: criador.pix_key,
                    pixKeyType: criador.pix_key_type,
                    amount: Number(transaction.valor_liquido),
                    description: `BordadoHub - Pagamento pedido: ${transaction.jobs?.title}`,
                })

                transferInfo = payoutResult

                // Save transfer ID
                await supabase
                    .from('transactions')
                    .update({ asaas_transfer_id: payoutResult.transferId })
                    .eq('id', transaction.id)

                console.log('✅ PIX Payout executed successfully to creator:', criador.name, payoutResult.transferId)
            } catch (payoutErr: any) {
                console.error('⚠️ PIX Payout failed (will require manual retry or key check):', payoutErr.message)
            }
        } else {
            console.warn('⚠️ Creator has no PIX Key configured in profile. Payment marked as released in DB.')
        }

        // Notify Creator
        await supabase.from('notifications').insert({
            user_id: transaction.criador_id,
            title: '💰 Pagamento Liberado!',
            message: `O cliente aprovou o trabalho "${transaction.jobs?.title}". R$ ${Number(transaction.valor_liquido).toFixed(2)} foram enviados para seu PIX!`,
            link_url: `/producao`,
        })

        return NextResponse.json({
            success: true,
            message: 'Trabalho aprovado e pagamento liberado para o PIX do criador!',
            transferInfo,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

