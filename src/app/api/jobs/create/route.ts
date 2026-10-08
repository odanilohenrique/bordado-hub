import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            cliente_id,
            auth_user_id,
            title,
            description,
            dimensions,
            fabric_type,
            urgency,
            formats,
            image_urls,
            order_type,
            items_count,
            target_programmer_id
        } = body

        if (!title || !title.trim()) {
            return NextResponse.json({ error: 'Título do pedido é obrigatório.' }, { status: 400 })
        }

        if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
            return NextResponse.json({ error: 'Ao menos uma imagem é obrigatória.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Resolve o ID do usuário na tabela pública users
        let resolvedUserId = cliente_id

        if (resolvedUserId) {
            const { data: userDirect } = await supabase
                .from('users')
                .select('id')
                .eq('id', resolvedUserId)
                .maybeSingle()

            if (!userDirect) {
                // Pode ser o supabase_user_id passado como cliente_id
                const { data: userByAuth } = await supabase
                    .from('users')
                    .select('id')
                    .eq('supabase_user_id', resolvedUserId)
                    .maybeSingle()

                if (userByAuth) {
                    resolvedUserId = userByAuth.id
                }
            }
        }

        if (!resolvedUserId && auth_user_id) {
            const { data: userByAuth } = await supabase
                .from('users')
                .select('id')
                .eq('supabase_user_id', auth_user_id)
                .maybeSingle()

            if (userByAuth) {
                resolvedUserId = userByAuth.id
            }
        }

        if (!resolvedUserId) {
            return NextResponse.json({ error: 'Usuário não identificado. Por favor, refaça o login.' }, { status: 401 })
        }

        // 2. Monta o payload do pedido
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jobPayload: any = {
            cliente_id: resolvedUserId,
            title: title.trim(),
            description: (description || '').trim(),
            dimensions: typeof dimensions === 'string' ? dimensions : JSON.stringify(dimensions || []),
            fabric_type: fabric_type || 'A combinar',
            urgency: urgency || 'sem_pressa',
            formats: Array.isArray(formats) && formats.length > 0 ? formats : ['.PES'],
            image_urls,
            status: 'aberto',
            order_type: order_type || 'individual',
            items_count: items_count || 1,
            ...(target_programmer_id && { target_programmer_id })
        }

        // 3. Insere o pedido no banco de dados com service client
        let { data: job, error: insertError } = await supabase
            .from('jobs')
            .insert([jobPayload])
            .select()
            .single()

        // Fallback caso colunas order_type ou items_count não existam no esquema do banco
        if (insertError && (insertError.message?.includes('items_count') || insertError.message?.includes('order_type'))) {
            console.warn('Colunas de kit não encontradas na tabela jobs, tentando inserção simplificada...')
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { order_type: _ot, items_count: _ic, ...fallbackPayload } = jobPayload
            const fallbackRes = await supabase
                .from('jobs')
                .insert([fallbackPayload])
                .select()
                .single()

            job = fallbackRes.data
            insertError = fallbackRes.error
        }

        if (insertError || !job) {
            console.error('Erro ao criar pedido no banco:', insertError)
            return NextResponse.json({ error: `Erro ao salvar pedido: ${insertError?.message || 'Falha no banco'}` }, { status: 500 })
        }

        // 4. Se for pedido direto para um programador, envia notificação
        if (target_programmer_id) {
            try {
                await supabase.from('notifications').insert({
                    user_id: target_programmer_id,
                    type: 'solicitacao_direta',
                    title: 'Novo Pedido Direto!',
                    message: `Você recebeu uma solicitação direta para o pedido "${jobPayload.title}".`,
                    link_url: `/jobs/${job.id}`,
                    is_read: false
                })
            } catch (notifErr) {
                console.warn('Erro ao notificar programador do pedido direto:', notifErr)
            }
        }

        return NextResponse.json({ success: true, jobId: job.id }, { status: 200 })
    } catch (err: any) {
        console.error('API create job error:', err)
        return NextResponse.json({ error: err.message || 'Erro interno no servidor ao criar pedido.' }, { status: 500 })
    }
}
