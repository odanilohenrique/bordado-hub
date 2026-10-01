import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const { jobId, deliveryUrls, deliveryNotes } = await request.json()

        if (!jobId || !deliveryUrls) {
            return NextResponse.json({ error: 'Faltam dados da entrega.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Verify job
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('id, cliente_id, title, status, revision_notes')
            .eq('id', jobId)
            .single()

        if (jobError || !job) {
            return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
        }

        const isRevision = job.status === 'em_revisao' || Boolean(job.revision_notes)

        // Update Job Status
        const { error: updateError } = await supabase
            .from('jobs')
            .update({
                status: 'entregue',
                delivery_url: deliveryUrls,
                delivery_notes: deliveryNotes,
                delivered_at: new Date().toISOString()
            })
            .eq('id', jobId)

        if (updateError) {
            console.error('Update job error:', updateError)
            return NextResponse.json({ error: 'Falha ao atualizar o pedido.' }, { status: 500 })
        }

        // Notify client
        await supabase.from('notifications').insert({
            user_id: job.cliente_id,
            type: isRevision ? 'matriz_revisada_entregue' : 'matriz_entregue',
            title: isRevision ? 'Matriz Revisada Entregue!' : 'Matriz Entregue!',
            message: isRevision
                ? `O programador enviou a versão corrigida da matriz do pedido "${job.title}". Baixe e teste o arquivo na sua máquina!`
                : `O programador entregou os arquivos do pedido "${job.title}". Você tem até 24 horas para testar o bordado ou solicitar ajustes!`,
            link_url: `/jobs/${job.id}`
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error delivering matrix:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
