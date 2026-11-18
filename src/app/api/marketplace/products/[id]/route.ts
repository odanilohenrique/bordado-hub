import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

const MAX_PHOTOS = 10
const MAX_FORMATS = 30
const MAX_BUNDLE_ITEMS = 20
const MIN_PRICE = 5
const MAX_PRICE = 50000
const FORMAT_CODE_REGEX = /^[A-Z0-9][A-Z0-9_-]{0,11}$/
const ALLOWED_CATEGORIES = new Set([
    'geral',
    'infantil',
    'animais',
    'floral',
    'religioso',
    'logos',
    'frases',
    'datas',
])

/**
 * Valida se um ID é UUID seguro contra injeção e path traversal
 */
function isValidId(id: string): boolean {
    if (!id || typeof id !== 'string') return false
    if (id.includes('..') || id.includes('/') || id.includes('\\')) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

function isSafeHttpsUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false
    const trimmed = value.trim()
    if (!trimmed) return false
    const lower = trimmed.toLowerCase()
    if (lower.startsWith('blob:') || lower.startsWith('data:') || lower.startsWith('javascript:')) {
        return false
    }
    try {
        const parsed = new URL(trimmed)
        if (parsed.protocol !== 'https:') return false
        const pathnameLower = parsed.pathname.toLowerCase()
        if (/\.(svg|html|htm|xhtml|xml|php|js|mjs|exe)$/i.test(pathnameLower)) {
            return false
        }
        return true
    } catch {
        return false
    }
}

function isSafeStoragePath(value: unknown, allowedOwnerIds: string[]): value is string {
    if (typeof value !== 'string') return false
    const trimmed = value.trim()
    if (
        !trimmed ||
        trimmed.includes('..') ||
        trimmed.includes('\\') ||
        trimmed.includes('%') ||
        trimmed.includes('?') ||
        trimmed.includes('#') ||
        trimmed.includes('//') ||
        /[\u0000-\u001f\u007f]/.test(trimmed) ||
        trimmed.startsWith('/') ||
        trimmed.endsWith('/')
    ) {
        return false
    }
    return allowedOwnerIds.some((ownerId) => {
        if (!ownerId || !trimmed.startsWith(`${ownerId}/`)) return false
        const remainder = trimmed.slice(ownerId.length + 1)
        if (!remainder) return false
        if (!/^[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*$/.test(remainder)) return false
        return !remainder.split('/').some((seg) => seg === '.' || seg === '..')
    })
}

function normalizeAndValidateFormats(rawFormats: unknown): { formats?: string[]; error?: string } {
    if (!Array.isArray(rawFormats)) {
        return { error: 'Os formatos devem ser enviados em uma lista.' }
    }

    const seen = new Set<string>()
    const normalized: string[] = []

    for (const item of rawFormats) {
        if (typeof item !== 'string') {
            return { error: 'Formato inválido informado.' }
        }
        const cleaned = item.trim().replace(/^\.+/, '').toUpperCase()
        if (!cleaned) continue
        if (!FORMAT_CODE_REGEX.test(cleaned)) {
            return { error: `Formato inválido: "${item}". Use apenas letras, números, "-" ou "_" (até 12 caracteres).` }
        }
        if (!seen.has(cleaned)) {
            seen.add(cleaned)
            normalized.push(cleaned)
        }
    }

    if (normalized.length === 0) {
        return { error: 'Informe pelo menos 1 formato de matriz.' }
    }
    if (normalized.length > MAX_FORMATS) {
        return { error: `Limite máximo de ${MAX_FORMATS} formatos por anúncio.` }
    }

    return { formats: normalized }
}

/**
 * Autentica o usuário estritamente via cabeçalho Authorization: Bearer <token>
 * Sem fallback inseguro para body.userId.
 */
async function getCallerIdentity(request: Request, supabase: any, bodyUserId?: string) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Autenticação necessária para gerenciar produtos.', status: 401 }
    }

    const token = authHeader.substring(7).trim()
    if (!token) {
        return { error: 'Autenticação necessária para gerenciar produtos.', status: 401 }
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !authData?.user) {
        return { error: 'Sessão inválida ou expirada.', status: 401 }
    }
    const authUserId = authData.user.id

    const { data: callerProfile, error: profileErr } = await supabase
        .from('users')
        .select('id, supabase_user_id')
        .or(`supabase_user_id.eq.${authUserId},id.eq.${authUserId}`)
        .maybeSingle()

    if (profileErr) {
        console.error('Erro ao buscar perfil do chamador:', profileErr)
        return { error: 'Erro ao validar perfil do usuário.', status: 500 }
    }

    // Anti-Spoofing: se enviou bodyUserId, deve corresponder ao usuário autenticado
    if (bodyUserId !== undefined && bodyUserId !== null && bodyUserId !== '') {
        const matches =
            (callerProfile && (bodyUserId === callerProfile.id || bodyUserId === callerProfile.supabase_user_id)) ||
            bodyUserId === authUserId
        if (!matches) {
            return { error: 'Acesso negado: ID de usuário inconsistente com a sessão.', status: 403 }
        }
    }

    const effectiveId = callerProfile?.id || authUserId

    return {
        effectiveId,
        profileId: callerProfile?.id || null,
        authUserId,
    }
}

/**
 * PATCH /api/marketplace/products/[id]
 * Permite ao vendedor pausar/reativar ou editar os dados permitidos da sua matriz.
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

        const rawBody = await request.json().catch(() => null)
        if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
            return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
        }
        const body = rawBody as Record<string, any>

        const supabase = createServiceClient()

        // 1. Autenticação estrita via Bearer JWT + Anti-Spoofing
        const authResult = await getCallerIdentity(request, supabase, typeof body.userId === 'string' ? body.userId : undefined)
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        // 2. Busca o produto existente para validar posse e regras entre campos
        const { data: product, error: prodErr } = await supabase
            .from('marketplace_products')
            .select('id, seller_id, is_active, title, description, price, category, formats, image_url, image_urls, is_bundle, items_count, file_url, storage_path')
            .eq('id', productId)
            .maybeSingle()

        if (prodErr) {
            console.error('Erro ao buscar produto:', prodErr)
            return NextResponse.json({ error: 'Erro ao verificar produto.' }, { status: 500 })
        }

        if (!product) {
            return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
        }

        // 3. Verificação de propriedade (apenas o vendedor pode alterar)
        const isOwner =
            product.seller_id === authResult.effectiveId ||
            (authResult.profileId && product.seller_id === authResult.profileId) ||
            product.seller_id === authResult.authUserId

        if (!isOwner) {
            return NextResponse.json({
                error: 'Acesso negado: apenas o criador desta matriz pode gerenciá-la.'
            }, { status: 403 })
        }

        // 4. Montagem estrita de whitelist de atualização (Zero Mass Assignment)
        const updatePayload: Record<string, any> = {}

        // 4a. Status (action: 'pause' | 'resume' ou is_active: boolean)
        const hasAction = Object.prototype.hasOwnProperty.call(body, 'action')
        const hasIsActive = Object.prototype.hasOwnProperty.call(body, 'is_active')
        let toggledStatus: boolean | null = null

        if (hasAction) {
            if (body.action === 'pause') {
                toggledStatus = false
            } else if (body.action === 'resume') {
                toggledStatus = true
            } else {
                return NextResponse.json({
                    error: 'Ação inválida. Use "pause" ou "resume".'
                }, { status: 400 })
            }
        }

        if (hasIsActive) {
            if (typeof body.is_active !== 'boolean') {
                return NextResponse.json({
                    error: 'O campo is_active deve ser booleano.'
                }, { status: 400 })
            }
            if (toggledStatus !== null && toggledStatus !== body.is_active) {
                return NextResponse.json({
                    error: 'Conflito entre action e is_active no payload.'
                }, { status: 400 })
            }
            toggledStatus = body.is_active
        }

        if (toggledStatus !== null) {
            updatePayload.is_active = toggledStatus
        }

        // 4b. Campos de metadados permitidos
        if (Object.prototype.hasOwnProperty.call(body, 'title')) {
            if (typeof body.title !== 'string') {
                return NextResponse.json({ error: 'Título inválido.' }, { status: 400 })
            }
            const trimmedTitle = body.title.trim()
            if (trimmedTitle.length < 1 || trimmedTitle.length > 160) {
                return NextResponse.json({ error: 'O título deve ter entre 1 e 160 caracteres.' }, { status: 400 })
            }
            updatePayload.title = trimmedTitle
        }

        if (Object.prototype.hasOwnProperty.call(body, 'description')) {
            if (body.description === null) {
                updatePayload.description = null
            } else if (typeof body.description === 'string') {
                const trimmedDesc = body.description.trim()
                if (trimmedDesc.length > 5000) {
                    return NextResponse.json({ error: 'A descrição pode ter no máximo 5000 caracteres.' }, { status: 400 })
                }
                updatePayload.description = trimmedDesc || null
            } else {
                return NextResponse.json({ error: 'Descrição inválida.' }, { status: 400 })
            }
        }

        if (Object.prototype.hasOwnProperty.call(body, 'price')) {
            const parsedPrice = typeof body.price === 'number' ? body.price : Number(String(body.price).replace(',', '.'))
            if (!Number.isFinite(parsedPrice) || parsedPrice < MIN_PRICE || parsedPrice > MAX_PRICE) {
                return NextResponse.json({
                    error: `O preço deve estar entre R$ ${MIN_PRICE.toFixed(2).replace('.', ',')} e R$ ${MAX_PRICE.toLocaleString('pt-BR')}.`
                }, { status: 400 })
            }
            updatePayload.price = Number(parsedPrice.toFixed(2))
        }

        if (Object.prototype.hasOwnProperty.call(body, 'category')) {
            if (typeof body.category !== 'string' || !ALLOWED_CATEGORIES.has(body.category.trim())) {
                return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 })
            }
            updatePayload.category = body.category.trim()
        }

        if (Object.prototype.hasOwnProperty.call(body, 'formats')) {
            const fmtResult = normalizeAndValidateFormats(body.formats)
            if (fmtResult.error || !fmtResult.formats) {
                return NextResponse.json({ error: fmtResult.error || 'Formatos inválidos.' }, { status: 400 })
            }
            updatePayload.formats = fmtResult.formats
        }

        // 4c. Galeria de fotos (image_url = capa, image_urls = lista ordenada com capa primeiro, 1..10)
        const hasImageUrl = Object.prototype.hasOwnProperty.call(body, 'image_url')
        const hasImageUrls = Object.prototype.hasOwnProperty.call(body, 'image_urls')

        if (hasImageUrl || hasImageUrls) {
            let requestedCover: string | null = null
            if (hasImageUrl) {
                if (!isSafeHttpsUrl(body.image_url)) {
                    return NextResponse.json({ error: 'URL da imagem de capa inválida. Use uma URL HTTPS válida.' }, { status: 400 })
                }
                requestedCover = body.image_url.trim()
            }

            let requestedGallery: string[] | null = null
            if (hasImageUrls) {
                if (!Array.isArray(body.image_urls)) {
                    return NextResponse.json({ error: 'image_urls deve ser uma lista de URLs.' }, { status: 400 })
                }
                const seenUrls = new Set<string>()
                const cleanedList: string[] = []
                for (const rawUrl of body.image_urls) {
                    if (!isSafeHttpsUrl(rawUrl)) {
                        return NextResponse.json({ error: 'Todas as fotos do anúncio devem possuir URLs HTTPS válidas.' }, { status: 400 })
                    }
                    const trimmed = rawUrl.trim()
                    if (!seenUrls.has(trimmed)) {
                        seenUrls.add(trimmed)
                        cleanedList.push(trimmed)
                    }
                }
                if (cleanedList.length < 1 || cleanedList.length > MAX_PHOTOS) {
                    return NextResponse.json({
                        error: `O anúncio deve possuir entre 1 e ${MAX_PHOTOS} fotos (1 capa + até ${MAX_PHOTOS - 1} adicionais).`
                    }, { status: 400 })
                }
                requestedGallery = cleanedList
            }

            const existingGallery: string[] = Array.isArray(product.image_urls) && product.image_urls.length > 0
                ? product.image_urls.filter((u: unknown) => isSafeHttpsUrl(u)).map((u: string) => u.trim())
                : (isSafeHttpsUrl(product.image_url) ? [product.image_url.trim()] : [])

            const effectiveCover = requestedCover || (requestedGallery ? requestedGallery[0] : (isSafeHttpsUrl(product.image_url) ? product.image_url.trim() : null))
            if (!effectiveCover) {
                return NextResponse.json({ error: 'Foto de capa obrigatória.' }, { status: 400 })
            }

            const sourceList = requestedGallery || existingGallery
            const orderedPhotos = [effectiveCover, ...sourceList.filter((u) => u !== effectiveCover)]

            if (orderedPhotos.length < 1 || orderedPhotos.length > MAX_PHOTOS) {
                return NextResponse.json({
                    error: `O anúncio deve possuir entre 1 e ${MAX_PHOTOS} fotos (1 capa + até ${MAX_PHOTOS - 1} adicionais).`
                }, { status: 400 })
            }

            updatePayload.image_url = orderedPhotos[0]
            updatePayload.image_urls = orderedPhotos
        }

        // 4d. Pacote / Quantidade de itens
        const hasIsBundle = Object.prototype.hasOwnProperty.call(body, 'is_bundle')
        const hasItemsCount = Object.prototype.hasOwnProperty.call(body, 'items_count')

        if (hasIsBundle && typeof body.is_bundle !== 'boolean') {
            return NextResponse.json({ error: 'O campo is_bundle deve ser booleano.' }, { status: 400 })
        }

        if (hasIsBundle || hasItemsCount) {
            const nextIsBundle = hasIsBundle ? body.is_bundle : Boolean(product.is_bundle)
            if (hasIsBundle) {
                updatePayload.is_bundle = nextIsBundle
            }

            if (!nextIsBundle) {
                updatePayload.items_count = 1
            } else {
                const candidateCount = hasItemsCount ? Number(body.items_count) : Number(product.items_count)
                if (!Number.isInteger(candidateCount) || candidateCount < 2 || candidateCount > MAX_BUNDLE_ITEMS) {
                    return NextResponse.json({
                        error: `Pacotes devem conter entre 2 e ${MAX_BUNDLE_ITEMS} matrizes.`
                    }, { status: 400 })
                }
                updatePayload.items_count = candidateCount
            }
        }

        // 4e. Arquivo digital opcional (somente storage_path do próprio vendedor + URL HTTPS válida)
        const hasFileUrl = Object.prototype.hasOwnProperty.call(body, 'file_url')
        const hasStoragePath = Object.prototype.hasOwnProperty.call(body, 'storage_path')
        if (hasFileUrl || hasStoragePath) {
            const allowedOwnerIds = [
                product.seller_id,
                authResult.profileId || '',
                authResult.authUserId,
            ].filter(Boolean)

            if (!hasFileUrl || !hasStoragePath) {
                return NextResponse.json({
                    error: 'Ao substituir o arquivo da matriz, envie file_url e storage_path válidos.'
                }, { status: 400 })
            }

            if (!isSafeStoragePath(body.storage_path, allowedOwnerIds)) {
                return NextResponse.json({ error: 'Caminho de armazenamento inválido ou não autorizado.' }, { status: 403 })
            }

            if (!isSafeHttpsUrl(body.file_url)) {
                return NextResponse.json({ error: 'URL do arquivo da matriz inválida.' }, { status: 400 })
            }

            const cleanStoragePath = body.storage_path.trim()
            const parsedFileUrl = new URL(body.file_url.trim())
            if (parsedFileUrl.search || parsedFileUrl.hash) {
                return NextResponse.json({ error: 'URL do arquivo da matriz inválida.' }, { status: 400 })
            }

            let configuredSupabaseOrigin: string | null = null
            if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
                try {
                    configuredSupabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
                } catch {
                    configuredSupabaseOrigin = null
                }
            }

            const isTrustedSupabaseHost = configuredSupabaseOrigin
                ? parsedFileUrl.origin === configuredSupabaseOrigin || parsedFileUrl.hostname.endsWith('.supabase.co')
                : parsedFileUrl.hostname.endsWith('.supabase.co')

            if (!isTrustedSupabaseHost) {
                return NextResponse.json({ error: 'URL do arquivo da matriz inválida.' }, { status: 400 })
            }

            const hasMatchingStoragePath =
                parsedFileUrl.pathname === `/storage/v1/object/public/marketplace-files/${cleanStoragePath}` ||
                parsedFileUrl.pathname === `/marketplace-files/${cleanStoragePath}`

            if (!hasMatchingStoragePath) {
                return NextResponse.json({ error: 'URL do arquivo da matriz não corresponde ao storage_path informado.' }, { status: 400 })
            }

            updatePayload.file_url = body.file_url.trim()
            updatePayload.storage_path = cleanStoragePath
        }

        if (Object.keys(updatePayload).length === 0) {
            return NextResponse.json({
                error: 'Payload inválido. Envie { action: "pause" | "resume" }, { is_active: boolean } ou campos editáveis válidos.'
            }, { status: 400 })
        }

        updatePayload.updated_at = new Date().toISOString()

        // 5. Atualização no banco
        const { data: updatedProduct, error: updateErr } = await supabase
            .from('marketplace_products')
            .update(updatePayload)
            .eq('id', productId)
            .select('id, seller_id, title, description, price, category, formats, image_url, image_urls, is_bundle, items_count, is_active, updated_at')
            .single()

        if (updateErr || !updatedProduct) {
            console.error('Erro ao atualizar produto:', updateErr)
            return NextResponse.json({ error: 'Erro ao atualizar matriz.' }, { status: 500 })
        }

        const isStatusOnly =
            Object.keys(updatePayload).every((k) => k === 'is_active' || k === 'updated_at')

        const message = isStatusOnly
            ? (updatedProduct.is_active ? 'Matriz reativada com sucesso.' : 'Matriz pausada com sucesso.')
            : 'Matriz atualizada com sucesso.'

        return NextResponse.json({
            success: true,
            product: updatedProduct,
            is_active: updatedProduct.is_active,
            message,
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
        const queryUserId = searchParams.get('userId') || body?.userId

        const supabase = createServiceClient()

        // 1. Autenticação estrita via Bearer JWT + Anti-Spoofing
        const authResult = await getCallerIdentity(request, supabase, typeof queryUserId === 'string' ? queryUserId : undefined)
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
        const isOwner =
            product.seller_id === authResult.effectiveId ||
            (authResult.profileId && product.seller_id === authResult.profileId) ||
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
