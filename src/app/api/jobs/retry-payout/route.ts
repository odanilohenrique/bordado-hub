import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { transferPixToCreator } from '@/lib/asaas'

export async function POST(request: Request) {
    try {
        const adminSecret = process.env.ADMIN_SECRET || 'bordadohub_admin_secret_2026'
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null

        if (!token || token !== adminSecret.trim()) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { jobId } = body

        if (!jobId) {
            return NextResponse.json({ error: 'jobId é obrigatório' }, { status: 400 })
        }

        const supabase = createServiceClient()

        const { data: tx, error: txErr } = await supabase
            .from('transactions')
            .select('*, criador:criador_id(id, name, email, pix_key, pix_key_type), jobs(title)')
            .eq('job_id', jobId)
            .single()

        if (txErr || !tx) {
            return NextResponse.json({ error: 'Transação não encontrada para este job' }, { status: 404 })
        }

        const criador = tx.criador
        if (!criador?.pix_key || !criador?.pix_key_type) {
            return NextResponse.json({ error: 'Criador não possui chave PIX cadastrada' }, { status: 400 })
        }

        const amount = Number(tx.valor_liquido)
        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json({ error: 'Valor líquido inválido' }, { status: 400 })
        }

        // Execute PIX Transfer via Asaas
        console.log(`Disparando transferência PIX para ${criador.name} (Chave: ${criador.pix_key}, Tipo: ${criador.pix_key_type}, Valor: R$ ${amount})`)

        const transfer = await transferPixToCreator({
            amount,
            pixKey: criador.pix_key.trim(),
            pixKeyType: criador.pix_key_type,
            description: `BordadoHub - Pagamento pedido: ${tx.jobs?.title || 'Matriz'}`
        })

        // Update transaction in database
        await supabase
            .from('transactions')
            .update({
                status: 'liberado',
                asaas_transfer_id: transfer.transferId
            })
            .eq('id', tx.id)

        // Insert notification
        await supabase.from('notifications').insert({
            user_id: tx.criador_id,
            type: 'pagamento_liberado',
            title: 'Pagamento Liberado via PIX!',
            message: `O pagamento de R$ ${amount.toFixed(2)} foi transferido com sucesso para sua chave PIX (${criador.pix_key})! ID Asaas: ${transfer.transferId}`,
            link_url: `/jobs/${jobId}`
        })

        return NextResponse.json({
            success: true,
            transferId: transfer.transferId,
            status: transfer.status,
            amount,
            destinationKey: criador.pix_key
        })
    } catch (err: any) {
        console.error('Error in retry-payout:', err)
        return NextResponse.json({
            error: err.message || 'Erro ao processar transferência Asaas',
            details: err.stack
        }, { status: 500 })
    }
}
