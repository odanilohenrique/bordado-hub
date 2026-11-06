import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

/**
 * POST /api/jobs/[id]/cancel
 * 
 * Cancela e EXCLUI definitivamente um pedido do banco de dados.
 * Apenas o dono do pedido (cliente) pode executar essa ação.
 * Permitido apenas para pedidos em estados não-iniciados ou cancelados:
 *   - "aberto"
 *   - "aguardando_pagamento"
 *   - "cancelado"
 * 
 * Ações executadas:
 *   1. Valida se o usuário é o dono do pedido
 *   2. Cancela cobranças Asaas pendentes no gateway para evitar e-mails de vencimento
 *   3. Notifica programadores que enviaram propostas
 *   4. Exclui em cascata: proposal_messages, proposals, transactions, reviews, notifications
 *   5. Remove permanentemente o registro da tabela `jobs`
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
            .maybeSingle()

        if (jobError) {
            console.error('Erro ao buscar pedido para cancelamento:', jobError)
            return NextResponse.json({ error: jobError.message }, { status: 500 })
        }

        if (!job) {
            // Se já não existe no banco, considera excluído com sucesso
            return NextResponse.json({ 
                success: true, 
                message: 'Pedido já foi removido.' 
            })
        }

        // 2. Verify ownership — only the client who created the job can cancel/delete
        if (job.cliente_id !== userId) {
            return NextResponse.json({ 
                error: 'Apenas o dono do pedido pode cancelá-lo ou excluí-lo.' 
            }, { status: 403 })
        }

        // 3. Check if job is in a deletable/cancellable state
        const cancellableStatuses = ['aberto', 'aguardando_pagamento', 'cancelado']
        if (!cancellableStatuses.includes(job.status)) {
            return NextResponse.json({ 
                error: `Não é possível excluir um pedido com status "${job.status}". Apenas pedidos em aberto, aguardando pagamento ou cancelados podem ser excluídos.` 
            }, { status: 400 })
        }

        // 4. Cancel any pending Asaas charges in gateway to avoid stale "cobrança vencida" emails
        const { data: pendingTransactions } = await supabase
            .from('transactions')
            .select('id, asaas_payment_id, status')
            .eq('job_id', jobId)

        if (pendingTransactions && pendingTransactions.length > 0) {
            for (const tx of pendingTransactions) {
                if (tx.asaas_payment_id && tx.status !== 'pago') {
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
                            console.log(`✅ Cobrança Asaas ${tx.asaas_payment_id} cancelada para o pedido ${jobId}`)
                        }
                    } catch (asaasErr) {
                        console.warn(`⚠️ Falha ao cancelar cobrança Asaas ${tx.asaas_payment_id}:`, asaasErr)
                    }
                }
            }
        }

        // 5. Fetch proposals
        const { data: proposals } = await supabase
            .from('proposals')
            .select('id, criador_id, status')
            .eq('job_id', jobId)

        // Se houver propostas ativas e o job ainda estava aberto/aguardando, notifica os criadores
        if (proposals && proposals.length > 0 && job.status !== 'cancelado') {
            const uniqueCreatorIds = [...new Set(
                proposals
                    .filter(p => p.criador_id && p.status !== 'recusada' && p.status !== 'cancelada')
                    .map(p => p.criador_id)
            )]

            if (uniqueCreatorIds.length > 0) {
                const notifications = uniqueCreatorIds.map(creatorId => ({
                    user_id: creatorId,
                    type: 'pedido_cancelado',
                    title: 'Pedido Cancelado pelo Cliente',
                    message: `O pedido "${job.title}" foi cancelado pelo cliente e removido da plataforma.`,
                    link_url: `/pedidos`,
                    is_read: false,
                }))

                await supabase.from('notifications').insert(notifications)
            }
        }

        // 6. Delete related data in order to respect foreign key constraints
        const proposalIds = (proposals || []).map(p => p.id)
        if (proposalIds.length > 0) {
            // Delete messages from proposals
            await supabase
                .from('proposal_messages')
                .delete()
                .in('proposal_id', proposalIds)

            // Delete proposals
            await supabase
                .from('proposals')
                .delete()
                .eq('job_id', jobId)
        }

        // Delete transactions for this job
        await supabase
            .from('transactions')
            .delete()
            .eq('job_id', jobId)

        // Delete reviews if any
        await supabase
            .from('reviews')
            .delete()
            .eq('job_id', jobId)

        // Clean up notifications pointing to this job
        await supabase
            .from('notifications')
            .delete()
            .like('link_url', `%${jobId}%`)

        // 7. Delete the job record from database
        const { error: deleteJobError } = await supabase
            .from('jobs')
            .delete()
            .eq('id', jobId)

        if (deleteJobError) {
            console.error('Erro ao excluir pedido do banco:', deleteJobError)
            return NextResponse.json({ 
                error: 'Erro ao remover pedido do banco de dados.' 
            }, { status: 500 })
        }

        console.log(`✅ Pedido ${jobId} ("${job.title}") EXCLUÍDO do banco de dados pelo usuário ${userId}`)

        return NextResponse.json({ 
            success: true, 
            message: 'Pedido excluído permanentemente do banco de dados.' 
        })
    } catch (err: any) {
        console.error('Erro em POST /api/jobs/[id]/cancel:', err)
        return NextResponse.json({ 
            error: err.message || 'Erro interno do servidor.' 
        }, { status: 500 })
    }
}
