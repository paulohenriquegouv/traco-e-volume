'use client';

import Link from 'next/link';
import { useCart } from './CartContext';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const image = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : '/placeholder.svg';
  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discount = hasDiscount
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  return (
    <div className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300">
      {/* Image */}
      <Link href={`/produtos/${product.slug}`} className="block aspect-square bg-gray-50 overflow-hidden">
        <img
          src={image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-accent-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{discount}%
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="p-4">
        {product.category && (
          <span className="text-xs text-gray-400 uppercase tracking-wider">{product.category}</span>
        )}
        <Link href={`/produtos/${product.slug}`}>
          <h3 className="text-sm font-semibold text-gray-900 mt-1 mb-2 line-clamp-2 hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-gray-900">
            {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {product.compare_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          )}
        </div>

        <button
          onClick={() => addItem(product)}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          Adicionar
        </button>
      </div>
    </div>
  );
}