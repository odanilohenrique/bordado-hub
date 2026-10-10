import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import NavigationWrapper from "@/components/NavigationWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://bordadohub.com'),
  title: "BordadoHub - Marketplace de Matrizes",
  description: "Conectando clientes e criadores de matrizes de bordado",
  icons: {
    icon: [
      { url: '/brand/icon-dark.png', sizes: '1080x1080', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/icon-amber.png', sizes: '1080x1080', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "BordadoHub - Marketplace de Matrizes de Bordado",
    description: "Conectando clientes e criadores de matrizes de bordado",
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

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
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
