import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' });

export async function POST(request: Request) {
    try {
        const { transactionId } = await request.json()
        const supabase = createServiceClient()

        // Fetch transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*, jobs(title)')
            .eq('id', transactionId)
            .single()

        if (error || !transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        const totalAmount = Number(transaction.amount) + Number(transaction.taxa_cliente)

        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: [
                    {
                        id: transaction.job_id,
                        title: `Job: ${transaction.jobs?.title}`,
                        quantity: 1,
                        unit_price: totalAmount,
                        currency_id: 'BRL',
                    },
                ],
                external_reference: transaction.id,
                back_urls: {
                    success: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/client`,
                    failure: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout/${transaction.id}`,
                    pending: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout/${transaction.id}`,
                },
                auto_return: 'approved',
                notification_url: `${process.env.NEXTAUTH_URL || 'https://your-domain.vercel.app'}/api/payments/mercadopago/webhook`,
            }
        })

        return NextResponse.json({ url: result.init_point })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
