import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { userId, ...fields } = body

        if (!userId) {
            return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Sanitize avatar_url (never allow blob: URLs in DB)
        let avatarUrl = fields.avatar_url
        if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('blob:')) {
            avatarUrl = null
        }

        // Sanitize portfolio_urls (never allow blob: or empty URLs in DB)
        const portfolioUrls = Array.isArray(fields.portfolio_urls)
            ? fields.portfolio_urls.filter((url: any) =>
                typeof url === 'string' && url.trim().length > 0 && !url.startsWith('blob:')
            )
            : []

        const effectiveRole = fields.is_programmer ? 'criador' : 'cliente'

        // 1. Build comprehensive update payload
        const updatePayload: Record<string, any> = {
            name: fields.name || '',
            bio: fields.bio || '',
            role: effectiveRole,
            is_client: fields.is_client ?? true,
            is_programmer: fields.is_programmer ?? false,
            client_business_type: fields.client_business_type || 'Iniciante / Hobby',
            client_machine_brand: fields.client_machine_brand || null,
            skills: Array.isArray(fields.skills) ? fields.skills : [],
            formats: Array.isArray(fields.formats) ? fields.formats : [],
            experience_level: fields.experience_level || 'Iniciante',
            portfolio_urls: portfolioUrls,
            cpf_cnpj: fields.cpf_cnpj || null,
            pix_key: fields.pix_key || null,
            pix_key_type: fields.pix_key_type || 'cpf'
        }

        if (avatarUrl) {
            updatePayload.avatar_url = avatarUrl
        }

        // 2. Perform server-side update with service role client
        let { data, error } = await supabase
            .from('users')
            .update(updatePayload)
            .or(`id.eq.${userId},supabase_user_id.eq.${userId}`)
            .select()

        // 3. Fallback: if newer columns don't exist yet in the database, update base fields
        if (error) {
            console.warn('Initial profile update error, trying fallback:', error.message)

            const safePayload: Record<string, any> = {
                name: fields.name || '',
                bio: fields.bio || '',
                role: effectiveRole,
                skills: updatePayload.skills,
                formats: updatePayload.formats,
                portfolio_urls: updatePayload.portfolio_urls
            }
            if (avatarUrl) safePayload.avatar_url = avatarUrl

            const fallbackRes = await supabase
                .from('users')
                .update(safePayload)
                .or(`id.eq.${userId},supabase_user_id.eq.${userId}`)
                .select()

            if (fallbackRes.error) {
                console.error('Fallback profile update failed:', fallbackRes.error)
                return NextResponse.json({
                    error: `Erro ao salvar no banco: ${error.message}`
                }, { status: 500 })
            }

            data = fallbackRes.data
        }

        return NextResponse.json({
            success: true,
            user: data && data.length > 0 ? data[0] : null
        }, { status: 200 })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        console.error('Server error updating profile:', err)
        return NextResponse.json({ error: `Erro interno: ${err.message}` }, { status: 500 })
    }
}
