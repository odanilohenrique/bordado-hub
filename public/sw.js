// BordadoHUB — Service Worker v1.0
// Gerencia notificações Web Push em background (mesmo com o site fechado)

self.addEventListener('install', () => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

// Recebe o evento de push do servidor
self.addEventListener('push', (event) => {
    if (!event.data) return

    let data = {}
    try {
        data = event.data.json()
    } catch {
        data = { title: 'BordadoHUB', body: event.data.text(), url: '/' }
    }

    const title = data.title || 'BordadoHUB'
    const options = {
        body: data.body || 'Você tem uma nova notificação.',
        icon: data.icon || '/icon.png',
        badge: data.badge || '/icon.png',
        tag: data.tag || 'bordadohub',
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: {
            url: data.url || data.data?.url || '/',
            timestamp: Date.now()
        },
        actions: [
            { action: 'open', title: 'Abrir' },
            { action: 'dismiss', title: 'Fechar' }
        ]
    }

    event.waitUntil(self.registration.showNotification(title, options))
})

// Clique na notificação nativa
self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    if (event.action === 'dismiss') return

    const url = event.notification.data?.url || '/'
    const fullUrl = new URL(url, self.location.origin).href

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Se o site já está aberto, foca e navega
            for (const client of windowClients) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    client.focus()
                    client.postMessage({ type: 'NAVIGATE', url })
                    return
                }
            }
            // Caso contrário, abre uma nova aba
            if (self.clients.openWindow) {
                return self.clients.openWindow(fullUrl)
            }
        })
    )
})
