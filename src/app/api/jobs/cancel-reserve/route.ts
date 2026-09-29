import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { proposalId, cancelledBy, reason } = body

        if (!proposalId || !cancelledBy) {
            return NextResponse.json({ error: 'Parâmetros incompletos.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Fetch proposal
        const { data: proposal, error: propError } = await supabase
            .from('proposals')
            .select('id, job_id, criador_id, amount, status')
            .eq('id', proposalId)
            .single()

        if (propError || !proposal) {
            return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 })
        }

        // 2. Fetch job
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('id, title, cliente_id, status')
            .eq('id', proposal.job_id)
            .single()

        if (jobError || !job) {
            return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
        }

        // Safety: Cannot cancel reservation if job is already in progress (paid)
        if (job.status !== 'aberto') {
            return NextResponse.json({ 
                error: 'Não é possível cancelar uma reserva de um pedido que já está em produção ou finalizado.' 
            }, { status: 400 })
        }

        // 3. Update proposal status
        // If cancelled by programmer: proposal is marked as 'recusada' so programmer is free and job returns to open market
        // If cancelled by client: proposal returns to 'pendente' so client can reconsider or choose another
        const newStatus = cancelledBy === 'programmer' ? 'recusada' : 'pendente'

        const { error: updateError } = await supabase
            .from('proposals')
            .update({ status: newStatus })
            .eq('id', proposalId)

        if (updateError) {
            return NextResponse.json({ error: 'Erro ao atualizar status da proposta.' }, { status: 500 })
        }

        // Cancel any pending transactions for this proposal
        await supabase
            .from('transactions')
            .update({ status: 'cancelado' })
            .eq('proposal_id', proposalId)
            .eq('status', 'pendente')

        // 4. Send chat message
        const chatContent = cancelledBy === 'programmer'
            ? `⚠️ O programador cancelou a espera por falta de confirmação do pagamento. O pedido foi liberado e voltou a aceitar propostas.${reason ? ` Motivo: ${reason}` : ''}`
            : `ℹ️ O cliente cancelou o processo de contratação desta proposta. O pedido voltou a ficar disponível para negociação.`

        await supabase.from('proposal_messages').insert({
            proposal_id: proposalId,
            sender_id: cancelledBy === 'programmer' ? proposal.criador_id : job.cliente_id,
            content: chatContent,
        })

        // 5. Send notification to the other party
        const targetUserId = cancelledBy === 'programmer' ? job.cliente_id : proposal.criador_id
        const notifTitle = cancelledBy === 'programmer'
            ? '⚠️ Reserva Cancelada por Falta de Pagamento'
            : 'ℹ️ Contratação Cancelada pelo Comprador'
        const notifMessage = cancelledBy === 'programmer'
            ? `O programador liberou o pedido "${job.title}" pois o pagamento não foi confirmado a tempo.`
            : `O cliente cancelou o checkout do pedido "${job.title}". A proposta retornou ao status pendente.`

        await supabase.from('notifications').insert({
            user_id: targetUserId,
            type: 'cancelamento_reserva',
            title: notifTitle,
            message: notifMessage,
            link_url: `/jobs/${job.id}`,
            is_read: false,
        })

        return NextResponse.json({ success: true, newStatus })
    } catch (err: any) {
        console.error('Error in cancel-reserve:', err)
        return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 })
    }
}
