import { supabase } from './supabaseClient'

interface CreateNotificationInput {
    userId: string
    type: string
    title: string
    message: string
    linkUrl?: string
}

export async function createNotification({
    userId,
    type,
    title,
    message,
    linkUrl
}: CreateNotificationInput) {
    const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title,
        message,
        link_url: linkUrl || null,
        is_read: false
    })

    if (error) {
        console.error('Erro ao criar notificação:', error)
    }
}
