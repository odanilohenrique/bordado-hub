import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

/**
 * Valida se um ID é seguro contra injeção e path traversal
 */
function isValidId(id: string): boolean {
    if (!id || typeof id !== 'string') return false
    if (id.includes('..') || id.includes('/') || id.includes('\\')) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/**
 * Autentica o usuário a partir do cabeçalho Authorization ou fallback
 */
async function getCallerIdentity(request: Request, supabase: any, bodyUserId?: string) {
    const authHeader = request.headers.get('authorization')
    let authUserId: string | null = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const { data: authData, error: authErr } = await supabase.auth.getUser(token)
        if (authErr || !authData?.user) {
            return { error: 'Sessão inválida ou expirada.', status: 401 }
        }
        authUserId = authData.user.id
    }

    // Se houver token, busca o perfil para obter o id da tabela public.users
    let callerProfile: { id: string; supabase_user_id: string } | null = null
    if (authUserId) {
        const { data: profile } = await supabase
            .from('users')
            .select('id, supabase_user_id')
            .or(`supabase_user_id.eq.${authUserId},id.eq.${authUserId}`)
            .maybeSingle()
        callerProfile = profile
    }

    // Anti-Spoofing: se enviou bodyUserId e também token, devem bater
    if (authUserId && bodyUserId) {
        const matches = (callerProfile && (bodyUserId === callerProfile.id || bodyUserId === callerProfile.supabase_user_id)) ||
                        bodyUserId === authUserId
        if (!matches) {
            return { error: 'Acesso negado: ID de usuário inconsistente com a sessão.', status: 403 }
        }
    }

    // Identificador efetivo
    const effectiveId = callerProfile?.id || authUserId || bodyUserId || null

    if (!effectiveId) {
        return { error: 'Autenticação necessária para gerenciar produtos.', status: 401 }
    }

    return { 
        effectiveId, 
        profileId: callerProfile?.id || null, 
        authUserId: authUserId || null 
    }
}

/**
 * PATCH /api/marketplace/products/[id]
 * Permite ao vendedor pausar (is_active = false) ou reativar (is_active = true) sua matriz.
 */
export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await context.params

        if (!isValidId(productId)) {
            return NextResponse.json({ error: 'ID do produto inválido.' }, { status: 400 })
        }

        const body = await request.json().catch(() => ({}))
        const supabase = createServiceClient()

        // 1. Autenticação e Zero-Trust
        const authResult = await getCallerIdentity(request, supabase, body.userId)
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        // 2. Validação do payload
        let newStatus: boolean | null = null
        if (body.action === 'pause') {
            newStatus = false
        } else if (body.action === 'resume') {
            newStatus = true
        } else if (typeof body.is_active === 'boolean') {
            newStatus = body.is_active
        }

        if (newStatus === null) {
            return NextResponse.json({
                error: 'Payload inválido. Envie { action: "pause" | "resume" } ou { is_active: boolean }.'
            }, { status: 400 })
        }

        // 3. Busca o produto para validar posse
        const { data: product, error: prodErr } = await supabase
            .from('marketplace_products')
            .select('id, seller_id, is_active, title')
            .eq('id', productId)
            .maybeSingle()

        if (prodErr) {
            console.error('Erro ao buscar produto:', prodErr)
            return NextResponse.json({ error: 'Erro ao verificar produto.' }, { status: 500 })
        }

        if (!product) {
            return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
        }

        // 4. Verificação de propriedade (Apenas o vendedor pode alterar)
        const isOwner = product.seller_id === authResult.effectiveId ||
                        product.seller_id === authResult.profileId ||
                        product.seller_id === authResult.authUserId

        if (!isOwner) {
            return NextResponse.json({
                error: 'Acesso negado: apenas o criador desta matriz pode gerenciá-la.'
            }, { status: 403 })
        }

        // 5. Atualização no banco
        const { data: updatedProduct, error: updateErr } = await supabase
            .from('marketplace_products')
            .update({ 
                is_active: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', productId)
            .select('id, is_active')
            .single()

        if (updateErr) {
            console.error('Erro ao atualizar produto:', updateErr)
            return NextResponse.json({ error: 'Erro ao atualizar matriz.' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            is_active: updatedProduct.is_active,
            message: updatedProduct.is_active ? 'Matriz reativada com sucesso.' : 'Matriz pausada com sucesso.'
        })

    } catch (err: any) {
        console.error('Erro no PATCH /api/marketplace/products/[id]:', err)
        return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 })
    }
}

/**
 * DELETE /api/marketplace/products/[id]
 * Executa estritamente SOFT-DELETE (is_active = false).
 * NUNCA remove a linha física do banco para preservar o histórico de compras e downloads anteriores.
 */
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await context.params

        if (!isValidId(productId)) {
            return NextResponse.json({ error: 'ID do produto inválido.' }, { status: 400 })
        }

        const body = await request.json().catch(() => ({}))
        const { searchParams } = new URL(request.url)
        const queryUserId = searchParams.get('userId') || body.userId

        const supabase = createServiceClient()

        // 1. Autenticação e Zero-Trust
        const authResult = await getCallerIdentity(request, supabase, queryUserId)
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        // 2. Busca o produto para validar posse
        const { data: product, error: prodErr } = await supabase
            .from('marketplace_products')
            .select('id, seller_id, is_active, title')
            .eq('id', productId)
            .maybeSingle()

        if (prodErr) {
            console.error('Erro ao buscar produto:', prodErr)
            return NextResponse.json({ error: 'Erro ao verificar produto.' }, { status: 500 })
        }

        if (!product) {
            return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
        }

        // 3. Verificação de propriedade
        const isOwner = product.seller_id === authResult.effectiveId ||
                        product.seller_id === authResult.profileId ||
                        product.seller_id === authResult.authUserId

        if (!isOwner) {
            return NextResponse.json({
                error: 'Acesso negado: apenas o criador desta matriz pode excluí-la.'
            }, { status: 403 })
        }

        // 4. SOFT-DELETE OBRIGATÓRIO: UPDATE is_active = false
        // (Jamais execute .delete() para não quebrar integridade referencial com marketplace_orders)
        const { error: deleteErr } = await supabase
            .from('marketplace_products')
            .update({ 
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', productId)

        if (deleteErr) {
            console.error('Erro ao desativar matriz:', deleteErr)
            return NextResponse.json({ error: 'Erro ao desativar matriz.' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Matriz desativada com sucesso.'
        })

    } catch (err: any) {
        console.error('Erro no DELETE /api/marketplace/products/[id]:', err)
        return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 })
    }
}
