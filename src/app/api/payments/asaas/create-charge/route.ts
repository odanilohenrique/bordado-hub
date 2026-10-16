import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { createPixCharge } from '@/lib/asaas'
import { calculateTotals } from '@/lib/payments'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { proposalId, transactionId, cpfCnpj } = body

        if (!cpfCnpj) {
            return NextResponse.json({ error: 'CPF ou CNPJ é obrigatório' }, { status: 400 })
        }

        if (!proposalId && !transactionId) {
            return NextResponse.json({ error: 'Identificador da proposta ou transação é obrigatório' }, { status: 400 })
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
                        metodo: 'asaas_pix'
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
                        metodo: 'asaas_pix',
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
            const { data: transaction, error } = await supabase
                .from('transactions')
                .select('*, jobs(title), cliente:cliente_id(name, email)')
                .eq('id', transactionId)
                .single()

            if (error || !transaction) {
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
                    console.warn(`Tamper detected on tx ${transaction.id}: client amount ${transaction.amount} != proposal ${amount}. Resetting.`)
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

        const totalAmount = Number(targetTx.total_pago || (Number(targetTx.amount) + Number(targetTx.taxa_cliente || 0)))
        const jobTitle = (Array.isArray(targetTx.jobs) ? targetTx.jobs[0]?.title : targetTx.jobs?.title) || 'Serviço de Matriz de Bordado'
        const clientName = (Array.isArray(targetTx.cliente) ? targetTx.cliente[0]?.name : targetTx.cliente?.name) || 'Cliente BordadoHub'
        const clientEmail = (Array.isArray(targetTx.cliente) ? targetTx.cliente[0]?.email : targetTx.cliente?.email) || 'cliente@bordadohub.com'

        // Generate Asaas PIX Charge
        const pixCharge = await createPixCharge({
            customerName: clientName,
            customerCpfCnpj: cpfCnpj,
            customerEmail: clientEmail,
            amount: totalAmount,
            description: `BordadoHub - Job: ${jobTitle}`,
            externalReference: targetTx.id,
        })

        // Store Asaas payment info in database
        await supabase
            .from('transactions')
            .update({
                asaas_payment_id: pixCharge.paymentId,
                pix_qr_code: pixCharge.encodedImage,
                pix_copy_paste: pixCharge.payload,
                pix_expiration: pixCharge.expirationDate,
                metodo: 'asaas_pix',
                status: 'pendente',
            })
            .eq('id', targetTx.id)

        return NextResponse.json({
            success: true,
            paymentId: pixCharge.paymentId,
            pixQrCode: pixCharge.encodedImage,
            pixCopyPaste: pixCharge.payload,
            expirationDate: pixCharge.expirationDate,
            totalAmount,
            transactionId: targetTx.id,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Error creating Asaas charge:', error)
        return NextResponse.json({ error: error.message || 'Erro ao gerar PIX' }, { status: 500 })
    }
}
