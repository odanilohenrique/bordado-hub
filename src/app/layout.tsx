import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import NavigationWrapper from "@/components/NavigationWrapper";
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bordadohub.com'),
  title: "BordadoHub - Marketplace e Encomenda de Matrizes de Bordado",
  description: "Plataforma profissional de matrizes de bordado computadorizado do Brasil. Encomende matrizes sob medida com programadores verificados ou baixe matrizes prontas na hora.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "BordadoHub - Matrizes de Bordado Sob Medida e Prontas",
    description: "Conectando ateliês, confecções e programadores de matrizes em todo o Brasil. Custódia segura e download imediato em .PES, .DST e .JEF.",
    url: 'https://bordadohub.com',
    siteName: 'BordadoHub',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/brand/v2/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BordadoHub — Matrizes sob medida e prontas em minutos',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "BordadoHub - Matrizes de Bordado Sob Medida e Prontas",
    description: "Encomende matrizes sob medida em custódia segura ou baixe prontas em .PES, .DST e .JEF.",
    images: ['/brand/v2/og-image.png'],
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
        'url': 'https://bordadohub.com/brand/v2/logo-stacked-dark.svg',
        'width': 641,
        'height': 292,
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

const preHydrationThemeScript = `
  (function() {
    try {
      var stored = window.localStorage.getItem('bh_theme');
      var mode = stored === 'light' ? 'light' : 'dark';
      var root = document.documentElement;
      root.classList.remove('dark', 'light');
      root.classList.add(mode);
      root.style.colorScheme = mode;
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

const extensionErrorFilterScript = `
  if (typeof window !== 'undefined') {
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

    window.addEventListener('error', function(e) {
      const isExt = (e.filename && (e.filename.startsWith('chrome-extension://') || e.filename.startsWith('moz-extension://'))) ||
                    (e.error && e.error.stack && (e.error.stack.includes('chrome-extension://') || e.error.stack.includes('moz-extension://')));
      if (isExt) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, true);

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
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: preHydrationThemeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script dangerouslySetInnerHTML={{ __html: extensionErrorFilterScript }} />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased selection:bg-[#2563EB]/20 selection:text-[#2563EB] dark:selection:bg-[#3B82F6]/25 dark:selection:text-[#60A5FA]">
        <ClientProviders>
          <NavigationWrapper>
            {children}
            <Toaster
              toastOptions={{
                style: {
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 12px 30px -12px rgba(2, 6, 23, 0.35)',
                },
              }}
            />
          </NavigationWrapper>
        </ClientProviders>
      </body>
    </html>
  );
}
