import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { sendPushToUser } from '@/lib/pushNotifications'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { jobId, criadorId, amount, message, deadlineText } = body

        if (!jobId || !criadorId || amount === undefined || amount === null || String(amount).trim() === '') {
            return NextResponse.json(
                { error: 'ID do pedido, programador e valor são obrigatórios.' },
                { status: 400 }
            )
        }

        const numericAmount = parseFloat(String(amount).replace(',', '.').trim())
        if (!numericAmount || isNaN(numericAmount) || !Number.isFinite(numericAmount) || numericAmount <= 0) {
            return NextResponse.json({ error: 'Informe um valor válido para a proposta.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Fetch job, creator profile and existing active proposal in parallel
        const [
            { data: job, error: jobErr },
            { data: creator },
            { data: existingProposal }
        ] = await Promise.all([
            supabase
                .from('jobs')
                .select('id, title, cliente_id, status')
                .eq('id', jobId)
                .maybeSingle(),
            supabase
                .from('users')
                .select('id, name, supabase_user_id')
                .eq('id', criadorId)
                .maybeSingle(),
            supabase
                .from('proposals')
                .select('id, status')
                .eq('job_id', jobId)
                .eq('criador_id', criadorId)
                .neq('status', 'recusada')
                .limit(1)
                .maybeSingle()
        ])

        if (jobErr || !job) {
            return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
        }

        if (job.status && job.status !== 'aberto') {
            return NextResponse.json(
                { error: 'Este pedido não está mais aberto para novas propostas.' },
                { status: 400 }
            )
        }

        // Anti self-proposal
        if (
            job.cliente_id === criadorId ||
            (creator && (job.cliente_id === creator.id || job.cliente_id === creator.supabase_user_id))
        ) {
            return NextResponse.json(
                { error: 'Você não pode enviar proposta para o seu próprio pedido.' },
                { status: 400 }
            )
        }

        // Anti duplicate active proposal
        if (existingProposal) {
            return NextResponse.json(
                { error: 'Você já enviou uma proposta ativa para este pedido.' },
                { status: 409 }
            )
        }

        const creatorName = creator?.name || 'Um programador'

        // 2. Insert proposal
        const { data: proposal, error: propErr } = await supabase
            .from('proposals')
            .insert([{
                job_id: jobId,
                criador_id: criadorId,
                amount: numericAmount,
                message: message || '',
                deadline_text: deadlineText || '',
                status: 'pendente'
            }])
            .select()
            .single()

        if (propErr) {
            console.error('Erro ao inserir proposta:', propErr)
            return NextResponse.json({ error: propErr.message }, { status: 500 })
        }

        // 3. In-app notification to client
        if (job.cliente_id) {
            await supabase.from('notifications').insert({
                user_id: job.cliente_id,
                type: 'nova_proposta',
                title: 'Nova proposta recebida!',
                message: `${creatorName} enviou uma proposta de R$ ${numericAmount.toFixed(2)} para "${job.title || 'seu pedido'}"`,
                link_url: `/jobs/${jobId}`,
                is_read: false
            })

            // 4. Web Push Notification to client (even if site is closed!)
            sendPushToUser(job.cliente_id, {
                title: '💼 Nova Proposta Recebida!',
                body: `${creatorName} enviou uma proposta de R$ ${numericAmount.toFixed(2)} para "${job.title || 'seu pedido'}". Toque para conferir!`,
                tag: `job-proposal-${jobId}`,
                url: `/jobs/${jobId}`
            }).catch(console.warn)
        }

        return NextResponse.json({ success: true, proposal })
    } catch (err: any) {
        console.error('Erro ao criar proposta:', err)
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
    }
}
