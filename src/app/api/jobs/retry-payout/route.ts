import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabaseClient'
import { transferPixToCreator, asaasRawGet } from '@/lib/asaas'

function isAuthorizedAdmin(request: Request): boolean {
    const adminSecret = (process.env.ADMIN_SECRET || 'bordadohub_admin_secret_2026').trim()
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false
    }
    const token = authHeader.substring(7).trim()
    if (!token || !adminSecret) {
        return false
    }
    const tokenBuf = Buffer.from(token, 'utf8')
    const secretBuf = Buffer.from(adminSecret, 'utf8')
    if (tokenBuf.length !== secretBuf.length) {
        return false
    }
    return crypto.timingSafeEqual(tokenBuf, secretBuf)
}

function maskPixKey(key: string): string {
    return key.length <= 4 ? '****' : `***${key.slice(-4)}`
}

export async function GET(request: Request) {
    try {
        if (!isAuthorizedAdmin(request)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const endpoint = searchParams.get('endpoint') || '/payments?limit=10'

        const result = await asaasRawGet(endpoint)
        return NextResponse.json({ success: true, result })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        if (!isAuthorizedAdmin(request)) {
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

        if (tx.status === 'liberado' || tx.asaas_transfer_id) {
            return NextResponse.json(
                { error: 'Este pagamento já foi liberado anteriormente.', transferId: tx.asaas_transfer_id || null },
                { status: 409 }
            )
        }
        if (tx.status === 'processando_liberacao') {
            return NextResponse.json(
                { error: 'A liberação deste pagamento já está em processamento.' },
                { status: 409 }
            )
        }
        if (tx.status !== 'pago') {
            return NextResponse.json(
                { error: `Transação com status "${tx.status}" não está apta para liberação.` },
                { status: 400 }
            )
        }

        const criador = tx.criador
        if (!criador?.pix_key || !criador?.pix_key_type) {
            return NextResponse.json({ error: 'Criador não possui chave PIX cadastrada' }, { status: 400 })
        }

        const amount = Number(tx.valor_liquido)
        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json({ error: 'Valor líquido inválido' }, { status: 400 })
        }

        const { data: lockedTx } = await supabase
            .from('transactions')
            .update({ status: 'processando_liberacao' })
            .eq('id', tx.id)
            .eq('status', 'pago')
            .select('id')
            .maybeSingle()

        if (!lockedTx) {
            return NextResponse.json(
                { error: 'Transação já está sendo processada ou já foi liberada.' },
                { status: 409 }
            )
        }

        const cleanPixKey = criador.pix_key.trim()
        const maskedPixKey = maskPixKey(cleanPixKey)

        // Execute PIX Transfer via Asaas
        console.log(`Disparando transferência PIX para ${criador.name} (Chave: ${maskedPixKey}, Tipo: ${criador.pix_key_type}, Valor: R$ ${amount})`)

        let transfer: Awaited<ReturnType<typeof transferPixToCreator>>
        try {
            transfer = await transferPixToCreator({
                amount,
                pixKey: cleanPixKey,
                pixKeyType: criador.pix_key_type,
                description: `BordadoHub - Pagamento pedido: ${tx.jobs?.title || 'Matriz'}`
            })
        } catch (transferErr) {
            try {
                await supabase
                    .from('transactions')
                    .update({ status: 'pago' })
                    .eq('id', tx.id)
            } catch (revertErr) {
                console.error('Erro ao reverter status da transação para pago:', revertErr)
            }
            throw transferErr
        }

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
            message: `O pagamento de R$ ${amount.toFixed(2)} foi transferido com sucesso para sua chave PIX (${maskedPixKey})! ID Asaas: ${transfer.transferId}`,
            link_url: `/jobs/${jobId}`
        })

        return NextResponse.json({
            success: true,
            transferId: transfer.transferId,
            status: transfer.status,
            amount,
            destinationKey: maskedPixKey
        })
    } catch (err: any) {
        console.error('Error in retry-payout:', err)
        return NextResponse.json({
            error: err.message || 'Erro ao processar transferência Asaas'
        }, { status: 500 })
    }
}
