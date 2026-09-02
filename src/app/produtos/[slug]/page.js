import Link from 'next/link';
import { getDb } from '@/lib/db';
import ProductDetailClient from './ProductDetailClient';

async function getProduct(slug) {
  try {
    const db = await getDb();
    const product = await db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(slug);
    if (!product) return null;
    return { ...product, images: JSON.parse(product.images || '[]'), tags: JSON.parse(product.tags || '[]'), colors: JSON.parse(product.colors || '[]') };
  } catch { return null; }
}

export async function generateMetadata({ params }) {
  const product = await getProduct(params.slug);
  if (!product) return { title: 'Produto não encontrado - Traço & Volume' };
  return {
    title: `${product.name} - Traço & Volume`,
    description: product.short_description || product.description?.slice(0, 160) || '',
  };
}

export default async function ProdutoDetalhePage({ params }) {
  const product = await getProduct(params.slug);

  if (!product) {
    return (
      <div className="container-custom py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Produto não encontrado</h1>
        <p className="text-gray-500">O produto que você procura não está disponível.</p>
        <Link href="/produtos" className="mt-6 inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700">Ver Produtos</Link>
      </div>
    );
  }

  return <ProductDetailClient product={product} />;
}