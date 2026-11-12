import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function GET(
    request: Request,
    context: { params: Promise<{ productId: string }> }
) {
    try {
        const { productId } = await context.params
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!productId || !userId) {
            return NextResponse.json(
                { error: 'Parâmetros inválidos. É necessário autenticação para baixar.' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // 1. Busca o produto
        const { data: product, error: prodErr } = await supabase
            .from('marketplace_products')
            .select('id, title, seller_id, file_url, storage_path')
            .eq('id', productId)
            .single()

        if (prodErr || !product) {
            return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
        }

        const isSeller = product.seller_id === userId

        // 2. Se não for o próprio vendedor, verifica se há pedido pago
        if (!isSeller) {
            const { data: order, error: orderErr } = await supabase
                .from('marketplace_orders')
                .select('id, status')
                .eq('product_id', productId)
                .eq('buyer_id', userId)
                .eq('status', 'paid')
                .maybeSingle()

            if (orderErr || !order) {
                return NextResponse.json(
                    { error: 'Acesso negado: você precisa comprar esta matriz antes de baixar.' },
                    { status: 403 }
                )
            }
        }

        // 3. Extrai o caminho relativo dentro do bucket marketplace-files
        let relativePath = product.storage_path
        if (!relativePath && product.file_url) {
            // Extrai o path a partir da URL antiga caso storage_path não esteja preenchido
            const marker = '/marketplace-files/'
            const idx = product.file_url.indexOf(marker)
            if (idx !== -1) {
                relativePath = decodeURIComponent(product.file_url.substring(idx + marker.length).split('?')[0])
            }
        }

        if (!relativePath) {
            return NextResponse.json(
                { error: 'Arquivo da matriz não localizado no servidor.' },
                { status: 404 }
            )
        }

        // 4. Cria Signed URL de curta duração (60 segundos)
        const { data: signedData, error: signErr } = await supabase
            .storage
            .from('marketplace-files')
            .createSignedUrl(relativePath, 60, {
                download: true
            })

        if (signErr || !signedData?.signedUrl) {
            console.error('Erro ao gerar signed URL:', signErr)
            return NextResponse.json(
                { error: 'Não foi possível gerar o link de download seguro.' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            downloadUrl: signedData.signedUrl
        })
    } catch (err: any) {
        console.error('Erro na rota de download seguro:', err)
        return NextResponse.json(
            { error: err.message || 'Erro interno no download.' },
            { status: 500 }
        )
    }
}
