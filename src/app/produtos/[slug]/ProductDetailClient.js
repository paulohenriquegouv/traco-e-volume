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
  const category = product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : '';
  const description = product.description || product.short_description || '';
  const descPreview = description.length > 120 ? description.slice(0, 120) + '…' : description;
  const msg = [
    `🛒 *${product.name}*`,
    category ? `📂 Categoria: ${category}` : '',
    `💰 Preço: ${price}`,
    descPreview ? `📝 ${descPreview}` : '',
    imageUrl ? `📷 ${imageUrl}` : '',
    product.material ? `🧵 Material: ${product.material}` : '',
    product.dimensions ? `📏 Dimensões: ${product.dimensions}` : '',
    ``,
    `🔗 ${siteUrl}/produtos/${product.slug}`,
  ].filter(Boolean).join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

/**
 * Página do produto.
 *
 * É a única porta para o carrinho: o card da vitrine leva para cá e não vende
 * mais direto, para ninguém comprar sem ver material, peso e dimensões.
 *
 * Por isso os botões de compra ficam no FIM, depois da descrição — o caminho é
 * ler e então decidir. O preço se repete lá embaixo porque, depois de rolar a
 * ficha inteira, o de cima já saiu da tela.
 *
 * A foto, o nome e o preço faltavam nesta página desde o primeiro commit: o
 * comentário {/* Imagens *​/} estava aqui sem bloco nenhum embaixo, e
 * `selectedImage` era um estado que ninguém lia. Passava despercebido enquanto
 * dava para comprar direto da vitrine, onde essas três coisas aparecem.
 */
export default function ProductDetailClient({ product }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);

  const images = product.images?.length > 0 ? product.images : ['/placeholder.svg'];
  const preco = Number(product.price);
  const precoCheio = Number(product.compare_price);
  const hasDiscount = precoCheio > preco;
  const discount = hasDiscount ? Math.round((1 - preco / precoCheio) * 100) : 0;
  const dinheiro = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
          <div className="relative bg-gray-50 rounded-2xl overflow-hidden aspect-square border border-gray-100">
            <img
              src={images[selectedImage] || images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-accent-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                -{discount}%
              </span>
            )}
          </div>

          {/* Miniaturas só quando há mais de uma foto: uma miniatura sozinha
              debaixo da própria imagem não ajuda ninguém a escolher nada. */}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  aria-label={`Ver foto ${i + 1} de ${images.length}`}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    i === selectedImage ? 'border-primary-500' : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ficha */}
        <div>
          {product.category && (
            <Link href={`/produtos?categoria=${encodeURIComponent(product.category)}`}
              className="text-xs text-gray-400 uppercase tracking-wider hover:text-primary-600 capitalize">
              {product.category}
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 mb-3">{product.name}</h1>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-gray-900">{dinheiro(preco)}</span>
            {hasDiscount && (
              <span className="text-lg text-gray-400 line-through">{dinheiro(precoCheio)}</span>
            )}
          </div>

          {product.short_description && (
            <p className="text-gray-600 mb-6 leading-relaxed">{product.short_description}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
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
              <p className="text-sm font-medium text-gray-800">
                {product.stock > 0 ? `Em estoque (${product.stock})` : 'Sob encomenda'}
              </p>
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

      {/* Compra: o último bloco da página, depois de tudo que há para ler. */}
      <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-gray-900">Levar este produto</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{dinheiro(preco)}</span>
            {hasDiscount && <span className="text-sm text-gray-400 line-through">{dinheiro(precoCheio)}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="btn px-4 py-3 text-gray-500 hover:text-gray-900" aria-label="Diminuir quantidade">−</button>
            <span className="px-3 py-3 text-gray-900 font-medium w-12 text-center" aria-live="polite">{quantity}</span>
            <button type="button" onClick={() => setQuantity(quantity + 1)}
              className="btn px-4 py-3 text-gray-500 hover:text-gray-900" aria-label="Aumentar quantidade">+</button>
          </div>
          <button onClick={handleAdd}
            className={`btn-3d flex-1 min-w-[12rem] py-3 rounded-lg font-medium transition-all ${added ? 'bg-green-500 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>
            {added ? '✓ Adicionado!' : 'Adicionar ao Carrinho'}
          </button>
        </div>

        <a href={getWhatsAppLink(product)} target="_blank" rel="noopener noreferrer"
          className="btn-3d mt-3 flex items-center justify-center gap-2 w-full text-center bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Comprar pelo WhatsApp
        </a>
      </div>
    </div>
  );
}
