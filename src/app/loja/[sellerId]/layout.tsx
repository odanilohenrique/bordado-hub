import type { Metadata } from 'next'
import { supabase, createServiceClient } from '@/lib/supabaseClient'

type LayoutProps = {
    children: React.ReactNode
    params: Promise<{ sellerId: string }>
}

const DEFAULT_METADATA: Metadata = {
    title: 'Loja Oficial de Matrizes de Bordado | BordadoHub',
    description: 'Explore lojas de programadores profissionais de matrizes de bordado. Download imediato nos formatos PES, DST, JEF com garantia e segurança.',
    openGraph: {
        title: 'Loja Oficial de Matrizes de Bordado | BordadoHub',
        description: 'Explore lojas de programadores profissionais de matrizes de bordado. Download imediato nos formatos PES, DST, JEF com garantia e segurança.',
        url: 'https://bordadohub.com/marketplace',
        siteName: 'BordadoHub',
        locale: 'pt_BR',
        type: 'website',
        images: [
            {
                url: 'https://bordadohub.com/brand/v2/og-image.png',
                width: 1200,
                height: 630,
                alt: 'BordadoHub - Marketplace de Matrizes',
            },
        ],
    },
    twitter: {
        card: 'summary',
        title: 'Loja Oficial de Matrizes de Bordado | BordadoHub',
        description: 'Explore lojas de programadores profissionais de matrizes de bordado no BordadoHub.',
        images: ['https://bordadohub.com/brand/v2/og-image.png'],
    },
}

export async function generateMetadata({ params }: { params: Promise<{ sellerId: string }> }): Promise<Metadata> {
    try {
        const { sellerId } = await params
        if (!sellerId) return DEFAULT_METADATA

        // Sanitização contra caracteres indesejados
        const cleanId = sellerId.replace(/[^a-zA-Z0-9\-_]/g, '')
        if (!cleanId) return DEFAULT_METADATA

        // Inicialização resiliente do cliente Supabase no servidor
        let client = supabase
        try {
            if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
                client = createServiceClient()
            }
        } catch {
            client = supabase
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)

        let query = client
            .from('users')
            .select('id, name, avatar_url, bio, rating, reviews_count')

        if (isUuid) {
            query = query.or(`id.eq.${cleanId},supabase_user_id.eq.${cleanId}`)
        } else {
            query = query.eq('id', cleanId)
        }

        const { data: seller, error } = await query.maybeSingle()

        if (error || !seller) {
            return {
                ...DEFAULT_METADATA,
                openGraph: {
                    ...DEFAULT_METADATA.openGraph,
                    url: `https://bordadohub.com/loja/${cleanId}`,
                },
            }
        }

        const sellerName = seller.name?.trim() || 'Vendedor Oficial'
        const title = `Loja de ${sellerName} - Matrizes de Bordado | BordadoHub`

        // Busca rápida de contagem de matrizes ativas da loja
        let matrixCountText = ''
        try {
            const { count } = await client
                .from('marketplace_products')
                .select('id', { count: 'exact', head: true })
                .eq('seller_id', seller.id)
                .eq('is_active', true)

            if (count && count > 0) {
                matrixCountText = `${count} ${count === 1 ? 'matriz disponível' : 'matrizes disponíveis'}. `
            }
        } catch {
            // Se falhar o count, continua normalmente
        }

        // Construção de descrição otimizada para conversão
        let description = ''
        if (seller.bio?.trim()) {
            const rawBio = seller.bio.trim().replace(/\s+/g, ' ')
            const truncatedBio = rawBio.length > 130 ? `${rawBio.slice(0, 127)}...` : rawBio
            description = `${matrixCountText}${truncatedBio} — Compre com PIX e baixe na hora no BordadoHub.`
        } else {
            description = `${matrixCountText}Confira o catálogo de matrizes de bordado computadorizado de ${sellerName} no BordadoHub. Download imediato nos formatos PES, DST, JEF.`
        }

        // Imagem OpenGraph: Avatar do vendedor ou ícone oficial
        const hasValidAvatar = seller.avatar_url &&
            typeof seller.avatar_url === 'string' &&
            seller.avatar_url.trim().length > 0 &&
            !seller.avatar_url.startsWith('blob:')

        const imageUrl = hasValidAvatar ? seller.avatar_url : 'https://bordadohub.com/brand/v2/og-image.png'

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                url: `https://bordadohub.com/loja/${cleanId}`,
                siteName: 'BordadoHub',
                locale: 'pt_BR',
                type: 'website',
                images: [
                    {
                        url: imageUrl,
                        width: hasValidAvatar ? 400 : 1200,
                        height: hasValidAvatar ? 400 : 630,
                        alt: `Loja Oficial de ${sellerName} - BordadoHub`,
                    },
                ],
            },
            twitter: {
                card: 'summary',
                title,
                description,
                images: [imageUrl],
            },
        }
    } catch (err) {
        console.error('Erro ao gerar metadados dinâmicos da loja:', err)
        return DEFAULT_METADATA
    }
}

export default async function SellerStoreLayout({
    children,
    params,
}: LayoutProps) {
    await params
    return <>{children}</>
}
