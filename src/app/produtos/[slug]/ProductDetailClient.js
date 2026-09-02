'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';

function getWhatsAppLink(product) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP || '5591981158315';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://traco-e-volume.vercel.app';
  const imageUrl = Array.isArray(product.images) && product.images[0]
    ? product.images[0].startsWith('http') ? product.images[0] : `${siteUrl}${product.images[0]}`
    : '';
  const price = Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const msg = [
    `Olá! Tenho interesse no produto: *${product.name}*`,
    ``,
    `💰 Preço: ${price}`,
    product.short_description ? `📝 ${product.short_description}` : '',
    imageUrl ? `📷 ${imageUrl}` : '',
    product.material ? `🧵 Material: ${product.material}` : '',
    product.dimensions ? `📏 Dimensões: ${product.dimensions}` : '',
    ``,
    `🔗 ${siteUrl}/produtos/${product.slug}`,
  ].filter(Boolean).join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export default function ProductDetailClient({ product }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);

  const images = product.images?.length > 0 ? product.images : ['/placeholder.svg'];
  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / product.compare_price) * 100) : 0;

  const handleAdd = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="container-custom py-8 md:py-12">
      <div className="text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-primary-600">Início</Link>
        <span className="mx-2">/</span>
        <Link href="/produtos" className="hover:text-primary-600">Produtos</Link>
        {product.category && (
          <><span className="mx-2">/</span><Link href={`/produtos?categoria=${encodeURIComponent(product.category)}`} className="hover:text-primary-600 capitalize">{product.category}</Link></>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-600">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Imagens */}
        <div>
{product.short_description && <p className="text-gray-600 mb-6 leading-relaxed">{product.short_description}</p>}

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 text-gray-500 hover:text-gray-900">−</button>
              <span className="px-3 py-2 text-gray-900 font-medium w-12 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-2 text-gray-500 hover:text-gray-900">+</button>
            </div>
            <button onClick={handleAdd} className={`flex-1 py-3 rounded-lg font-medium transition-all ${added ? 'bg-green-500 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>
              {added ? '✓ Adicionado!' : 'Adicionar ao Carrinho'}
            </button>
          </div>

          <a href={getWhatsAppLink(product)} target="_blank" rel="noopener noreferrer"
            className="block w-full text-center bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium mb-6">
            Comprar pelo WhatsApp
          </a>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {product.material && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Material</p>
                <p className="text-sm font-medium text-gray-800">{product.material}</p>
              </div>
            )}
            {product.weight && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Peso</p>
                <p className="text-sm font-medium text-gray-800">{product.weight} g</p>
              </div>
            )}
            {product.dimensions && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Dimensões</p>
                <p className="text-sm font-medium text-gray-800">{product.dimensions}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Disponibilidade</p>
              <p className="text-sm font-medium text-gray-800">{product.stock > 0 ? `Em estoque (${product.stock})` : 'Sob encomenda'}</p>
            </div>
          </div>
        </div>
      </div>

      {product.description && (
        <div className="mt-12 bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Descrição</h2>
          <div className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</div>
        </div>
      )}
    </div>
  );
}
