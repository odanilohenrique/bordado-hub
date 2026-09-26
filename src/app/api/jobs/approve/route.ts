import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'
import { transferPixToCreator } from '@/lib/asaas'

export async function POST(request: Request) {
    try {
        const { jobId, reviewerId, revieweeId, ratingMatrix, ratingService, comment } = await request.json()

        if (!jobId || !revieweeId) {
            return NextResponse.json({ error: 'Faltam dados da avaliação.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Insert Review
        const { error: reviewError } = await supabase
            .from('reviews')
            .insert([{
                job_id: jobId,
                reviewer_id: reviewerId,
                reviewee_id: revieweeId,
                rating_matrix: ratingMatrix,
                rating_service: ratingService,
                comment,
                rating: Math.round((ratingMatrix + ratingService) / 2)
            }])

        if (reviewError) {
            console.error('Review insert error:', reviewError)
            return NextResponse.json({ error: 'Falha ao salvar avaliação.' }, { status: 500 })
        }

        // 2. Update Job Status to finalizado
        await supabase
            .from('jobs')
            .update({ status: 'finalizado' })
            .eq('id', jobId)

        // 3. Get Transaction & Programmer Details for Payout
        const { data: tx } = await supabase
            .from('transactions')
            .select('*')
            .eq('job_id', jobId)
            .single()

        const { data: programmer } = await supabase
            .from('users')
            .select('pix_key, pix_key_type')
            .eq('id', revieweeId)
            .single()

        // 4. Execute Asaas Payout
        if (tx && tx.status === 'pago' && programmer?.pix_key && programmer?.pix_key_type) {
            try {
                const transfer = await transferPixToCreator({
                    amount: tx.valor_liquido,
                    pixKey: programmer.pix_key,
                    pixKeyType: programmer.pix_key_type as any,
                    description: `Pagamento BordadoHub - Job ${jobId}`
                })

                await supabase.from('transactions').update({
                    status: 'liberado',
                    asaas_transfer_id: transfer.transferId
                }).eq('id', tx.id)
                
            } catch (payoutError) {
                console.error('Asaas Payout Error:', payoutError)
                // We don't block the review success if the payout fails, but we should log it or alert admin
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error approving matrix:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
