import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const { jobId, clientId, notes, imageUrl } = await request.json()

        if (!jobId || !notes) {
            return NextResponse.json({ error: 'Descreva os detalhes do ajuste necessário.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Get Job & Accepted Proposal
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
        const updatePayload: any = {
            status: 'em_revisao'
        }
        
        // Try to update revision columns if they exist in table
        try {
            await supabase
                .from('jobs')
                .update({
                    status: 'em_revisao',
                    revision_notes: notes,
                    ...(imageUrl ? { revision_image_url: imageUrl } : {})
                })
                .eq('id', jobId)
        } catch {
            // Fallback if columns not created yet
            await supabase
                .from('jobs')
                .update({ status: 'em_revisao' })
                .eq('id', jobId)
        }

        // 4. Send notification to programmer
        if (proposal?.criador_id) {
            await supabase.from('notifications').insert({
                user_id: proposal.criador_id,
                type: 'solicitacao_ajuste',
                title: '🛠️ Ajuste Solicitado na Matriz',
                message: `O cliente testou a matriz do pedido "${job.title}" e solicitou um ajuste: "${notes.slice(0, 80)}${notes.length > 80 ? '...' : ''}"`,
                link_url: `/jobs/${job.id}`
            })

            // 5. Send message in negotiation chat for visibility
            await supabase.from('proposal_messages').insert({
                proposal_id: proposal.id,
                sender_id: clientId || job.cliente_id,
                message: `🛠️ [SOLICITAÇÃO DE AJUSTE/REVISÃO]\n\n${notes}${imageUrl ? `\n\nFoto do Teste/Defeito: ${imageUrl}` : ''}`
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error requesting revision:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
