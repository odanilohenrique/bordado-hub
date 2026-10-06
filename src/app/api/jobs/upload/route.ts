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

        // 1. Garante que o bucket 'portfolio' existe e é público
        const { data: buckets } = await supabase.storage.listBuckets()
        const bucketExists = buckets?.some(b => b.id === 'portfolio')

        if (!bucketExists) {
            const { error: bucketError } = await supabase.storage.createBucket('portfolio', {
                public: true,
                fileSizeLimit: 26214400, // 25MB
            })
            if (bucketError && !bucketError.message?.toLowerCase().includes('already exists')) {
                console.error('Bucket creation error:', bucketError)
            }
        }

        // 2. Upload com service client para contornar restrições de RLS no storage
        const fileExt = file.name.split('.').pop() || 'png'
        const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
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
