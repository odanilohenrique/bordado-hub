import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

/**
 * Validação de Path Traversal e integridade de identificador
 */
function isSafeProductId(id: string): boolean {
    if (!id || typeof id !== 'string') return false
    if (id.includes('..') || id.includes('/') || id.includes('\\')) return false
    return true
}

export async function GET(
    request: Request,
    context: { params: Promise<{ productId: string }> }
) {
    try {
        const { productId } = await context.params
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        // 1. Sanitização de entrada contra injeções e Path Traversal
        if (!isSafeProductId(productId)) {
            return NextResponse.json(
                { error: 'ID do produto inválido.' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // 2. Autenticação e Blindagem contra ID Spoofing
        const authHeader = request.headers.get('authorization')
        let authenticatedUserId: string | null = null
        let callerProfile: { id: string; supabase_user_id: string } | null = null

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7)
            const { data: authData, error: authErr } = await supabase.auth.getUser(token)
            
            if (authErr || !authData?.user) {
                return NextResponse.json(
                    { error: 'Sessão inválida ou expirada.' },
                    { status: 401 }
                )
            }

            authenticatedUserId = authData.user.id

            // Busca o perfil correspondente na tabela public.users
            const { data: profile } = await supabase
                .from('users')
                .select('id, supabase_user_id')
                .or(`supabase_user_id.eq.${authenticatedUserId},id.eq.${authenticatedUserId}`)
                .maybeSingle()

            callerProfile = profile

            // Detecção estrita de ID Spoofing se userId tiver sido fornecido
            if (userId) {
                const isMatch = userId === authenticatedUserId ||
                                (callerProfile && (userId === callerProfile.id || userId === callerProfile.supabase_user_id))
                
                if (!isMatch) {
                    return NextResponse.json(
                        { error: 'Acesso negado: tentativa de spoofing de identidade detectada.' },
                        { status: 403 }
                    )
                }
            }
        }

        // Identificador final para conferência de compra / venda
        const effectiveUserId = callerProfile?.id || userId || authenticatedUserId

        if (!effectiveUserId) {
            return NextResponse.json(
                { error: 'Parâmetros inválidos. É necessário autenticação para baixar.' },
                { status: 400 }
            )
        }

        // 3. Busca o produto (sem restrição de is_active, permitindo download de produtos soft-deleted)
        const { data: product, error: prodErr } = await supabase
            .from('marketplace_products')
            .select('id, title, seller_id, file_url, storage_path, is_active')
            .eq('id', productId)
            .maybeSingle()

        if (prodErr || !product) {
            return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
        }

        // 4. Verificação de permissão: Vendedor OU Comprador com pedido pago
        const isSeller = product.seller_id === userId ||
                         product.seller_id === effectiveUserId ||
                         (callerProfile && (product.seller_id === callerProfile.id || product.seller_id === callerProfile.supabase_user_id))

        if (!isSeller) {
            let orderQuery = supabase
                .from('marketplace_orders')
                .select('id, status, buyer_id')
                .eq('product_id', productId)
                .eq('status', 'paid')

            if (callerProfile?.id && callerProfile?.supabase_user_id && callerProfile.id !== callerProfile.supabase_user_id) {
                orderQuery = orderQuery.or(`buyer_id.eq.${callerProfile.id},buyer_id.eq.${callerProfile.supabase_user_id}`)
            } else {
                orderQuery = orderQuery.eq('buyer_id', effectiveUserId)
            }

            const { data: order, error: orderErr } = await orderQuery.maybeSingle()

            if (orderErr || !order) {
                return NextResponse.json(
                    { error: 'Acesso negado: você precisa comprar esta matriz antes de baixar.' },
                    { status: 403 }
                )
            }
        }

        // 5. Extração e sanitização do caminho no bucket
        let relativePath = product.storage_path
        if (!relativePath && product.file_url) {
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

        if (relativePath.includes('..')) {
            return NextResponse.json(
                { error: 'Caminho de armazenamento inválido.' },
                { status: 400 }
            )
        }

        // 6. Geração da URL assinada (Signed URL) de 60 segundos
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
