import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

/**
 * POST /api/jobs/[id]/cancel
 * 
 * Cancels a job (pedido). Only the job owner (cliente) can cancel.
 * Allowed only when the job is in a cancellable state:
 *   - "aberto" (receiving proposals, no payment yet)
 *   - "aguardando_pagamento" (waiting for payment, can still back out)
 * 
 * Actions performed:
 *   1. Validates ownership and cancellable status
 *   2. Cancels any pending Asaas charges to prevent stale "cobrança vencida" emails
 *   3. Updates all related proposals to "cancelada"
 *   4. Updates the job status to "cancelado"
 *   5. Sends notifications to programmers who had proposals
 *   6. Returns success response
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params
        if (!jobId) {
            return NextResponse.json({ error: 'Job ID obrigatório.' }, { status: 400 })
        }

        const body = await request.json()
        const { userId } = body

        if (!userId) {
            return NextResponse.json({ error: 'ID do usuário obrigatório.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Fetch the job
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('id, title, cliente_id, status')
            .eq('id', jobId)
            .single()

        if (jobError || !job) {
            return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
        }

        // 2. Verify ownership — only the client who created the job can cancel
        if (job.cliente_id !== userId) {
            return NextResponse.json({ 
                error: 'Apenas o dono do pedido pode cancelá-lo.' 
            }, { status: 403 })
        }

        // 3. Check if job is in a cancellable state
        const cancellableStatuses = ['aberto', 'aguardando_pagamento']
        if (!cancellableStatuses.includes(job.status)) {
            return NextResponse.json({ 
                error: `Não é possível cancelar um pedido com status "${job.status}". Apenas pedidos abertos ou aguardando pagamento podem ser cancelados.` 
            }, { status: 400 })
        }

        // 4. Cancel any pending Asaas charges to avoid stale "cobrança vencida" emails
        const { data: pendingTransactions } = await supabase
            .from('transactions')
            .select('id, asaas_payment_id, status')
            .eq('job_id', jobId)
            .in('status', ['pendente', 'aguardando'])

        if (pendingTransactions && pendingTransactions.length > 0) {
            for (const tx of pendingTransactions) {
                // Cancel Asaas charge if exists
                if (tx.asaas_payment_id) {
                    try {
                        const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3'
                        const ASAAS_API_KEY = process.env.ASAAS_API_KEY || ''
                        
                        if (ASAAS_API_KEY) {
                            await fetch(`${ASAAS_API_URL}/payments/${tx.asaas_payment_id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'access_token': ASAAS_API_KEY.trim().replace(/^['"]|['"]$/g, ''),
                                },
                            })
                            console.log(`✅ Asaas charge ${tx.asaas_payment_id} cancelled for job ${jobId}`)
                        }
                    } catch (asaasErr) {
                        // Log but don't block cancellation — the charge will expire naturally
                        console.warn(`⚠️ Failed to cancel Asaas charge ${tx.asaas_payment_id}:`, asaasErr)
                    }
                }

                // Update transaction status to cancelled
                await supabase
                    .from('transactions')
                    .update({ status: 'cancelado' })
                    .eq('id', tx.id)
            }
        }

        // 5. Fetch proposals to notify programmers
        const { data: proposals } = await supabase
            .from('proposals')
            .select('id, criador_id, status')
            .eq('job_id', jobId)

        // Update all active proposals to cancelled
        if (proposals && proposals.length > 0) {
            const activeProposalIds = proposals
                .filter(p => !['cancelada', 'recusada'].includes(p.status))
                .map(p => p.id)

            if (activeProposalIds.length > 0) {
                await supabase
                    .from('proposals')
                    .update({ status: 'cancelada' })
                    .in('id', activeProposalIds)
            }

            // Send notifications to all programmers who had proposals
            const uniqueCreatorIds = [...new Set(
                proposals
                    .filter(p => p.criador_id)
                    .map(p => p.criador_id)
            )]

            if (uniqueCreatorIds.length > 0) {
                const notifications = uniqueCreatorIds.map(creatorId => ({
                    user_id: creatorId,
                    type: 'pedido_cancelado',
                    title: 'Pedido Cancelado pelo Cliente',
                    message: `O pedido "${job.title}" foi cancelado pelo cliente. Todas as propostas foram encerradas.`,
                    link_url: `/pedidos`,
                    is_read: false,
                }))

                await supabase.from('notifications').insert(notifications)
            }
        }

        // 6. Update job status to cancelled
        const { error: updateError } = await supabase
            .from('jobs')
            .update({ status: 'cancelado' })
            .eq('id', jobId)

        if (updateError) {
            console.error('Error updating job status:', updateError)
            return NextResponse.json({ 
                error: 'Erro ao atualizar o status do pedido.' 
            }, { status: 500 })
        }

        console.log(`✅ Job ${jobId} ("${job.title}") cancelled by user ${userId}`)

        return NextResponse.json({ 
            success: true, 
            message: 'Pedido cancelado com sucesso.' 
        })
    } catch (err: any) {
        console.error('Error in /api/jobs/[id]/cancel:', err)
        return NextResponse.json({ 
            error: err.message || 'Erro interno do servidor.' 
        }, { status: 500 })
    }
}
