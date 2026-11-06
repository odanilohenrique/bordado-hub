import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params
        if (!jobId) {
            return NextResponse.json({ error: 'Job ID obrigatório.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Fetch job with client info
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('*, users!jobs_cliente_id_fkey(name, avatar_url)')
            .eq('id', jobId)
            .maybeSingle()

        if (jobError) {
            console.error('API Error fetching job:', jobError)
            return NextResponse.json({ error: jobError.message }, { status: 500 })
        }

        if (!job) {
            return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
        }

        // 2. Fetch proposals with creator details
        const { data: proposals, error: proposalsError } = await supabase
            .from('proposals')
            .select(`
                *,
                users:criador_id (
                    id,
                    name,
                    avatar_url,
                    rating
                )
            `)
            .eq('job_id', jobId)
            .order('created_at', { ascending: false })

        if (proposalsError) {
            console.error('API Error fetching proposals:', proposalsError)
        }

        // 3. Fetch review & transaction if job is finalized
        let review = null
        let transaction = null
        if (job.status === 'finalizado') {
            const [{ data: rev }, { data: tx }] = await Promise.all([
                supabase
                    .from('reviews')
                    .select('*')
                    .eq('job_id', jobId)
                    .maybeSingle(),
                supabase
                    .from('transactions')
                    .select('metodo, status')
                    .eq('job_id', jobId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            ])
            review = rev || null
            transaction = tx || null
        }

        // 4. Unread messages count for proposals
        const unreadCounts: Record<string, number> = {}
        const proposalList = proposals || []
        if (proposalList.length > 0) {
            const proposalIds = proposalList.map((p: any) => p.id)
            const { data: messages } = await supabase
                .from('proposal_messages')
                .select('proposal_id, sender_id, read')
                .in('proposal_id', proposalIds)
                .eq('read', false)

            if (messages) {
                messages.forEach((msg: any) => {
                    unreadCounts[msg.proposal_id] = (unreadCounts[msg.proposal_id] || 0) + 1
                })
            }
        }

        return NextResponse.json({
            job,
            proposals: proposalList,
            review,
            transaction,
            unreadCounts
        }, { status: 200 })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        console.error('Server error in /api/jobs/[id]:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params
        if (!jobId) {
            return NextResponse.json({ error: 'Job ID obrigatório.' }, { status: 400 })
        }

        let userId = ''
        try {
            const body = await request.json()
            userId = body?.userId || ''
        } catch (_) {
            const url = new URL(request.url)
            userId = url.searchParams.get('userId') || ''
        }

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
            return NextResponse.json({ error: jobError.message }, { status: 500 })
        }

        if (!job) {
            return NextResponse.json({ success: true, message: 'Pedido já foi removido.' })
        }

        // 2. Ownership check
        if (job.cliente_id !== userId) {
            return NextResponse.json({ error: 'Apenas o dono do pedido pode excluí-lo.' }, { status: 403 })
        }

        // 3. Status check
        const cancellableStatuses = ['aberto', 'aguardando_pagamento', 'cancelado']
        if (!cancellableStatuses.includes(job.status)) {
            return NextResponse.json({ 
                error: `Não é possível excluir um pedido com status "${job.status}".` 
            }, { status: 400 })
        }

        // 4. Cancel Asaas pending charges if any
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
                        }
                    } catch (asaasErr) {
                        console.warn('Erro ao cancelar Asaas charge:', asaasErr)
                    }
                }
            }
        }

        // 5. Delete dependent records
        const { data: proposals } = await supabase
            .from('proposals')
            .select('id')
            .eq('job_id', jobId)

        const proposalIds = (proposals || []).map(p => p.id)
        if (proposalIds.length > 0) {
            await supabase.from('proposal_messages').delete().in('proposal_id', proposalIds)
            await supabase.from('proposals').delete().eq('job_id', jobId)
        }

        await supabase.from('transactions').delete().eq('job_id', jobId)
        await supabase.from('reviews').delete().eq('job_id', jobId)
        await supabase.from('notifications').delete().like('link_url', `%${jobId}%`)

        // 6. Delete the job
        const { error: deleteError } = await supabase.from('jobs').delete().eq('id', jobId)
        if (deleteError) {
            return NextResponse.json({ error: 'Erro ao excluir pedido.' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Pedido excluído permanentemente.' })
    } catch (err: any) {
        console.error('Server error in DELETE /api/jobs/[id]:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
