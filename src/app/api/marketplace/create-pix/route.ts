import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { createPixCharge } from '@/lib/asaas'

export async function POST(request: Request) {
    try {
        const { productId, buyerId, cpfCnpj } = await request.json()

        if (!productId || !buyerId || !cpfCnpj) {
            return NextResponse.json(
                { error: 'ID do produto, ID do comprador e CPF/CNPJ são obrigatórios.' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // 1. Fetch Product and Seller details
        const { data: product, error: prodErr } = await supabase
            .from('marketplace_products')
            .select('*, seller:seller_id(id, name, email)')
            .eq('id', productId)
            .single()

        if (prodErr || !product) {
            return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
        }

        // 2. Fetch Buyer details
        const { data: buyer, error: buyerErr } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', buyerId)
            .single()

        if (buyerErr || !buyer) {
            return NextResponse.json({ error: 'Comprador não encontrado.' }, { status: 404 })
        }

        // Prevent buying own product
        if (product.seller_id === buyer.id) {
            return NextResponse.json({ error: 'Você não pode comprar sua própria matriz.' }, { status: 400 })
        }

        const amount = Number(product.price)
        const platformFee = Number((amount * 0.15).toFixed(2)) // 15%
        const sellerNet = Number((amount - platformFee).toFixed(2)) // 85%

        // 3. Create or reuse pending order
        const { data: order, error: orderErr } = await supabase
            .from('marketplace_orders')
            .insert({
                product_id: product.id,
                buyer_id: buyer.id,
                seller_id: product.seller_id,
                amount: amount,
                platform_fee: platformFee,
                seller_net: sellerNet,
                status: 'pending',
                payment_method: 'asaas_pix',
            })
            .select('id')
            .single()

        if (orderErr || !order) {
            return NextResponse.json({ error: 'Erro ao gerar pedido.' }, { status: 500 })
        }

        // 4. Generate Asaas Pix Charge
        const cleanCpf = cpfCnpj.replace(/\D/g, '')
        const pixCharge = await createPixCharge({
            customerName: buyer.name || 'Cliente BordadoHub',
            customerCpfCnpj: cleanCpf,
            customerEmail: buyer.email || 'contato@bordadohub.com',
            amount: amount,
            description: `BordadoHub Matriz: ${product.title.slice(0, 50)}`,
            externalReference: `mkt_${order.id}`,
        })

        // 5. Update order with Pix payload
        await supabase
            .from('marketplace_orders')
            .update({
                asaas_payment_id: pixCharge.paymentId,
                pix_qr_code: pixCharge.encodedImage,
                pix_copy_paste: pixCharge.payload,
                pix_expiration: pixCharge.expirationDate,
            })
            .eq('id', order.id)

        return NextResponse.json({
            success: true,
            orderId: order.id,
            paymentId: pixCharge.paymentId,
            pixQrCode: pixCharge.encodedImage,
            pixCopyPaste: pixCharge.payload,
            expirationDate: pixCharge.expirationDate,
            amount: amount,
        })

    } catch (err: any) {
        console.error('Erro ao gerar Pix do marketplace:', err)
        return NextResponse.json(
            { error: err.message || 'Erro ao processar cobrança Pix.' },
            { status: 500 }
        )
    }
}
