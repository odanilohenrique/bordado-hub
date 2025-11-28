import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

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

        const supabase = createServiceClient()

        // Upload file to Supabase Storage
        const fileName = `${id}_${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
