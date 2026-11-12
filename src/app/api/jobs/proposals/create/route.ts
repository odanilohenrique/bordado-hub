import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { sendPushToUser } from '@/lib/pushNotifications'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { jobId, criadorId, amount, message, deadlineText } = body

        if (!jobId || !criadorId || !amount) {
            return NextResponse.json(
                { error: 'ID do pedido, programador e valor são obrigatórios.' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // 1. Fetch job to know the client and title
        const { data: job, error: jobErr } = await supabase
            .from('jobs')
            .select('id, title, cliente_id')
            .eq('id', jobId)
            .single()

        if (jobErr || !job) {
            return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
        }

        // 2. Fetch programmer name
        const { data: creator } = await supabase
            .from('users')
            .select('name')
            .eq('id', criadorId)
            .maybeSingle()

        const creatorName = creator?.name || 'Um programador'

        // 3. Insert proposal
        const { data: proposal, error: propErr } = await supabase
            .from('proposals')
            .insert([{
                job_id: jobId,
                criador_id: criadorId,
                amount: parseFloat(amount),
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

        // 4. In-app notification to client
        if (job.cliente_id) {
            await supabase.from('notifications').insert({
                user_id: job.cliente_id,
                type: 'nova_proposta',
                title: 'Nova proposta recebida!',
                message: `${creatorName} enviou uma proposta de R$ ${parseFloat(amount).toFixed(2)} para "${job.title || 'seu pedido'}"`,
                link_url: `/jobs/${jobId}`,
                is_read: false
            })

            // 5. Web Push Notification to client (even if site is closed!)
            sendPushToUser(job.cliente_id, {
                title: '💼 Nova Proposta Recebida!',
                body: `${creatorName} enviou uma proposta de R$ ${parseFloat(amount).toFixed(2)} para "${job.title || 'seu pedido'}". Toque para conferir!`,
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
