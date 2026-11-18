import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

const BLOCKED_UPLOAD_EXTS = new Set([
    'exe', 'bat', 'cmd', 'com', 'scr', 'msi', 'sh', 'bash', 'ps1', 'vbs',
    'js', 'mjs', 'cjs', 'php', 'py', 'rb', 'pl', 'jar', 'apk', 'dll', 'so', 'dylib',
    'html', 'htm', 'svg'
])
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024 // 30 MB

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const bucket = formData.get('bucket') as string | null
        const path = formData.get('path') as string | null
        const originalName = (formData.get('originalName') as string | null) || file?.name || 'arquivo'

        if (!file || !bucket || !path) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: file, bucket, path' },
                { status: 400 }
            )
        }

        const ALLOWED_BUCKETS = ['job-deliveries', 'chat-attachments', 'avatars', 'proposal_attachments']
        if (!ALLOWED_BUCKETS.includes(bucket) || path.includes('..') || path.startsWith('/') || !/^[a-zA-Z0-9._/-]+$/.test(path)) {
            return NextResponse.json({ error: 'Destino de upload inválido ou não autorizado.' }, { status: 400 })
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: 'Arquivo excede o limite máximo de 30 MB.' }, { status: 400 })
        }

        const fileExt = (file.name || '').split('.').pop()?.toLowerCase() || ''
        const pathExt = path.split('.').pop()?.toLowerCase() || ''
        if (BLOCKED_UPLOAD_EXTS.has(fileExt) || BLOCKED_UPLOAD_EXTS.has(pathExt)) {
            return NextResponse.json({ error: 'Tipo de arquivo bloqueado por segurança.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Convert File to Buffer for server-side upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, buffer, {
                upsert: true,
                contentType: file.type || 'application/octet-stream',
                cacheControl: '3600',
                metadata: {
                    originalName: originalName
                }
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json(
                { error: uploadError.message || 'Erro no upload do arquivo' },
                { status: 500 }
            )
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path, {
                download: originalName
            })

        return NextResponse.json({ success: true, publicUrl })
    } catch (error: any) {
        console.error('Upload delivery error:', error)
        return NextResponse.json(
            { error: error.message || 'Erro interno no upload' },
            { status: 500 }
        )
    }
}
