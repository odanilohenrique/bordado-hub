import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        if (!id) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Sanitize ID to prevent injection
        const cleanId = id.replace(/[^a-zA-Z0-9\-_]/g, '')
        if (!cleanId || cleanId !== id) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)

        // 1. Fetch user by id or supabase_user_id (safely handling non-uuid values)
        let userQuery = supabase.from('users').select('*')
        if (isUuid) {
            userQuery = userQuery.or(`id.eq.${cleanId},supabase_user_id.eq.${cleanId}`)
        } else {
            userQuery = userQuery.eq('supabase_user_id', cleanId)
        }

        const { data: user, error: userError } = await userQuery.maybeSingle()

        if (userError) {
            console.error('Error fetching user profile:', userError)
            return NextResponse.json({ error: userError.message }, { status: 500 })
        }

        if (!user) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        // Strip sensitive fields before returning public profile
        const { cpf_cnpj, pix_key, pix_key_type, ...safeUser } = user

        // 2. Fetch reviews
        let enrichedReviews: any[] = []
        try {
            const { data: reviewsData } = await supabase
                .from('reviews')
                .select('*, jobs(title)')
                .or(`reviewee_id.eq.${user.id}${user.supabase_user_id ? `,reviewee_id.eq.${user.supabase_user_id}` : ''}`)
                .order('created_at', { ascending: false })

            if (reviewsData && reviewsData.length > 0) {
                const reviewerIds = Array.from(new Set(reviewsData.map(r => r.reviewer_id).filter(Boolean)))
                const reviewerMap = new Map()
                if (reviewerIds.length > 0) {
                    const validUuids = reviewerIds.filter(rid => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rid as string))
                    if (validUuids.length > 0) {
                        const { data: reviewers } = await supabase
                            .from('users')
                            .select('id, supabase_user_id, name, avatar_url')
                            .or(`id.in.(${validUuids.join(',')}),supabase_user_id.in.(${validUuids.join(',')})`)

                        reviewers?.forEach(u => {
                            reviewerMap.set(u.id, u)
                            if (u.supabase_user_id) reviewerMap.set(u.supabase_user_id, u)
                        })
                    }
                }

                enrichedReviews = reviewsData.map(r => ({
                    ...r,
                    reviewer: reviewerMap.get(r.reviewer_id) || { name: 'Cliente' }
                }))
            }
        } catch (revErr) {
            console.warn('Reviews fetch warning:', revErr)
        }

        return NextResponse.json(
            {
                success: true,
                profile: safeUser,
                reviews: enrichedReviews
            },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60'
                }
            }
        )
    } catch (err: any) {
        console.error('Server error in /api/profile/[id]:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
