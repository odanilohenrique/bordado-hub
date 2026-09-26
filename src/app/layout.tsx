import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import NavigationWrapper from "@/components/NavigationWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BordadoHub - Marketplace de Matrizes",
  description: "Conectando clientes e criadores de matrizes de bordado",
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-[#0F1115]`}>
        <ClientProviders>
          <NavigationWrapper>
            {children}
            <Toaster 
              theme="dark" 
              toastOptions={{
                style: {
                  background: '#1A1D23',
                  border: '1px solid rgba(255, 174, 0, 0.2)',
                  color: '#fff',
                },
              }}
            />
          </NavigationWrapper>
        </ClientProviders>
      </body>
    </html>
  );
}
