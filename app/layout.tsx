import type { Metadata, Viewport } from 'next';
import { Poppins, IBM_Plex_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

// URL de produção — usada só pra resolver a imagem de compartilhamento
// (og:image) em um endereço absoluto. Se o domínio mudar, atualize aqui.
const SITE_URL = 'https://pessoal-vault-app-flax.vercel.app';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const TITLE = 'Vault — Cofre pessoal';
const DESCRIPTION = 'Cofre de senhas pessoal, criptografado no dispositivo.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cofre',
  },
  other: {
    // apple-mobile-web-app-capable ainda é necessário pro Safari/iOS,
    // mobile-web-app-capable é a versão padrão (não depreciada) usada
    // pelo Chrome/Android. Mantemos os dois.
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: TITLE,
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: TITLE }],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/icons/icon-512.png'],
  },
};

export const viewport: Viewport = {
  themeColor: 'rgb(245, 223, 78)',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Lê os headers da requisição só pra forçar renderização dinâmica
  // (por requisição), não estática. O nonce da CSP (middleware.ts) é
  // diferente a cada requisição — numa página pré-renderizada estática
  // (o padrão do Next.js quando nada exige renderização dinâmica), o
  // HTML é gerado uma única vez no build, com um nonce que nunca bate
  // com o nonce novo que o middleware manda a cada requisição real.
  // Resultado: todo script inline (inclusive o bootstrap do próprio
  // Next.js) é bloqueado pela CSP e a página trava carregando.
  headers();

  return (
    <html lang="pt-BR" className={`${poppins.variable} ${plexMono.variable}`}>
      <body className="font-sans min-h-screen bg-vault-bg text-vault-text antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
