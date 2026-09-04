import './globals.css';
import { CartProvider } from '@/components/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NavegacaoRapida from '@/components/NavegacaoRapida';

export const metadata = {
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
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col bg-gray-50">
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