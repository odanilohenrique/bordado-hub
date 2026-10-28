import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { action, proposalId, counterAmount, counterMessage, senderId } = body

        if (!proposalId) {
            return NextResponse.json({ error: 'ID da proposta é obrigatório' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Fetch proposal and related job
        const { data: proposal, error: propErr } = await supabase
            .from('proposals')
            .select('*, jobs:job_id(*)')
            .eq('id', proposalId)
            .single()

        if (propErr || !proposal) {
            console.error('Error fetching proposal for counter-proposal:', propErr)
            return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
        }

        const job = Array.isArray(proposal.jobs) ? proposal.jobs[0] : proposal.jobs

        // 2. Handle Action: Accept Counter-Proposal (by Creator)
        if (action === 'accept') {
            const targetAmount = Number(proposal.counter_amount || proposal.amount)

            const { error: updErr } = await supabase
                .from('proposals')
                .update({
                    amount: targetAmount,
                    status: 'pendente',
                    counter_amount: null,
                    counter_message: null
                })
                .eq('id', proposalId)

            if (updErr) throw updErr

            // Add system message to chat
            try {
                await supabase.from('proposal_messages').insert({
                    proposal_id: proposalId,
                    sender_id: senderId || proposal.criador_id,
                    content: `[CONTRAOFERTA ACEITA] Aceitei sua contraproposta de R$ ${targetAmount.toFixed(2)}! O valor da proposta foi atualizado. Você já pode fechar o pedido!`
                })
            } catch (msgErr) {
                console.warn('Failed to insert accept message:', msgErr)
            }

            // Notify client (job owner)
            if (job?.cliente_id) {
                try {
                    await supabase.from('notifications').insert({
                        user_id: job.cliente_id,
                        type: 'contraproposta_aceita',
                        title: 'Contraproposta Aceita!',
                        message: `O programador aceitou sua oferta de R$ ${targetAmount.toFixed(2)} no pedido "${job.title || 'Bordado'}". Você já pode fechar e pagar!`,
                        link_url: `/jobs/${job.id}?chat=${proposalId}`
                    })
                } catch (notifErr) {
                    console.warn('Failed to insert accept notification:', notifErr)
                }
            }

            return NextResponse.json({ success: true, status: 'pendente', amount: targetAmount })
        } 
        
        // 3. Handle Action: Reject Counter-Proposal (by Creator)
        if (action === 'reject') {
            const { error: updErr } = await supabase
                .from('proposals')
                .update({
                    status: 'pendente',
                    counter_amount: null,
                    counter_message: null
                })
                .eq('id', proposalId)

            if (updErr) throw updErr

            // Add system message to chat
            try {
                await supabase.from('proposal_messages').insert({
                    proposal_id: proposalId,
                    sender_id: senderId || proposal.criador_id,
                    content: `A contraproposta foi recusada. O valor original de R$ ${Number(proposal.amount).toFixed(2)} foi mantido.`
                })
            } catch (msgErr) {
                console.warn('Failed to insert reject message:', msgErr)
            }

            // Notify client (job owner)
            if (job?.cliente_id) {
                try {
                    await supabase.from('notifications').insert({
                        user_id: job.cliente_id,
                        type: 'contraproposta_recusada',
                        title: 'Contraproposta Recusada',
                        message: `O programador recusou a contraproposta no pedido "${job.title || 'Bordado'}". O valor original de R$ ${Number(proposal.amount).toFixed(2)} foi mantido.`,
                        link_url: `/jobs/${job.id}?chat=${proposalId}`
                    })
                } catch (notifErr) {
                    console.warn('Failed to insert reject notification:', notifErr)
                }
            }

            return NextResponse.json({ success: true, status: 'pendente' })
        }

        // 3.1 Handle Action: Quick Deal (Accept & proceed to pay directly)
        if (action === 'quick_deal') {
            const rawAmount = String(counterAmount ?? '').replace(',', '.').trim()
            const finalAmount = parseFloat(rawAmount) || Number(proposal.amount)

            const { error: updErr } = await supabase
                .from('proposals')
                .update({
                    amount: finalAmount,
                    status: 'aceita',
                    counter_amount: null,
                    counter_message: null
                })
                .eq('id', proposalId)

            if (updErr) throw updErr

            try {
                await supabase.from('proposal_messages').insert({
                    proposal_id: proposalId,
                    sender_id: senderId || job?.cliente_id,
                    content: `[NEGÓCIO FECHADO] Valor acordado: R$ ${finalAmount.toFixed(2)}`
                })
            } catch (msgErr) {
                console.warn('Failed to insert quick deal message:', msgErr)
            }

            return NextResponse.json({ success: true, status: 'aceita', amount: finalAmount })
        }

        // 4. Handle Action: Create Counter-Proposal (by Client)
        const rawAmount = String(counterAmount ?? '').replace(',', '.').trim()
        const numericAmount = parseFloat(rawAmount)

        if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
            return NextResponse.json({ error: 'Informe um valor numérico válido para a contraproposta.' }, { status: 400 })
        }

        const { error: updErr } = await supabase
            .from('proposals')
            .update({
                status: 'contraproposta',
                counter_amount: numericAmount,
                counter_message: counterMessage || 'Contraproposta do cliente'
            })
            .eq('id', proposalId)

        if (updErr) {
            console.error('Error updating proposal with counter-proposal:', updErr)
            throw updErr
        }

        // Send notification message in chat
        try {
            await supabase.from('proposal_messages').insert({
                proposal_id: proposalId,
                sender_id: senderId || job?.cliente_id,
                content: `Fiz uma contraproposta oficial de R$ ${numericAmount.toFixed(2)}. Veja os detalhes e aceite para fecharmos!`
            })
        } catch (msgErr) {
            console.warn('Failed to insert counter message:', msgErr)
        }

        // Notify creator
        if (proposal.criador_id) {
            try {
                await supabase.from('notifications').insert({
                    user_id: proposal.criador_id,
                    type: 'contraproposta',
                    title: 'Contraproposta Recebida',
                    message: `O cliente fez uma contraproposta de R$ ${numericAmount.toFixed(2)} no pedido "${job?.title || 'Bordado'}".`,
                    link_url: `/jobs/${job?.id || proposal.job_id}?chat=${proposalId}`
                })
            } catch (notifErr) {
                console.warn('Failed to insert counter notification:', notifErr)
            }
        }

        return NextResponse.json({
            success: true,
            status: 'contraproposta',
            counter_amount: numericAmount
        })
    } catch (err: any) {
        console.error('Counter proposal API error:', err)
        return NextResponse.json({ error: err.message || 'Erro interno ao processar contraproposta.' }, { status: 500 })
    }
}
