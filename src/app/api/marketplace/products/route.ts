import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

/**
 * POST /api/marketplace/products
 *
 * Cria um anúncio no Marketplace usando o Service Client (ignora RLS do anon client),
 * com autenticação estrita via Bearer JWT, seller_id derivado SEMPRE da sessão
 * (anti-spoofing) e whitelist de campos (zero mass assignment).
 */

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
        if (/\.(svg|html|htm|xhtml|xml|php|js|mjs|exe)$/i.test(parsed.pathname.toLowerCase())) {
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

function normalizeFormats(rawFormats: unknown): { formats?: string[]; error?: string } {
    if (!Array.isArray(rawFormats)) {
        return { error: 'Os formatos devem ser enviados em uma lista.' }
    }
    const seen = new Set<string>()
    const normalized: string[] = []
    for (const item of rawFormats) {
        if (typeof item !== 'string') return { error: 'Formato inválido informado.' }
        const cleaned = item.trim().replace(/^\.+/, '').toUpperCase()
        if (!cleaned) continue
        if (!FORMAT_CODE_REGEX.test(cleaned)) {
            return { error: `Formato inválido: "${item}".` }
        }
        if (!seen.has(cleaned)) {
            seen.add(cleaned)
            normalized.push(cleaned)
        }
    }
    if (normalized.length === 0) return { error: 'Informe pelo menos 1 formato de matriz.' }
    if (normalized.length > MAX_FORMATS) return { error: `Limite máximo de ${MAX_FORMATS} formatos por anúncio.` }
    return { formats: normalized }
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Autenticação necessária para publicar matrizes.' }, { status: 401 })
        }
        const token = authHeader.substring(7).trim()
        if (!token) {
            return NextResponse.json({ error: 'Autenticação necessária para publicar matrizes.' }, { status: 401 })
        }

        const rawBody = await request.json().catch(() => null)
        if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
            return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
        }
        const body = rawBody as Record<string, any>

        const supabase = createServiceClient()

        // 1. Autenticação estrita
        const { data: authData, error: authErr } = await supabase.auth.getUser(token)
        if (authErr || !authData?.user) {
            return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })
        }
        const authUserId: string = authData.user.id

        const { data: callerProfile, error: profileErr } = await supabase
            .from('users')
            .select('id, supabase_user_id')
            .or(`supabase_user_id.eq.${authUserId},id.eq.${authUserId}`)
            .maybeSingle()

        if (profileErr) {
            console.error('Erro ao buscar perfil do vendedor:', profileErr)
            return NextResponse.json({ error: 'Erro ao validar perfil do usuário.' }, { status: 500 })
        }
        if (!callerProfile?.id) {
            return NextResponse.json({ error: 'Perfil de vendedor não encontrado.' }, { status: 403 })
        }

        // 2. Anti-spoofing: seller_id/userId enviados precisam bater com a sessão
        const allowedIds = [callerProfile.id, callerProfile.supabase_user_id, authUserId].filter(Boolean) as string[]
        for (const key of ['seller_id', 'userId']) {
            const v = body[key]
            if (v !== undefined && v !== null && v !== '' && !allowedIds.includes(String(v))) {
                return NextResponse.json({ error: 'Acesso negado: ID de usuário inconsistente com a sessão.' }, { status: 403 })
            }
        }

        // 3. Validação estrita
        if (typeof body.title !== 'string' || body.title.trim().length < 1 || body.title.trim().length > 160) {
            return NextResponse.json({ error: 'O título deve ter entre 1 e 160 caracteres.' }, { status: 400 })
        }
        const title = body.title.trim()

        let description: string | null = null
        if (body.description !== undefined && body.description !== null) {
            if (typeof body.description !== 'string') {
                return NextResponse.json({ error: 'Descrição inválida.' }, { status: 400 })
            }
            const trimmed = body.description.trim()
            if (trimmed.length > 5000) {
                return NextResponse.json({ error: 'A descrição pode ter no máximo 5000 caracteres.' }, { status: 400 })
            }
            description = trimmed || null
        }

        const parsedPrice = typeof body.price === 'number' ? body.price : Number(String(body.price ?? '').replace(',', '.'))
        if (!Number.isFinite(parsedPrice) || parsedPrice < MIN_PRICE || parsedPrice > MAX_PRICE) {
            return NextResponse.json({
                error: `O preço deve estar entre R$ ${MIN_PRICE.toFixed(2).replace('.', ',')} e R$ ${MAX_PRICE.toLocaleString('pt-BR')}.`,
            }, { status: 400 })
        }
        const price = Number(parsedPrice.toFixed(2))

        const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'geral'
        if (!ALLOWED_CATEGORIES.has(category)) {
            return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 })
        }

        const fmt = normalizeFormats(body.formats)
        if (fmt.error || !fmt.formats) {
            return NextResponse.json({ error: fmt.error || 'Formatos inválidos.' }, { status: 400 })
        }

        // Galeria: capa primeiro, deduplicada, 1..10
        if (!Array.isArray(body.image_urls)) {
            return NextResponse.json({ error: 'image_urls deve ser uma lista de URLs.' }, { status: 400 })
        }
        const gallery: string[] = []
        for (const raw of body.image_urls) {
            if (!isSafeHttpsUrl(raw)) {
                return NextResponse.json({ error: 'Todas as fotos do anúncio devem possuir URLs HTTPS válidas.' }, { status: 400 })
            }
            const t = raw.trim()
            if (!gallery.includes(t)) gallery.push(t)
        }
        let cover = gallery[0]
        if (body.image_url !== undefined && body.image_url !== null && body.image_url !== '') {
            if (!isSafeHttpsUrl(body.image_url)) {
                return NextResponse.json({ error: 'URL da imagem de capa inválida.' }, { status: 400 })
            }
            cover = body.image_url.trim()
        }
        if (!cover) {
            return NextResponse.json({ error: 'Foto de capa obrigatória.' }, { status: 400 })
        }
        const orderedPhotos = [cover, ...gallery.filter((u) => u !== cover)]
        if (orderedPhotos.length < 1 || orderedPhotos.length > MAX_PHOTOS) {
            return NextResponse.json({
                error: `O anúncio deve possuir entre 1 e ${MAX_PHOTOS} fotos (1 capa + até ${MAX_PHOTOS - 1} adicionais).`,
            }, { status: 400 })
        }

        // Arquivo digital: storage_path do próprio vendedor + URL Supabase correspondente
        if (!isSafeStoragePath(body.storage_path, allowedIds)) {
            return NextResponse.json({ error: 'Caminho de armazenamento inválido ou não autorizado.' }, { status: 403 })
        }
        if (!isSafeHttpsUrl(body.file_url)) {
            return NextResponse.json({ error: 'URL do arquivo da matriz inválida.' }, { status: 400 })
        }
        const storagePath = body.storage_path.trim()
        const parsedFileUrl = new URL(body.file_url.trim())
        if (parsedFileUrl.search || parsedFileUrl.hash) {
            return NextResponse.json({ error: 'URL do arquivo da matriz inválida.' }, { status: 400 })
        }
        let configuredOrigin: string | null = null
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            try {
                configuredOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
            } catch {
                configuredOrigin = null
            }
        }
        const isTrustedHost = (configuredOrigin && parsedFileUrl.origin === configuredOrigin) ||
            parsedFileUrl.hostname.endsWith('.supabase.co')
        if (!isTrustedHost) {
            return NextResponse.json({ error: 'URL do arquivo da matriz inválida.' }, { status: 400 })
        }
        if (parsedFileUrl.pathname !== `/storage/v1/object/public/marketplace-files/${storagePath}`) {
            return NextResponse.json({ error: 'URL do arquivo da matriz não corresponde ao storage_path informado.' }, { status: 400 })
        }

        if (body.is_bundle !== undefined && typeof body.is_bundle !== 'boolean') {
            return NextResponse.json({ error: 'O campo is_bundle deve ser booleano.' }, { status: 400 })
        }
        const isBundle = body.is_bundle === true
        let itemsCount = 1
        if (isBundle) {
            const candidate = Number(body.items_count)
            if (!Number.isInteger(candidate) || candidate < 2 || candidate > MAX_BUNDLE_ITEMS) {
                return NextResponse.json({ error: `Pacotes devem conter entre 2 e ${MAX_BUNDLE_ITEMS} matrizes.` }, { status: 400 })
            }
            itemsCount = candidate
        }

        // 4. Inserção via Service Client (seller_id sempre derivado da sessão)
        const { data: inserted, error: insertErr } = await supabase
            .from('marketplace_products')
            .insert({
                seller_id: callerProfile.id,
                title,
                description,
                price,
                category,
                formats: fmt.formats,
                image_url: orderedPhotos[0],
                image_urls: orderedPhotos,
                file_url: parsedFileUrl.toString(),
                storage_path: storagePath,
                is_bundle: isBundle,
                items_count: itemsCount,
                sales_count: 0,
                is_active: true,
            })
            .select('id, seller_id, title, price, image_url, image_urls, formats, category, is_bundle, items_count, is_active')
            .single()

        if (insertErr || !inserted) {
            console.error('Erro ao criar produto do marketplace:', insertErr)
            return NextResponse.json({ error: 'Erro ao salvar produto. Tente novamente.' }, { status: 500 })
        }

        return NextResponse.json({ success: true, id: inserted.id, product: inserted }, { status: 201 })
    } catch (err: any) {
        console.error('Erro no POST /api/marketplace/products:', err)
        return NextResponse.json({ error: err?.message || 'Erro interno do servidor.' }, { status: 500 })
    }
}
