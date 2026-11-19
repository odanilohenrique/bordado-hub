import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BordadoHUB - O Maior Marketplace e Encomenda de Matrizes do Brasil',
    short_name: 'BordadoHUB',
    description: 'Marketplace e encomendas de matrizes de bordado computadorizado com download imediato e segurança.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0F1D',
    theme_color: '#2563EB',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
