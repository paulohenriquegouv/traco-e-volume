'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartContext';

export default function Header() {
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              T&V
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">Traço & Volume</span>
              <span className="hidden sm:inline text-xs text-gray-400 ml-1">impressão 3D</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
              Início
            </Link>
            <Link href="/produtos" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
              Produtos
            </Link>
            <a
              href={process.env.NEXT_PUBLIC_INSTAGRAM || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              Instagram
            </a>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-4">
            <Link
              href="/carrinho"
              className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-fadeIn">
          <div className="container-custom py-4 space-y-3">
            <Link href="/" className="block text-sm font-medium text-gray-600 hover:text-primary-600" onClick={() => setMenuOpen(false)}>
              Início
            </Link>
            <Link href="/produtos" className="block text-sm font-medium text-gray-600 hover:text-primary-600" onClick={() => setMenuOpen(false)}>
              Produtos
            </Link>
            <a href={process.env.NEXT_PUBLIC_INSTAGRAM || '#'} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-gray-600 hover:text-primary-600">
              Instagram
            </a>
            <Link href="/pedido" className="block text-sm font-medium text-gray-600 hover:text-primary-600" onClick={() => setMenuOpen(false)}>
              Meu Pedido
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}