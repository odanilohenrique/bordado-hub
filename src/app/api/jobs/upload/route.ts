import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

const BLOCKED_UPLOAD_EXTS = new Set([
    'exe', 'bat', 'cmd', 'com', 'scr', 'msi', 'sh', 'bash', 'ps1', 'vbs',
    'js', 'mjs', 'cjs', 'php', 'py', 'rb', 'pl', 'jar', 'apk', 'dll', 'so', 'dylib',
    'html', 'htm', 'svg'
])
const MAX_JOB_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const userId = formData.get('userId') as string | null

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
        }

        if (file.size > MAX_JOB_UPLOAD_BYTES) {
            return NextResponse.json({ error: 'Arquivo excede o limite máximo de 15 MB.' }, { status: 400 })
        }

        const originalName = file.name || 'imagem.jpg'
        const rawExt = originalName.split('.').pop()?.toLowerCase() || ''
        if (BLOCKED_UPLOAD_EXTS.has(rawExt)) {
            return NextResponse.json({ error: 'Tipo de arquivo bloqueado por segurança.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Upload com service client para contornar restrições de RLS no storage
        const cleanName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const safeUserId = (userId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_') || 'general'
        const filePath = `jobs/${safeUserId}/${uniqueId}_${cleanName}`
        const fileBuffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await supabase.storage
            .from('portfolio')
            .upload(filePath, fileBuffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: true
            })

        if (uploadError) {
            console.error('Job upload error:', uploadError)
            return NextResponse.json({ error: `Erro no upload: ${uploadError.message}` }, { status: 500 })
        }

        // 3. Obtém a URL pública do arquivo
        const { data: publicData } = supabase.storage
            .from('portfolio')
            .getPublicUrl(filePath)

        return NextResponse.json({ success: true, publicUrl: publicData.publicUrl }, { status: 200 })
    } catch (error: any) {
        console.error('API job upload error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno no upload' }, { status: 500 })
    }
}
