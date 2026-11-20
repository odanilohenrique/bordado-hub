import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

/**
 * POST /api/marketplace/upload
 *
 * Gera um token de upload assinado (Signed Upload URL) para os buckets do Marketplace
 * usando o Service Client. O navegador envia o arquivo direto ao Storage com esse token,
 * o que evita o erro "new row violates row-level security policy" do anon client
 * e também o limite de 4.5 MB de corpo das funções serverless da Vercel.
 *
 * O caminho é SEMPRE gerado no servidor, dentro da pasta do vendedor autenticado.
 */

const ALLOWED_BUCKETS = new Set(['marketplace-previews', 'marketplace-files'])
const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const BLOCKED_MATRIX_EXTS = new Set([
    'exe', 'sh', 'bash', 'bat', 'cmd', 'com', 'scr', 'msi', 'ps1', 'vbs',
    'js', 'mjs', 'cjs', 'php', 'py', 'rb', 'pl', 'jar', 'apk', 'dll', 'so', 'dylib',
    'html', 'htm', 'xhtml', 'svg', 'xml',
])
const MAX_PREVIEW_BYTES = 5 * 1024 * 1024 // 5 MB (foto já otimizada no cliente)
const MAX_MATRIX_BYTES = 30 * 1024 * 1024 // 30 MB (limite total do pacote)

function toSafeStorageFileName(originalName: string): string {
    const rawName = (String(originalName || '').split(/[/\\]/).pop() || 'matriz.zip').trim()
    const lastDot = rawName.lastIndexOf('.')
    const rawBase = lastDot > 0 ? rawName.slice(0, lastDot) : rawName
    const rawExt = lastDot > 0 ? rawName.slice(lastDot + 1) : ''

    const cleanBase = rawBase
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .replace(/^[._]+|[._]+$/g, '')
        .slice(0, 120) || 'matriz'

    const cleanExt = rawExt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 16)

    return cleanExt ? `${cleanBase}.${cleanExt}` : cleanBase
}

function getExt(name: string): string {
    const base = String(name || '').split(/[/\\]/).pop() || ''
    const idx = base.lastIndexOf('.')
    return idx > 0 ? base.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : ''
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Autenticação necessária para enviar arquivos.' }, { status: 401 })
        }
        const token = authHeader.substring(7).trim()
        if (!token) {
            return NextResponse.json({ error: 'Autenticação necessária para enviar arquivos.' }, { status: 401 })
        }

        const body = await request.json().catch(() => null)
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
        }

        const bucket = typeof body.bucket === 'string' ? body.bucket.trim() : ''
        const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : ''
        const fileSize = Number(body.fileSize)

        if (!ALLOWED_BUCKETS.has(bucket)) {
            return NextResponse.json({ error: 'Destino de upload inválido.' }, { status: 400 })
        }
        if (!fileName) {
            return NextResponse.json({ error: 'Nome do arquivo obrigatório.' }, { status: 400 })
        }
        if (!Number.isFinite(fileSize) || fileSize <= 0) {
            return NextResponse.json({ error: 'Tamanho do arquivo inválido.' }, { status: 400 })
        }

        const ext = getExt(fileName)
        if (bucket === 'marketplace-previews') {
            if (!ALLOWED_IMAGE_EXTS.has(ext)) {
                return NextResponse.json({ error: 'Formato de imagem não permitido. Use JPG, PNG, WEBP ou GIF.' }, { status: 400 })
            }
            if (fileSize > MAX_PREVIEW_BYTES) {
                return NextResponse.json({ error: 'A foto excede o limite de 5 MB.' }, { status: 400 })
            }
        } else {
            if (!ext || BLOCKED_MATRIX_EXTS.has(ext)) {
                return NextResponse.json({ error: 'Tipo de arquivo bloqueado por segurança.' }, { status: 400 })
            }
            if (fileSize > MAX_MATRIX_BYTES) {
                return NextResponse.json({ error: 'O arquivo excede o limite total de 30 MB.' }, { status: 400 })
            }
        }

        const supabase = createServiceClient()

        const { data: authData, error: authErr } = await supabase.auth.getUser(token)
        if (authErr || !authData?.user) {
            return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })
        }
        const authUserId = authData.user.id

        const { data: callerProfile, error: profileErr } = await supabase
            .from('users')
            .select('id, supabase_user_id')
            .or(`supabase_user_id.eq.${authUserId},id.eq.${authUserId}`)
            .maybeSingle()

        if (profileErr) {
            console.error('Erro ao buscar perfil no upload do marketplace:', profileErr)
            return NextResponse.json({ error: 'Erro ao validar perfil do usuário.' }, { status: 500 })
        }
        if (!callerProfile?.id) {
            return NextResponse.json({ error: 'Perfil de vendedor não encontrado.' }, { status: 403 })
        }

        const ownerId = callerProfile.id
        const rand = Math.random().toString(36).slice(2, 8)
        const storagePath = bucket === 'marketplace-previews'
            ? `${ownerId}/${Date.now()}_${rand}_preview.${ext === 'jpeg' ? 'jpg' : ext}`
            : `${ownerId}/${Date.now()}_${rand}/${toSafeStorageFileName(fileName)}`

        const { data: signed, error: signErr } = await supabase.storage
            .from(bucket)
            .createSignedUploadUrl(storagePath)

        if (signErr || !signed?.token) {
            console.error('Erro ao gerar URL de upload assinada:', signErr)
            return NextResponse.json({ error: 'Não foi possível preparar o envio do arquivo.' }, { status: 500 })
        }

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath)

        return NextResponse.json({
            success: true,
            bucket,
            path: storagePath,
            token: signed.token,
            publicUrl,
        })
    } catch (err: any) {
        console.error('Erro no POST /api/marketplace/upload:', err)
        return NextResponse.json({ error: err?.message || 'Erro interno no upload.' }, { status: 500 })
    }
}
