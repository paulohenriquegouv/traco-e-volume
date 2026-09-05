import { getDb } from '@/lib/db';

const enderecoDaLoja = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://tracoevolume.com.br';

// Revalida de hora em hora: produto novo entra no sitemap sem precisar de deploy
export const revalidate = 3600;

async function getProdutos() {
  try {
    const db = await getDb();
    return await db.prepare('SELECT slug, updated_at FROM products WHERE active = 1').all();
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const base = enderecoDaLoja();
  const agora = new Date();

  const fixas = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/produtos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/pedido`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/entrar`, changeFrequency: 'monthly', priority: 0.3 },
  ].map((p) => ({ ...p, lastModified: agora }));

  const produtos = (await getProdutos()).map((p) => ({
    url: `${base}/produtos/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : agora,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...fixas, ...produtos];
}
