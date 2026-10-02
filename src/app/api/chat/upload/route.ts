import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const proposalId = formData.get('proposalId') as string | null
        const senderId = formData.get('senderId') as string | null
        const customContent = formData.get('content') as string | null

        if (!file || !proposalId || !senderId) {
            return NextResponse.json({ error: 'Arquivo, proposta e remetente são obrigatórios.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Ensure 'proposal_attachments' bucket exists and is public
        const { data: buckets } = await supabase.storage.listBuckets()
        const exists = buckets?.some(b => b.id === 'proposal_attachments')
        if (!exists) {
            const { error: bucketError } = await supabase.storage.createBucket('proposal_attachments', {
                public: true,
                fileSizeLimit: 26214400, // 25MB
            })
            if (bucketError && !bucketError.message?.toLowerCase().includes('already exists')) {
                console.error('Bucket creation error:', bucketError)
            }
        }

        // 2. Upload file to storage using service client (bypasses RLS issues)
        const fileExt = file.name.split('.').pop() || 'file'
        const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const uniqueFolder = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        const filePath = `chat-attachments/${proposalId}/${uniqueFolder}/${cleanName}`
        const fileBuffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await supabase.storage
            .from('proposal_attachments')
            .upload(filePath, fileBuffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: true
            })

        if (uploadError) {
            console.error('Chat upload error:', uploadError)
            return NextResponse.json({ error: `Erro no upload: ${uploadError.message}` }, { status: 500 })
        }

        // 3. Get public URL
        const { data: publicData } = supabase.storage
            .from('proposal_attachments')
            .getPublicUrl(filePath)
        const publicUrl = publicData.publicUrl

        const isEmbroidery = ['dst', 'pes', 'jef', 'emb', 'pxf', 'xxx', 'exp', 'vp3'].includes(fileExt.toLowerCase())
        const defaultContent = isEmbroidery 
            ? `Enviou matriz de bordado: ${file.name}` 
            : `Enviou anexo: ${file.name}`

        // 4. Insert message into proposal_messages
        const { data: messageData, error: msgError } = await supabase
            .from('proposal_messages')
            .insert({
                proposal_id: proposalId,
                sender_id: senderId,
                content: customContent ? customContent.trim() : defaultContent,
                attachment_url: publicUrl
            })
            .select('*, users:sender_id(name)')
            .single()

        if (msgError) {
            console.error('Chat message insert error:', msgError)
            return NextResponse.json({ error: `Erro ao registrar mensagem: ${msgError.message}` }, { status: 500 })
        }

        // 5. Check if programmer is delivering a revision or regular message
        try {
            const { data: proposal } = await supabase
                .from('proposals')
                .select('id, criador_id, job_id, jobs(id, title, cliente_id, status, delivery_url)')
                .eq('id', proposalId)
                .single()

            if (proposal) {
                const jobData = Array.isArray(proposal.jobs) ? proposal.jobs[0] : proposal.jobs
                const isProgrammer = senderId === proposal.criador_id
                const senderName = messageData?.users?.name || 'Programador'

                if (isProgrammer && jobData?.status === 'em_revisao') {
                    // Combine previous delivery_url and the new file URL
                    const existingUrls = jobData.delivery_url ? jobData.delivery_url.split(',') : []
                    if (!existingUrls.includes(publicUrl)) {
                        existingUrls.push(publicUrl)
                    }

                    // Automatically mark job as delivered
                    await supabase
                        .from('jobs')
                        .update({
                            status: 'entregue',
                            delivery_url: existingUrls.join(','),
                            delivered_at: new Date().toISOString()
                        })
                        .eq('id', proposal.job_id)

                    // Notify buyer that revised matrix was delivered
                    if (jobData?.cliente_id) {
                        await supabase.from('notifications').insert({
                            user_id: jobData.cliente_id,
                            type: 'matriz_revisada_entregue',
                            title: 'Matriz Revisada Entregue!',
                            message: `${senderName} enviou a versão corrigida da matriz no chat. Baixe e teste o arquivo!`,
                            link_url: `/jobs/${proposal.job_id}`
                        })
                    }

                    // System message in chat
                    await supabase.from('proposal_messages').insert({
                        proposal_id: proposalId,
                        sender_id: senderId,
                        content: '[SISTEMA] Correção da matriz enviada! O pedido foi marcado como entregue para teste do cliente.'
                    })
                } else {
                    const recipientId = isProgrammer ? jobData?.cliente_id : proposal.criador_id

                    if (recipientId) {
                        await supabase.from('notifications').insert({
                            user_id: recipientId,
                            type: isEmbroidery ? 'matriz_recebida' : 'anexo_recebido',
                            title: isEmbroidery ? 'Nova Matriz no Chat' : `Novo Anexo de ${senderName}`,
                            message: isEmbroidery ? `${senderName} enviou a matriz "${file.name}" no chat.` : `${senderName} enviou um arquivo no pedido.`,
                            link_url: `/jobs/${proposal.job_id}?chat=${proposalId}`
                        })
                    }
                }
            }
        } catch (notifErr) {
            console.error('Notification dispatch error:', notifErr)
        }

        return NextResponse.json({ success: true, message: messageData, publicUrl }, { status: 200 })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Chat upload route error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno no upload' }, { status: 500 })
    }
}
