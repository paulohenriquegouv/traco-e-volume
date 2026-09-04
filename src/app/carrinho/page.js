'use client';

import Link from 'next/link';
import { useCart } from '@/components/CartContext';

export default function CartPage() {
  const { items, updateQuantity, removeItem, total, clearCart, loaded } = useCart();

  if (!loaded) {
    return (
      <div className="container-custom py-20">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-6"></div>
          <p className="text-gray-500">Carregando carrinho...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-custom py-20">
        <div className="max-w-md mx-auto text-center">
          <svg className="w-20 h-20 mx-auto text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Carrinho Vazio</h1>
          <p className="text-gray-500 mb-6">Seu carrinho está vazio. Explore nossos produtos!</p>
          <Link href="/produtos" className="btn-3d bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-medium inline-block">
            Ver Produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8 md:py-12">
      <div className="text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-primary-600">Início</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-600">Carrinho</span>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Carrinho</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.product_id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
              <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                <img src={item.image || '/placeholder.svg'} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/produtos/${item.slug}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 line-clamp-1">{item.name}</Link>
                <p className="text-sm font-bold text-gray-900 mt-1">{Number(item.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-gray-200 rounded-md">
                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="px-2 py-1 text-gray-500 hover:text-gray-900 text-sm">−</button>
                    <span className="px-2 py-1 text-gray-900 text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="px-2 py-1 text-gray-500 hover:text-gray-900 text-sm">+</button>
                  </div>
                  <button onClick={() => removeItem(item.product_id)} className="text-gray-400 hover:text-red-500 text-sm">Remover</button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 h-fit">
          <h3 className="font-bold text-gray-900 mb-4">Resumo</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Itens ({items.reduce((s, i) => s + i.quantity, 0)})</span>
              <span className="font-medium text-gray-900">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Frete</span>
              <span className="text-gray-400">Calcular no checkout</span>
            </div>
            <hr className="border-gray-100" />
            <div className="flex justify-between text-base font-bold text-gray-900">
              <span>Total</span>
              <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>
          <Link href="/checkout" className="mt-6 block w-full text-center bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-medium transition-colors">
            Finalizar Pedido
          </Link>
          <button onClick={clearCart} className="mt-3 block w-full text-center text-gray-400 hover:text-red-500 text-sm py-2">
            Limpar Carrinho
          </button>
        </div>
      </div>
    </div>
  );
}