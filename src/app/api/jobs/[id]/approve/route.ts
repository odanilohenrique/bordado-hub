import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const supabase = createServiceClient()

        // Update job status to finalized
        await supabase
            .from('jobs')
            .update({ status: 'finalizado' })
            .eq('id', id)

        // Update transaction status to 'liberado' (released to creator)
        await supabase
            .from('transactions')
            .update({ status: 'liberado' })
            .eq('job_id', id)

        // In a real implementation, this would trigger the payout to the creator
        // via Mercado Pago or PayPal APIs

        return NextResponse.json({ success: true, message: 'Job approved and payment released' })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
