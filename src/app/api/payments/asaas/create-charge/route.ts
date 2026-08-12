import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { createPixCharge } from '@/lib/asaas'

export async function POST(request: Request) {
    try {
        const { transactionId, cpfCnpj } = await request.json()

        if (!transactionId || !cpfCnpj) {
            return NextResponse.json({ error: 'ID da transação e CPF/CNPJ são obrigatórios' }, { status: 400 })
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

        // Generate Asaas PIX Charge
        const pixCharge = await createPixCharge({
            customerName: clientName,
            customerCpfCnpj: cpfCnpj,
            customerEmail: clientEmail,
            amount: totalAmount,
            description: `BordadoHub - Job: ${jobTitle}`,
            externalReference: transaction.id,
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
            .eq('id', transactionId)

        return NextResponse.json({
            success: true,
            paymentId: pixCharge.paymentId,
            pixQrCode: pixCharge.encodedImage,
            pixCopyPaste: pixCharge.payload,
            expirationDate: pixCharge.expirationDate,
            totalAmount,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Error creating Asaas charge:', error)
        return NextResponse.json({ error: error.message || 'Erro ao gerar PIX' }, { status: 500 })
    }
}
