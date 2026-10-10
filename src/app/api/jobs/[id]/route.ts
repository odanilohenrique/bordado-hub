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
