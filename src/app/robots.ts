import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/checkout/',
                    '/financeiro',
                    '/auth/',
                    '/admin/',
                    '/producao',
                    '/pedidos',
                ],
            },
            {
                userAgent: 'Googlebot-Image',
                allow: '/',
            },
        ],
        sitemap: 'https://bordadohub.com/sitemap.xml',
    }
}
