import type { Metadata } from 'next'
import { supabase, createServiceClient } from '@/lib/supabaseClient'

type LayoutProps = {
    children: React.ReactNode
    params: Promise<{ id: string }>
}

const FALLBACK_METADATA: Metadata = {
    title: 'Matriz de Bordado no Marketplace | BordadoHub',
    description: 'Explore e compre matrizes de bordado computadorizado prontas para download imediato nos formatos PES, DST, JEF e mais no BordadoHub.',
    openGraph: {
        title: 'Matriz de Bordado no Marketplace | BordadoHub',
        description: 'Explore e compre matrizes de bordado computadorizado prontas para download imediato nos formatos PES, DST, JEF e mais no BordadoHub.',
        url: 'https://bordadohub.com/marketplace',
        siteName: 'BordadoHub',
        locale: 'pt_BR',
        type: 'website',
        images: [
            {
                url: 'https://bordadohub.com/brand/icon-dark.png',
                width: 1082,
                height: 1082,
                alt: 'BordadoHub Marketplace',
            }
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Matriz de Bordado no Marketplace | BordadoHub',
        description: 'Explore e compre matrizes de bordado computadorizado prontas para download imediato nos formatos PES, DST, JEF e mais no BordadoHub.',
        images: ['https://bordadohub.com/brand/icon-dark.png'],
    },
}

async function getMarketplaceProduct(id: string) {
    if (!id || typeof id !== 'string') return null

    try {
        let client = supabase
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                client = createServiceClient()
            } catch {
                client = supabase
            }
        }

        const { data, error } = await client
            .from('marketplace_products')
            .select(`
                id,
                title,
                description,
                price,
                image_url,
                formats,
                is_bundle,
                items_count,
                is_active,
                seller:seller_id(name)
            `)
            .eq('id', id)
            .single()

        if (error || !data) return null
        return data
    } catch {
        return null
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    try {
        const { id } = await params
        const product = await getMarketplaceProduct(id)

        if (!product) {
            return FALLBACK_METADATA
        }

        const numPrice = Number(product.price) || 0
        const formattedPrice = numPrice > 0
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numPrice)
            : 'Grátis'

        const statusSuffix = product.is_active === false ? ' (Indisponível)' : ''
        const title = `${product.title} - ${formattedPrice}${statusSuffix} | BordadoHub`

        const formatsList = Array.isArray(product.formats) && product.formats.length > 0
            ? product.formats.map((f: string) => `.${String(f).replace(/^\./, '').toUpperCase()}`).join(', ')
            : '.PES, .DST, .JEF'

        const sellerName = (product.seller as any)?.name || 'Programador BordadoHub'
        const bundleInfo = product.is_bundle ? `Pacote com ${product.items_count || 2} matrizes. ` : ''
        const cleanDesc = product.description 
            ? `${product.description.replace(/\s+/g, ' ').trim().slice(0, 120)}... ` 
            : ''

        const description = `${bundleInfo}${cleanDesc}Formatos inclusos: ${formatsList}. Criado por ${sellerName}. Compre por ${formattedPrice} via PIX com download imediato no BordadoHub!`

        const rawImageUrl = product.image_url || '/brand/icon-dark.png'
        const absoluteImageUrl = rawImageUrl.startsWith('http')
            ? rawImageUrl
            : `https://bordadohub.com${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`

        const canonicalUrl = `https://bordadohub.com/marketplace/${id}`

        return {
            title,
            description,
            alternates: {
                canonical: canonicalUrl,
            },
            openGraph: {
                title,
                description,
                url: canonicalUrl,
                siteName: 'BordadoHub',
                locale: 'pt_BR',
                type: 'website',
                images: [
                    {
                        url: absoluteImageUrl,
                        width: 1200,
                        height: 630,
                        alt: product.title || 'Matriz de Bordado Computadorizado',
                    }
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [absoluteImageUrl],
            },
        }
    } catch {
        return FALLBACK_METADATA
    }
}

export default async function MarketplaceItemLayout({
    children,
    params,
}: LayoutProps) {
    await params
    return <>{children}</>
}
