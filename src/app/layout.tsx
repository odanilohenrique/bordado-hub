import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import NavigationWrapper from "@/components/NavigationWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://bordadohub.com'),
  title: "BordadoHub - Marketplace de Matrizes de Bordado",
  description: "A maior plataforma de matrizes de bordado computadorizado do Brasil. Encomende matrizes sob medida com programadores profissionais ou compre matrizes prontas com download imediato.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/icon-dark.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "BordadoHub - Marketplace de Matrizes de Bordado",
    description: "Conectando clientes e programadores de matrizes de bordado em todo o Brasil. Encomendas sob medida e matrizes prontas.",
    url: 'https://bordadohub.com',
    siteName: 'BordadoHub',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/brand/icon-dark.png',
        width: 1082,
        height: 1082,
        alt: 'BordadoHub',
      }
    ],
  },
  verification: {
    google: 'lmhJrUB79rerghEs-1-TTinItK5_qKM43hHi2ePyLQE',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://bordadohub.com/#organization',
      'name': 'BordadoHub',
      'alternateName': 'Bordado Hub',
      'url': 'https://bordadohub.com',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://bordadohub.com/brand/logo-dark.png',
        'width': 500,
        'height': 216,
      },
      'description': 'Plataforma e marketplace oficial de matrizes de bordado computadorizado do Brasil. Criação de matrizes sob encomenda e marketplace de matrizes prontas para download.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://bordadohub.com/#website',
      'url': 'https://bordadohub.com',
      'name': 'BordadoHub',
      'description': 'Marketplace e encomendas de matrizes de bordado computadorizado.',
      'publisher': {
        '@id': 'https://bordadohub.com/#organization',
      },
      'inLanguage': 'pt-BR',
    },
  ],
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                // 1. Intercept console.error from extensions to avoid Next.js dev overlay popups
                const _origConsoleError = console.error;
                console.error = function(...args) {
                  const msg = args.map(function(a) { return (a && a.stack) ? a.stack : String(a); }).join(' ');
                  if (
                    msg.includes('chrome-extension://') || 
                    msg.includes('moz-extension://') || 
                    msg.includes('injected.js')
                  ) {
                    return;
                  }
                  _origConsoleError.apply(console, args);
                };

                // 2. Intercept uncaught window error events
                window.addEventListener('error', function(e) {
                  const isExt = (e.filename && (e.filename.startsWith('chrome-extension://') || e.filename.startsWith('moz-extension://'))) ||
                                (e.error && e.error.stack && (e.error.stack.includes('chrome-extension://') || e.error.stack.includes('moz-extension://')));
                  if (isExt) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                // 3. Intercept unhandled promise rejections from extensions
                window.addEventListener('unhandledrejection', function(e) {
                  const reasonStr = (e.reason && e.reason.stack) ? e.reason.stack : String(e.reason || '');
                  if (
                    reasonStr.includes('chrome-extension://') || 
                    reasonStr.includes('moz-extension://') || 
                    reasonStr.includes('injected.js')
                  ) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-[#0B0D11] text-[#F8FAFC] antialiased selection:bg-[#F5A623]/20 selection:text-[#F5A623]`}>
        <ClientProviders>
          <NavigationWrapper>
            {children}
            <Toaster 
              theme="dark" 
              toastOptions={{
                style: {
                  background: '#181C26',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F8FAFC',
                  boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.6)',
                },
              }}
            />
          </NavigationWrapper>
        </ClientProviders>
      </body>
    </html>
  );
}
