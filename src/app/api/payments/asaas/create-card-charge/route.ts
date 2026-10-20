import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { createCreditCardCharge } from '@/lib/asaas'
import { calculateTotals, calculateCardFee } from '@/lib/payments'

export async function POST(request: Request) {
    try {
        const {
            proposalId,
            transactionId,
            cpfCnpj,
            holderName,
            cardNumber,
            expiryMonth,
            expiryYear,
            ccv,
            installmentCount: installmentCount_raw,
            postalCode,
            addressNumber,
            phone,
        } = await request.json()

        if ((!transactionId && !proposalId) || !cpfCnpj || !cardNumber || !ccv) {
            return NextResponse.json({ error: 'Dados do cartão e identificador do pedido são obrigatórios' }, { status: 400 })
        }

        const supabase = createServiceClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let targetTx: any = null

        if (proposalId) {
            // 1. Fetch proposal and related job authoritative data from DB
            const { data: prop, error: propErr } = await supabase
                .from('proposals')
                .select('id, amount, criador_id, job_id, status, jobs(id, title, cliente_id, users:cliente_id(name, email))')
                .eq('id', proposalId)
                .single()

            if (propErr || !prop) {
                return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
            }

            const baseAmount = Number(prop.amount)
            if (isNaN(baseAmount) || baseAmount <= 0) {
                return NextResponse.json({ error: 'Valor da proposta inválido' }, { status: 400 })
            }

            const { taxaCliente, taxaCriador, totalPago, valorLiquido, amount } = calculateTotals(baseAmount)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const jobData: any = Array.isArray(prop.jobs) ? prop.jobs[0] : prop.jobs
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientUser: any = Array.isArray(jobData?.users) ? jobData?.users[0] : jobData?.users

            // 2. Check for existing pending transaction for this job
            const { data: existingTx } = await supabase
                .from('transactions')
                .select('*')
                .eq('job_id', prop.job_id)
                .eq('status', 'pendente')
                .maybeSingle()

            if (existingTx) {
                const { data: updatedTx } = await supabase
                    .from('transactions')
                    .update({
                        criador_id: prop.criador_id,
                        amount,
                        taxa_cliente: taxaCliente,
                        taxa_criador: taxaCriador,
                        total_pago: totalPago,
                        valor_liquido: valorLiquido,
                        metodo: 'asaas_cartao'
                    })
                    .eq('id', existingTx.id)
                    .select('*, jobs(title), cliente:cliente_id(name, email)')
                    .single()

                targetTx = updatedTx
            } else {
                const { data: createdTx, error: insErr } = await supabase
                    .from('transactions')
                    .insert([{
                        job_id: prop.job_id,
                        cliente_id: jobData.cliente_id,
                        criador_id: prop.criador_id,
                        amount,
                        taxa_cliente: taxaCliente,
                        taxa_criador: taxaCriador,
                        total_pago: totalPago,
                        valor_liquido: valorLiquido,
                        metodo: 'asaas_cartao',
                        status: 'pendente'
                    }])
                    .select('*, jobs(title), cliente:cliente_id(name, email)')
                    .single()

                if (insErr) throw insErr
                targetTx = createdTx
            }

            // Mark proposal as aceita
            await supabase.from('proposals').update({ status: 'aceita' }).eq('id', prop.id)

            if (!targetTx.cliente && clientUser) {
                targetTx.cliente = clientUser
            }
            if (!targetTx.jobs && jobData) {
                targetTx.jobs = jobData
            }
        } else {
            // Fallback via transactionId: enforce price integrity against proposals table
            const { data: transaction, error: txError } = await supabase
                .from('transactions')
                .select('*, jobs(title), cliente:cliente_id(name, email)')
                .eq('id', transactionId)
                .single()

            if (txError || !transaction) {
                return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
            }

            const { data: acceptedProp } = await supabase
                .from('proposals')
                .select('amount')
                .eq('job_id', transaction.job_id)
                .eq('criador_id', transaction.criador_id)
                .maybeSingle()

            if (acceptedProp && Number(acceptedProp.amount) > 0) {
                const { taxaCliente, taxaCriador, totalPago, valorLiquido, amount } = calculateTotals(Number(acceptedProp.amount))
                if (Number(transaction.amount) !== amount) {
                    console.warn(`Tamper detected on card tx ${transaction.id}: client amount ${transaction.amount} != proposal ${amount}. Resetting.`)
                    await supabase
                        .from('transactions')
                        .update({
                            amount,
                            taxa_cliente: taxaCliente,
                            taxa_criador: taxaCriador,
                            total_pago: totalPago,
                            valor_liquido: valorLiquido
                        })
                        .eq('id', transaction.id)

                    transaction.amount = amount
                    transaction.taxa_cliente = taxaCliente
                    transaction.total_pago = totalPago
                }
            }
            targetTx = transaction
        }

        const installmentCount = installmentCount_raw || 1
        const { totalComTaxa: cardTotal, taxaCartao: cardFee } = calculateCardFee(
            Number(targetTx.amount),
            installmentCount
        )
        const totalAmount = cardTotal
        const jobTitle = (Array.isArray(targetTx.jobs) ? targetTx.jobs[0]?.title : targetTx.jobs?.title) || 'Serviço de Matriz de Bordado'
        const clientName = (Array.isArray(targetTx.cliente) ? targetTx.cliente[0]?.name : targetTx.cliente?.name) || 'Cliente BordadoHub'
        const clientEmail = (Array.isArray(targetTx.cliente) ? targetTx.cliente[0]?.email : targetTx.cliente?.email) || 'cliente@bordadohub.com'

        // Process credit card payment via Asaas
        const cardResult = await createCreditCardCharge({
            customerName: clientName,
            customerCpfCnpj: cpfCnpj,
            customerEmail: clientEmail,
            amount: totalAmount,
            description: `BordadoHub - Job: ${jobTitle}`,
            externalReference: targetTx.id,
            holderName,
            cardNumber,
            expiryMonth,
            expiryYear,
            ccv,
            installmentCount: installmentCount || 1,
            postalCode,
            addressNumber: addressNumber || 'SN',
            phone,
        })

        // Determine status based on Asaas response
        const isPaid = cardResult.status === 'CONFIRMED' || cardResult.status === 'RECEIVED'

        // Update transaction in database
        await supabase
            .from('transactions')
            .update({
                total_pago: totalAmount,
                taxa_cliente: cardFee,
                asaas_payment_id: cardResult.paymentId,
                metodo: 'asaas_cartao',
                status: isPaid ? 'pago' : 'pendente',
            })
            .eq('id', targetTx.id)

        // If payment was immediately confirmed, update job status
        if (isPaid) {
            await supabase
                .from('jobs')
                .update({ status: 'em_progresso' })
                .eq('id', targetTx.job_id)

            // Notify creator
            await supabase.from('notifications').insert({
                user_id: targetTx.criador_id,
                type: 'pagamento_aprovado',
                title: 'Pagamento Confirmado!',
                message: `O pagamento via Cartão de Crédito do pedido "${jobTitle}" foi confirmado. Você pode iniciar o trabalho!`,
                link_url: `/jobs/${targetTx.job_id}`,
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
            transactionId: targetTx.id,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Error processing credit card:', error)
        return NextResponse.json({ error: error.message || 'Erro ao processar cartão' }, { status: 500 })
    }
}
