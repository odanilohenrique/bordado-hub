import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const { proposalId, senderId, content } = await request.json()

        if (!proposalId || !senderId || !content?.trim()) {
            return NextResponse.json({ error: 'Proposta, remetente e mensagem são obrigatórios.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Insert message into proposal_messages
        const { data: messageData, error: msgError } = await supabase
            .from('proposal_messages')
            .insert({
                proposal_id: proposalId,
                sender_id: senderId,
                content: content.trim()
            })
            .select('*, users:sender_id(name)')
            .single()

        if (msgError) {
            console.error('Chat send insert error:', msgError)
            return NextResponse.json({ error: 'Erro ao enviar mensagem: ' + msgError.message }, { status: 500 })
        }

        // 2. Fetch proposal and job details to find recipient
        const { data: proposal } = await supabase
            .from('proposals')
            .select('id, criador_id, job_id, jobs(id, title, cliente_id)')
            .eq('id', proposalId)
            .single()

        if (proposal) {
            const jobData = Array.isArray(proposal.jobs) ? proposal.jobs[0] : proposal.jobs
            const recipientId = senderId === proposal.criador_id ? jobData?.cliente_id : proposal.criador_id
            const senderName = messageData?.users?.name || 'Alguém'
            const isAdjustment = content.toLowerCase().includes('ajuste') || content.toLowerCase().includes('correção') || content.toLowerCase().includes('garantia')

            if (recipientId) {
                // 3. Create high-visibility notification for the recipient
                await supabase.from('notifications').insert({
                    user_id: recipientId,
                    type: isAdjustment ? 'solicitacao_ajuste' : 'nova_mensagem',
                    title: isAdjustment ? '🛠️ Ajuste Solicitado na Matriz!' : `💬 Nova Mensagem de ${senderName}`,
                    message: content.length > 90 ? `${content.slice(0, 90)}...` : content,
                    link_url: `/jobs/${proposal.job_id}`
                })
            }
        }

        return NextResponse.json({ success: true, message: messageData }, { status: 200 })
    } catch (error: any) {
        console.error('Chat send route error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
