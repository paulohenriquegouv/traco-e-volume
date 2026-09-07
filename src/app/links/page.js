import { getDb } from '@/lib/db';
import { lerConfigLoja, mesclarTudo } from '@/lib/config-loja';
import { LogoMarca } from '@/components/Logo';

/**
 * A página do link da bio do Instagram.
 *
 * Faz o papel do Linktree, mas dentro da própria loja: sem mensalidade, sem
 * marca de terceiro, e o clique já cai a um toque do catálogo. Título, frase e
 * botões são editados em /admin/configuracoes, aba "Página de links" — salvar
 * lá derruba o cache daqui na hora.
 */

// Mesmo prazo da home: rede de segurança para mudança feita fora do painel.
export const revalidate = 60;

export const metadata = {
  title: 'Traço & Volume — Links',
  description: 'Todos os links da Traço & Volume: catálogo, WhatsApp e acompanhamento de pedido.',
};

async function getLinks() {
  try {
    return await lerConfigLoja(await getDb());
  } catch {
    return mesclarTudo(null);
  }
}

export default async function LinksPage() {
  const config = await getLinks();
  const { titulo, subtitulo, itens } = config.links;

  return (
    <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 text-white">
      <div className="container-custom min-h-[70vh] py-14 md:py-20 flex flex-col items-center">
        <LogoMarca className="h-20 w-auto mb-5" />
        <h1 className="text-2xl md:text-3xl font-bold text-center">{titulo || config.loja.nome}</h1>
        {subtitulo && (
          <p className="text-primary-200 text-center mt-2 mb-10 max-w-sm">{subtitulo}</p>
        )}

        <nav className="w-full max-w-md space-y-3">
          {itens.map((item, i) => {
            const externo = !item.url.startsWith('/');
            return (
              <a
                key={`${item.url}-${i}`}
                href={item.url}
                {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="btn-3d block w-full bg-white text-primary-800 font-semibold text-center px-6 py-3.5 rounded-xl hover:bg-primary-50 transition-colors"
              >
                {item.rotulo}
              </a>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
