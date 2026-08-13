import type { Metadata, Viewport } from "next";
import { Poppins, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cofre — senhas pessoais",
  description: "Cofre de senhas pessoal, criptografado no dispositivo.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cofre",
  },
  other: {
    // apple-mobile-web-app-capable ainda é necessário pro Safari/iOS,
    // mobile-web-app-capable é a versão padrão (não depreciada) usada
    // pelo Chrome/Android. Mantemos os dois.
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "rgb(245, 223, 78)",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${plexMono.variable}`}>
      <body className="font-sans min-h-screen bg-vault-bg text-vault-text antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
