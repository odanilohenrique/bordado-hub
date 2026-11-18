import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

function isSafeHttpUrl(value: unknown): boolean {
    if (typeof value !== 'string') return false
    const trimmed = value.trim()
    if (!trimmed) return false
    try {
        const parsed = new URL(trimmed)
        return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch {
        return false
    }
}

function validateDeliveryUrls(raw: unknown): boolean {
    if (!raw) return false

    let entries: unknown[] = []
    if (Array.isArray(raw)) {
        entries = raw
    } else if (typeof raw === 'string') {
        const trimmed = raw.trim()
        if (!trimmed) return false
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed)
                if (!Array.isArray(parsed)) return false
                entries = parsed
            } catch {
                return false
            }
        } else {
            entries = trimmed
                .split(/[\n,]+/)
                .map(s => s.trim())
                .filter(Boolean)
        }
    } else {
        return false
    }

    if (entries.length === 0) return false
    return entries.every(isSafeHttpUrl)
}

export async function POST(request: Request) {
    try {
        const { jobId, deliveryUrls, deliveryNotes } = await request.json()

        const supabase = createServiceClient()

        // Verify job
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('id, cliente_id, title, status, revision_notes, delivery_url')
            .eq('id', jobId)
            .single()

        if (jobError || !job) {
            return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
        }

        const targetUrls = deliveryUrls || job.delivery_url
        if (!targetUrls) {
            return NextResponse.json({ error: 'Faltam dados da entrega.' }, { status: 400 })
        }

        if (!validateDeliveryUrls(targetUrls)) {
            return NextResponse.json({ error: 'URLs de entrega inválidas. Use apenas links http:// ou https://.' }, { status: 400 })
        }

        const isRevision = job.status === 'em_revisao' || Boolean(job.revision_notes)

        // Update Job Status
        const { error: updateError } = await supabase
            .from('jobs')
            .update({
                status: 'entregue',
                delivery_url: targetUrls,
                delivery_notes: deliveryNotes || (isRevision ? 'Matriz revisada e entregue.' : 'Matriz entregue.'),
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
