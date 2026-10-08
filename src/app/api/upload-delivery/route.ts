import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const bucket = formData.get('bucket') as string | null
        const path = formData.get('path') as string | null

        if (!file || !bucket || !path) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: file, bucket, path' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Convert File to Buffer for server-side upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, buffer, {
                upsert: true,
                contentType: file.type || 'application/octet-stream'
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
            .getPublicUrl(path)

        return NextResponse.json({ success: true, publicUrl })
    } catch (error: any) {
        console.error('Upload delivery error:', error)
        return NextResponse.json(
            { error: error.message || 'Erro interno no upload' },
            { status: 500 }
        )
    }
}
