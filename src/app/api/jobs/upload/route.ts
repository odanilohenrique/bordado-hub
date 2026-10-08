import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const userId = formData.get('userId') as string | null

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Upload com service client para contornar restrições de RLS no storage
        const originalName = file.name || 'imagem.jpg'
        const fileExt = originalName.split('.').pop() || 'jpg'
        const cleanName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const safeUserId = userId || 'general'
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
