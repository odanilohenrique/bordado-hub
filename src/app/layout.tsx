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
          </NavigationWrapper>
        </ClientProviders>
      </body>
    </html>
  );
}
