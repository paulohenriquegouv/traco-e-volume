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
    <div className="card-3d group bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Image */}
      <Link href={`/produtos/${product.slug}`} className="relative block aspect-square bg-gray-50 overflow-hidden">
        <img
          src={image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Sem isto nao fica claro que a imagem leva ao produto. No mouse aparece
            ao passar por cima; no celular, onde nao existe hover, fica sempre visivel. */}
        <span className="absolute inset-x-0 bottom-0 bg-gray-900/70 text-white text-xs font-medium py-2 text-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
          Ver detalhes
        </span>
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

        <div className="space-y-2">
          <Link
            href={`/produtos/${product.slug}`}
            className="btn w-full border border-gray-200 hover:border-primary-300 hover:text-primary-700 text-gray-700 text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Ver detalhes
          </Link>

          <button
            onClick={() => addItem(product)}
            className="btn-3d w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}