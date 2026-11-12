import * as webpush from 'web-push'
import { createServiceClient } from '@/lib/supabaseClient'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contato@bordadohub.com'

let isConfigured = false

function initWebPush() {
    if (isConfigured) return true
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('⚠️ Web Push VAPID keys ausentes em variáveis de ambiente.')
        return false
    }

    try {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
        isConfigured = true
        return true
    } catch (err) {
        console.error('Erro ao configurar VAPID Web Push:', err)
        return false
    }
}

export interface PushNotificationPayload {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    url?: string
    data?: Record<string, any>
}

/**
 * Envia notificação Web Push para uma inscrição específica.
 * Remove automaticamente inscrições expiradas (410 Gone / 404 Not Found).
 */
export async function sendPushToSubscription(
    sub: { endpoint: string; p256dh: string; auth: string },
    payload: PushNotificationPayload
) {
    if (!initWebPush()) return { success: false, error: 'VAPID não configurado' }

    const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
        }
    }

    const notificationData = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon.png',
        badge: payload.badge || '/icon.png',
        tag: payload.tag || 'bordadohub-general',
        url: payload.url || '/',
        data: {
            url: payload.url || '/',
            ...(payload.data || {})
        }
    })

    try {
        await webpush.sendNotification(pushSubscription, notificationData)
        return { success: true }
    } catch (err: any) {
        console.warn(`Falha ao disparar push para ${sub.endpoint.slice(0, 30)}...:`, err.statusCode || err.message)

        // Se a inscrição expirou ou foi cancelada pelo usuário no navegador
        if (err.statusCode === 410 || err.statusCode === 404) {
            try {
                const supabase = createServiceClient()
                await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                console.log('Inscrição push expirada removida do banco.')
            } catch (cleanupErr) {
                console.warn('Erro ao limpar inscrição expirada:', cleanupErr)
            }
        }
        return { success: false, error: err.message, statusCode: err.statusCode }
    }
}

/**
 * Envia notificação Web Push para um usuário específico (todos os dispositivos dele).
 */
export async function sendPushToUser(
    userId: string,
    payload: PushNotificationPayload
) {
    if (!userId) return { count: 0 }

    try {
        const supabase = createServiceClient()
        const { data: subs, error } = await supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth')
            .eq('user_id', userId)

        if (error || !subs || subs.length === 0) {
            return { count: 0 }
        }

        const results = await Promise.allSettled(
            subs.map((s) => sendPushToSubscription(s, payload))
        )

        const sentCount = results.filter((r) => r.status === 'fulfilled' && (r.value as any)?.success).length
        return { count: sentCount, total: subs.length }
    } catch (err) {
        console.error(`Erro ao disparar push para usuário ${userId}:`, err)
        return { count: 0, error: err }
    }
}

/**
 * Envia notificação Web Push para todos os programadores inscritos.
 * Usado quando um novo pedido é publicado no mural.
 */
export async function sendPushToProgrammers(
    payload: PushNotificationPayload,
    excludeUserId?: string
) {
    try {
        const supabase = createServiceClient()
        let query = supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth, user_id')
            .eq('role', 'criador')

        if (excludeUserId) {
            query = query.neq('user_id', excludeUserId)
        }

        const { data: subs, error } = await query

        if (error || !subs || subs.length === 0) {
            return { count: 0 }
        }

        const results = await Promise.allSettled(
            subs.map((s) => sendPushToSubscription(s, payload))
        )

        const sentCount = results.filter((r) => r.status === 'fulfilled' && (r.value as any)?.success).length
        return { count: sentCount, total: subs.length }
    } catch (err) {
        console.error('Erro ao disparar push para programadores:', err)
        return { count: 0, error: err }
    }
}
