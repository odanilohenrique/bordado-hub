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

        // 1. Insert or Update Review
        const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('job_id', jobId)
            .maybeSingle()

        let reviewError: any = null
        if (existingReview) {
            const { error: updErr } = await supabase
                .from('reviews')
                .update({
                    rating_matrix: ratingMatrix,
                    rating_service: ratingService,
                    comment,
                    rating: Math.round((ratingMatrix + ratingService) / 2)
                })
                .eq('id', existingReview.id)
            reviewError = updErr
        } else {
            const { error: insErr } = await supabase
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
            reviewError = insErr
        }

        if (reviewError) {
            console.error('Review save error:', reviewError)
            // If FK constraint error, try to recreate table without FK
            if (reviewError.code === '23503') {
                return NextResponse.json({ 
                    error: 'Tabela de reviews precisa ser recriada. Execute o SQL em sql/create_reviews_table.sql no Supabase.',
                    detail: reviewError.details 
                }, { status: 500 })
            }
            return NextResponse.json({ error: 'Falha ao salvar avaliação: ' + reviewError.message }, { status: 500 })
        }

        // Calculate and update user's overall average rating and reviews count
        try {
            const { data: allUserReviews } = await supabase
                .from('reviews')
                .select('rating')
                .eq('reviewee_id', revieweeId)

            if (allUserReviews && allUserReviews.length > 0) {
                const sum = allUserReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0)
                const avgRating = Number((sum / allUserReviews.length).toFixed(1))
                await supabase
                    .from('users')
                    .update({
                        rating: avgRating,
                        reviews_count: allUserReviews.length
                    })
                    .eq('id', revieweeId)
            }
        } catch (e) {
            console.warn('Could not update user average rating:', e)
        }

        // 2. Update Job Status to finalizado
        const { error: jobUpdateError } = await supabase
            .from('jobs')
            .update({ status: 'finalizado' })
            .eq('id', jobId)
        
        if (jobUpdateError) {
            console.error('Job update error:', jobUpdateError)
        }

        // 3. Get Transaction & Programmer Details for Payout
        const { data: tx } = await supabase
            .from('transactions')
            .select('*')
            .eq('job_id', jobId)
            .single()

        const { data: programmer } = await supabase
            .from('users')
            .select('pix_key, pix_key_type, name')
            .eq('id', revieweeId)
            .single()

        // 4. Execute Asaas Payout (only if payment was confirmed)
        let payoutStatus = 'skipped'
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

                payoutStatus = 'success'
                
                // Notify programmer about payout
                await supabase.from('notifications').insert({
                    user_id: revieweeId,
                    type: 'pagamento_liberado',
                    title: 'Pagamento Liberado!',
                    message: `O cliente aprovou seu trabalho e o pagamento de R$ ${tx.valor_liquido.toFixed(2)} foi enviado para sua chave PIX!`,
                    link_url: `/jobs/${jobId}`
                })
            } catch (payoutError: any) {
                console.error('Asaas Payout Error:', payoutError)
                payoutStatus = 'error: ' + payoutError.message
            }
        } else if (tx && !programmer?.pix_key) {
            payoutStatus = 'no_pix_key'
        }

        return NextResponse.json({ success: true, payoutStatus })
    } catch (error: any) {
        console.error('Error approving matrix:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
