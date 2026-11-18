import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

const ALLOWED_AVATAR_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const MAX_AVATAR_BYTES = 10 * 1024 * 1024 // 10 MB
const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}
const EXT_TO_MIME: Record<string, string> = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const rawFiles = formData.getAll('files') as File[]
        const singleFile = formData.get('file') as File | null
        const userId = formData.get('userId') as string | null
        const isPortfolio = formData.get('isPortfolio') === 'true' || formData.get('type') === 'portfolio'

        const filesToProcess: File[] = (rawFiles && rawFiles.length > 0)
            ? rawFiles
            : (singleFile ? [singleFile] : [])

        if (filesToProcess.length === 0 || !userId) {
            return NextResponse.json({ error: 'Arquivo e ID do usuário são obrigatórios.' }, { status: 400 })
        }

        if (userId.includes('..') || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
            return NextResponse.json({ error: 'ID de usuário inválido.' }, { status: 400 })
        }

        // Validate each file before any auth/upload work
        const validatedFiles: Array<{ file: File; safeExt: string; contentType: string }> = []
        for (const file of filesToProcess) {
            if (file.size > MAX_AVATAR_BYTES) {
                return NextResponse.json({ error: 'Imagem excede o limite máximo de 10 MB.' }, { status: 400 })
            }

            const mime = (file.type || '').toLowerCase().trim()
            if (mime && (!mime.startsWith('image/') || mime === 'image/svg+xml')) {
                return NextResponse.json({ error: 'Tipo de imagem não permitido. Use JPG, PNG, WebP ou GIF.' }, { status: 400 })
            }

            const hasDot = (file.name || '').includes('.')
            const rawExt = hasDot ? (file.name.split('.').pop()?.toLowerCase() || '') : (MIME_TO_EXT[mime] || '')
            if (!ALLOWED_AVATAR_EXTS.has(rawExt)) {
                return NextResponse.json({ error: 'Formato de arquivo inválido. Use JPG, PNG, WebP ou GIF.' }, { status: 400 })
            }

            const safeExt = rawExt === 'jpeg' ? 'jpg' : rawExt
            const contentType = MIME_TO_EXT[mime] ? mime : (EXT_TO_MIME[safeExt] || 'image/jpeg')
            validatedFiles.push({ file, safeExt, contentType })
        }

        const supabase = createServiceClient()

        // Optional Bearer auth verification: prevent uploading/overwriting another user's avatar
        const authHeader = request.headers.get('authorization')
        if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
            const token = authHeader.slice(7).trim()
            if (!token) {
                return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })
            }

            const { data: authData, error: authErr } = await supabase.auth.getUser(token)
            if (authErr || !authData?.user) {
                return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })
            }

            const authUser = authData.user
            if (authUser.id !== userId) {
                const { data: targetUser } = await supabase
                    .from('users')
                    .select('id, supabase_user_id')
                    .or(`id.eq.${userId},supabase_user_id.eq.${userId}`)
                    .maybeSingle()

                if (!targetUser || (targetUser.id !== authUser.id && targetUser.supabase_user_id !== authUser.id)) {
                    return NextResponse.json({ error: 'Acesso negado: você não pode alterar o avatar de outro usuário.' }, { status: 403 })
                }
            }
        }

        const uploadedUrls: string[] = []
        let bucketEnsured = false

        // Upload each file directly to 'avatars' (create bucket lazily only on 'not found')
        for (let i = 0; i < validatedFiles.length; i++) {
            const { file, safeExt, contentType } = validatedFiles[i]
            const fileName = isPortfolio
                ? `portfolio-${userId}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}.${safeExt}`
                : `${userId}-${Date.now()}.${safeExt}`
            const fileBuffer = Buffer.from(await file.arrayBuffer())

            let { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, fileBuffer, {
                    contentType,
                    upsert: true
                })

            if (uploadError && !bucketEnsured && uploadError.message?.toLowerCase().includes('not found')) {
                bucketEnsured = true
                const { error: bucketError } = await supabase.storage.createBucket('avatars', {
                    public: true,
                    fileSizeLimit: 10485760, // 10MB limit
                    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
                })
                if (bucketError && !bucketError.message?.toLowerCase().includes('already exists')) {
                    console.error('Bucket creation error:', bucketError)
                } else {
                    const retryRes = await supabase.storage
                        .from('avatars')
                        .upload(fileName, fileBuffer, {
                            contentType,
                            upsert: true
                        })
                    uploadError = retryRes.error
                }
            }

            if (uploadError) {
                console.error('Upload error:', uploadError)
                continue
            }

            const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName)
            if (publicData?.publicUrl) {
                uploadedUrls.push(publicData.publicUrl)
            }
        }

        if (uploadedUrls.length === 0) {
            return NextResponse.json({ error: 'Falha ao processar imagens.' }, { status: 500 })
        }

        // Update user record in database ONLY if it's an avatar upload
        if (!isPortfolio && uploadedUrls.length > 0) {
            await supabase
                .from('users')
                .update({ avatar_url: uploadedUrls[0] })
                .or(`id.eq.${userId},supabase_user_id.eq.${userId}`)
        }

        return NextResponse.json({
            publicUrl: uploadedUrls[0],
            avatarUrl: uploadedUrls[0],
            urls: uploadedUrls
        }, { status: 200 })
    } catch (error: any) {
        console.error('Server error on upload-avatar:', error)
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 })
    }
}
