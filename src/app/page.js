import Link from 'next/link';
import { getDb } from '@/lib/db';
import { lerConfigLoja, mesclarTudo } from '@/lib/config-loja';
import ProductCard from '@/components/ProductCard';

// A home lista destaques e categorias vindos do banco. Sem isto ela seria congelada no
// build e produto novo nunca apareceria. 60s mantém a home rápida sem ficar desatualizada.
export const revalidate = 60;

/**
 * Textos da vitrine, editados em /admin/configuracoes.
 *
 * Lidos aqui no servidor, e nao pelo contexto do navegador: a home e a pagina
 * que o Google le, e um titulo que so aparece depois de uma requisicao seria um
 * titulo que o buscador nao ve.
 */
/**
 * Os produtos marcados como Destaque no cadastro.
 *
 * A seção já existiu, sumiu num refino e deixou a consulta órfã para trás — a
 * consulta foi removida junto. Agora ela volta com quem a desenha: marcar
 * "Destaque" num produto tem efeito visível na página inicial, e não só na
 * ordem da vitrine.
 */
async function getDestaques() {
  try {
    const db = await getDb();
    const products = await db
      .prepare('SELECT * FROM products WHERE active = 1 AND featured = 1 ORDER BY created_at DESC LIMIT 8')
      .all();
    return products.map(p => ({ ...p, images: JSON.parse(p.images || '[]') }));
  } catch { return []; }
}

async function getConfigLoja() {
  try {
    return await lerConfigLoja(await getDb());
  } catch { return mesclarTudo(null); }
}

async function getCategories() {
  try {
    const db = await getDb();
    return db.prepare("SELECT category, COUNT(*) as count FROM products WHERE active = 1 AND category != '' GROUP BY category ORDER BY count DESC").all();
  } catch { return []; }
}

export default async function HomePage() {
  const [categories, destaques, loja] = await Promise.all([
    getCategories(), getDestaques(), getConfigLoja(),
  ]);
  const vitrine = loja.vitrine;
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_LINK || '#';

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 text-white">
        {/* Os dois instrumentos dizem, sem escrever a palavra, o que a loja faz:
            o paquímetro é a precisão da medida, o scanner é a peça do cliente
            virando arquivo. Juntos anunciam o personalizado, que é o serviço de
            melhor margem.

            Só a partir de lg — abaixo disso eles brigariam com o texto por espaço.
            O brilho atrás existe por contraste: as duas peças são escuras sobre
            roxo escuro e sem ele o corpo dos instrumentos some no fundo.

            O scanner vem menor e inclinado para o outro lado, e não centrado como
            o paquímetro: dois objetos do mesmo tamanho e mesmo eixo leem como
            colisão, não como composição. */}
        <div aria-hidden className="pointer-events-none hidden lg:block absolute right-0 top-0 h-full w-1/2 select-none">
          <div className="absolute right-16 top-1/2 -translate-y-1/2 h-[130%] w-[130%] rounded-full bg-primary-500/25 blur-3xl" />
          <img
            src="/scanner-hero.png"
            alt=""
            className="absolute right-[30%] xl:right-[34%] top-[64%] -translate-y-1/2 h-[62%] max-w-none -rotate-[12deg] drop-shadow-2xl"
          />
          <img
            src="/paquimetro-hero.png"
            alt=""
            className="absolute right-8 xl:right-16 top-1/2 -translate-y-1/2 h-[125%] max-w-none rotate-[24deg] drop-shadow-2xl"
          />
        </div>

        <div className="relative container-custom py-16 md:py-24">
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-medium bg-white/20 px-3 py-1 rounded-full mb-4">{vitrine.selo}</span>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">{vitrine.titulo}</h1>
            <p className="text-lg md:text-xl text-primary-200 mb-8 leading-relaxed">
              {vitrine.subtitulo}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/produtos" className="btn-3d bg-accent-500 hover:bg-accent-600 text-white font-medium px-6 py-3 rounded-lg">{vitrine.botao_produtos}</Link>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-3d btn-3d-vidro bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-lg border border-white/20 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {vitrine.botao_contato}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      {categories.length > 0 && (
        <section className="bg-white py-12 md:py-16">
          <div className="container-custom">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">{vitrine.titulo_categorias}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map(cat => (
                <Link key={cat.category} href={`/produtos?categoria=${encodeURIComponent(cat.category)}`}
                  className="card-3d bg-white hover:bg-primary-50 border border-gray-200 hover:border-primary-200 rounded-xl p-6 text-center group">
                  <p className="font-semibold text-gray-900 group-hover:text-primary-600 capitalize">{cat.category}</p>
                  <p className="text-sm text-gray-400 mt-1">{cat.count} produto{cat.count > 1 ? 's' : ''}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Destaques */}
      {destaques.length > 0 && (
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="container-custom">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-8">
              <h2 className="text-2xl font-bold text-gray-900">{vitrine.titulo_destaques}</h2>
              <Link href="/produtos" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                Ver todos os produtos →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {destaques.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  campanha={loja.campanha}
                  diasNovidade={vitrine.dias_novidade}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Projetos personalizados.

          Fica depois dos destaques de proposito: o visitante ja viu o que a loja
          faz, e e aqui que ela responde "e se o que eu preciso nao esta ai?".
          O catalogo vende o que ja existe; esta secao pede o trabalho sob medida,
          que e o de margem melhor. Por isso ela termina em conversa (WhatsApp) e
          nao em carrinho: peca sob medida precisa de orcamento, nao de botao de
          comprar. */}
      <section className="bg-white py-12 md:py-16">
        <div className="container-custom">
          <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 p-8 md:p-12">
              <div className="relative order-2 md:order-1">
                <div aria-hidden className="absolute inset-0 rounded-full bg-primary-200/40 blur-3xl" />
                <img
                  src="/scanner.png"
                  alt="Scanner 3D Creality Otter usado para digitalizar a peça do cliente"
                  className="relative mx-auto max-h-72 md:max-h-96 w-auto drop-shadow-xl"
                />
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  {vitrine.personalizados_titulo}
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  {vitrine.personalizados_texto}
                </p>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-3d inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-medium px-6 py-3 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  {vitrine.personalizados_botao}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

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
            <Link href="/produtos" className="btn-3d bg-accent-500 hover:bg-accent-600 text-white font-medium px-8 py-3 rounded-lg">Ver Produtos</Link>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-3d btn-3d-vidro bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-3 rounded-lg border border-white/20">WhatsApp</a>
          </div>
        </div>
      </section>
    </div>
  );
}
