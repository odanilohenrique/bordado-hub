import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

const BLOCKED_UPLOAD_EXTS = new Set([
    'exe', 'bat', 'cmd', 'com', 'scr', 'msi', 'sh', 'bash', 'ps1', 'vbs',
    'js', 'mjs', 'cjs', 'php', 'py', 'rb', 'pl', 'jar', 'apk', 'dll', 'so', 'dylib',
    'html', 'htm', 'svg'
])
const MAX_DELIVER_BYTES = 30 * 1024 * 1024 // 30 MB

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const formData = await request.formData()
        const file = formData.get('file') as File
        const message = formData.get('message') as string
        const criadorId = formData.get('criadorId') as string

        if (!file || !criadorId) {
            return NextResponse.json({ error: 'Missing file or creator ID' }, { status: 400 })
        }

        if (file.size > MAX_DELIVER_BYTES) {
            return NextResponse.json({ error: 'Arquivo excede o limite máximo de 30 MB.' }, { status: 400 })
        }

        const fileExt = (file.name || '').split('.').pop()?.toLowerCase() || ''
        if (BLOCKED_UPLOAD_EXTS.has(fileExt)) {
            return NextResponse.json({ error: 'Tipo de arquivo bloqueado por segurança.' }, { status: 400 })
        }

        const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '_')
        const supabase = createServiceClient()

        // Upload file to Supabase Storage
        const fileName = `${id}_${Date.now()}_${cleanFileName}`
        const { error: uploadError } = await supabase.storage
            .from('deliveries')
            .upload(fileName, file)

        if (uploadError) {
            return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('deliveries')
            .getPublicUrl(fileName)

        // Create delivery record
        const { data: delivery, error: deliveryError } = await supabase
            .from('deliveries')
            .insert([
                {
                    job_id: id,
                    criador_id: criadorId,
                    file_url: publicUrl,
                    message: message || '',
                },
            ])
            .select()
            .single()

        if (deliveryError) {
            return NextResponse.json({ error: deliveryError.message }, { status: 500 })
        }

        // Update job status
        await supabase
            .from('jobs')
            .update({ status: 'entregue' })
            .eq('id', id)

        return NextResponse.json({ success: true, delivery })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
