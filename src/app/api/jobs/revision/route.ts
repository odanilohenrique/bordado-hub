import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        let jobId = ''
        let clientId = ''
        let notes = ''
        let imageUrl = ''

        const contentType = request.headers.get('content-type') || ''
        const supabase = createServiceClient()

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()
            jobId = (formData.get('jobId') as string) || ''
            clientId = (formData.get('clientId') as string) || ''
            notes = (formData.get('notes') as string) || ''
            const file = formData.get('photo') as File | null

            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop() || 'jpg'
                const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
                const path = `revisions/${jobId}_${safeName}`
                const buffer = Buffer.from(await file.arrayBuffer())

                const { error: uploadError } = await supabase.storage
                    .from('job-deliveries')
                    .upload(path, buffer, {
                        contentType: file.type || 'image/jpeg',
                        upsert: true
                    })

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('job-deliveries')
                        .getPublicUrl(path)
                    imageUrl = publicUrl
                } else {
                    console.error('Revision photo upload error:', uploadError)
                }
            }
        } else {
            const body = await request.json()
            jobId = body.jobId
            clientId = body.clientId
            notes = body.notes
            imageUrl = body.imageUrl
        }

        if (!jobId || !notes) {
            return NextResponse.json({ error: 'Descreva os detalhes do ajuste necessário.' }, { status: 400 })
        }

        // 1. Get Job
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('id, title, cliente_id')
            .eq('id', jobId)
            .single()

        if (jobError || !job) {
            return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
        }

        // 2. Find accepted proposal to get programmer ID
        const { data: proposal } = await supabase
            .from('proposals')
            .select('id, criador_id')
            .eq('job_id', jobId)
            .eq('status', 'aceita')
            .single()

        // 3. Update Job status to em_revisao
        await supabase
            .from('jobs')
            .update({
                status: 'em_revisao',
                revision_notes: notes,
                ...(imageUrl ? { revision_image_url: imageUrl } : {})
            })
            .eq('id', jobId)

        // 4. Send notification to programmer
        if (proposal?.criador_id) {
            await supabase.from('notifications').insert({
                user_id: proposal.criador_id,
                type: 'solicitacao_ajuste',
                title: 'Ajuste Solicitado na Matriz',
                message: `O cliente testou a matriz do pedido "${job.title}" e solicitou um ajuste: "${notes.slice(0, 80)}${notes.length > 80 ? '...' : ''}"`,
                link_url: `/jobs/${job.id}?chat=${proposal.id}`
            })

            // 5. Send message in negotiation chat for visibility
            await supabase.from('proposal_messages').insert({
                proposal_id: proposal.id,
                sender_id: clientId || job.cliente_id,
                content: `[SOLICITAÇÃO DE AJUSTE NA MÁQUINA]\n\n${notes}`,
                attachment_url: imageUrl || null
            })
        }

        return NextResponse.json({ success: true, imageUrl })
    } catch (error: any) {
        console.error('Error requesting revision:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
