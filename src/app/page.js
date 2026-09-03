import Link from 'next/link';
import { getDb } from '@/lib/db';

// A home lista destaques e categorias vindos do banco. Sem isto ela seria congelada no
// build e produto novo nunca apareceria. 60s mantém a home rápida sem ficar desatualizada.
export const revalidate = 60;

async function getFeaturedProducts() {
  try {
    const db = await getDb();
    const products = await db.prepare("SELECT * FROM products WHERE active = 1 AND featured = 1 ORDER BY created_at DESC LIMIT 8").all();
    return products.map(p => ({ ...p, images: JSON.parse(p.images || '[]') }));
  } catch { return []; }
}

async function getCategories() {
  try {
    const db = await getDb();
    return db.prepare("SELECT category, COUNT(*) as count FROM products WHERE active = 1 AND category != '' GROUP BY category ORDER BY count DESC").all();
  } catch { return []; }
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([getFeaturedProducts(), getCategories()]);
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_LINK || '#';

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 text-white">
        <div className="container-custom py-16 md:py-24">
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-medium bg-white/20 px-3 py-1 rounded-full mb-4">Impressão 3D de Qualidade</span>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">Traço & Volume</h1>
            <p className="text-lg md:text-xl text-primary-200 mb-8 leading-relaxed">
              Peças exclusivas em impressão 3D com acabamento profissional. Do protótipo à produção, transformamos suas ideias em realidade.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/produtos" className="bg-accent-500 hover:bg-accent-600 text-white font-medium px-6 py-3 rounded-lg transition-colors shadow-lg">Ver Produtos</Link>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-lg transition-colors border border-white/20 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Fale Conosco
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      {categories.length > 0 && (
        <section className="bg-white py-12 md:py-16">
          <div className="container-custom">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Categorias</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map(cat => (
                <Link key={cat.category} href={`/produtos?categoria=${encodeURIComponent(cat.category)}`}
                  className="bg-gray-50 hover:bg-primary-50 border border-gray-100 hover:border-primary-200 rounded-xl p-6 text-center transition-all group">
                  <p className="font-semibold text-gray-900 group-hover:text-primary-600 capitalize">{cat.category}</p>
                  <p className="text-sm text-gray-400 mt-1">{cat.count} produto{cat.count > 1 ? 's' : ''}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Diferenciais */}
      <section className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Qualidade Garantida</h3>
            <p className="text-sm text-gray-500">Impressão 3D com acabamento profissional e materiais selecionados.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Pagamento Facilitado</h3>
            <p className="text-sm text-gray-500">Pix, cartão parcelado ou boleto.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Atendimento Personalizado</h3>
            <p className="text-sm text-gray-500">Suporte direto pelo WhatsApp.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary-800 to-primary-950 text-white py-16">
        <div className="container-custom text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-primary-200 mb-8 max-w-lg mx-auto">Veja nossos produtos ou fale diretamente conosco no WhatsApp para pedidos personalizados.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/produtos" className="bg-accent-500 hover:bg-accent-600 text-white font-medium px-8 py-3 rounded-lg transition-colors">Ver Produtos</Link>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-3 rounded-lg transition-colors border border-white/20">WhatsApp</a>
          </div>
        </div>
      </section>
    </div>
  );
}

// Componente de card com imagem
function ProductCard({ product }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
      <a href={`/produtos/${product.slug}`} className="block aspect-square bg-gray-50 overflow-hidden">
        <img src={product.images?.[0] || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
      </a>
      <div className="p-3 md:p-4">
        <a href={`/produtos/${product.slug}`}><h3 className="text-xs md:text-sm font-semibold text-gray-900 line-clamp-2 hover:text-primary-600">{product.name}</h3></a>
        <p className="text-sm md:text-base font-bold text-gray-900 mt-2">{Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <a href={`/produtos/${product.slug}`} className="mt-3 block w-full text-center bg-primary-600 hover:bg-primary-700 text-white text-xs md:text-sm font-medium py-2 rounded-lg transition-colors">Ver Detalhes</a>
      </div>
    </div>
  );
}