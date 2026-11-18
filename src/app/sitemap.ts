import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabaseClient'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://bordadohub.com'
    const now = new Date()

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/marketplace`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/jobs`,
            lastModified: now,
            changeFrequency: 'always',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/jobs/new`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/how-it-works`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/programadores`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/termos`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacidade`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ]

    try {
        const { data: products, error } = await supabase
            .from('marketplace_products')
            .select('id, seller_id, created_at')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(200)

        if (error || !products || products.length === 0) {
            return staticRoutes
        }

        const seenProducts = new Set<string>()
        const seenSellers = new Set<string>()
        const productRoutes: MetadataRoute.Sitemap = []
        const storeRoutes: MetadataRoute.Sitemap = []

        for (const p of products) {
            const parsedDate = p.created_at ? new Date(p.created_at) : now
            const lastModified = Number.isNaN(parsedDate.getTime()) ? now : parsedDate

            if (p.id && !seenProducts.has(String(p.id))) {
                seenProducts.add(String(p.id))
                productRoutes.push({
                    url: `${baseUrl}/marketplace/${p.id}`,
                    lastModified,
                    changeFrequency: 'weekly',
                    priority: 0.8,
                })
            }

            if (p.seller_id && !seenSellers.has(String(p.seller_id))) {
                seenSellers.add(String(p.seller_id))
                storeRoutes.push({
                    url: `${baseUrl}/loja/${p.seller_id}`,
                    lastModified,
                    changeFrequency: 'daily',
                    priority: 0.7,
                })
            }
        }

        return [...staticRoutes, ...productRoutes, ...storeRoutes]
    } catch {
        return staticRoutes
    }
}
