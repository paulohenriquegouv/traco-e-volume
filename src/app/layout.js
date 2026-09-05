import './globals.css';
import { CartProvider } from '@/components/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NavegacaoRapida from '@/components/NavegacaoRapida';

/**
 * Dados estruturados da marca.
 *
 * O Google associa o site ao nome pelo conteúdo, não pelo domínio — e o domínio
 * (tracoevolume) não tem o "ç" nem o "&" do nome real. Isto declara a loja como
 * uma entidade com nome próprio, apelidos e perfis ligados, em vez de deixar o
 * nome como texto solto numa página.
 *
 * `alternateName` cobre como as pessoas de fato digitam: sem cedilha, com "e" no
 * lugar do "&", tudo junto.
 */
function dadosDaMarca(site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: 'Traço & Volume',
    alternateName: ['Traco e Volume', 'Traço e Volume', 'Tracoevolume', 'Traço e Volume Impressão 3D'],
    url: site,
    description: 'Loja de produtos exclusivos em impressão 3D: decoração, luminárias, vasos e peças personalizadas.',
    slogan: 'Peças exclusivas em impressão 3D com acabamento profissional',
    areaServed: { '@type': 'Country', name: 'Brasil' },
    sameAs: [process.env.NEXT_PUBLIC_INSTAGRAM].filter(Boolean),
  };
}

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tracoevolume.com.br'),
  title: 'Traço & Volume — Impressão 3D',
  description: 'Produtos exclusivos em impressão 3D. Peças personalizadas com qualidade e precisão.',
  openGraph: {
    title: 'Traço & Volume — Impressão 3D',
    description: 'Produtos exclusivos em impressão 3D.',
    siteName: 'Traço & Volume',
    locale: 'pt_BR',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://tracoevolume.com.br';
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col bg-gray-50">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosDaMarca(site)) }}
        />
        <CartProvider>
          <Header />
          <NavegacaoRapida />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}