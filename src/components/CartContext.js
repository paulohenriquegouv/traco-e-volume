'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Carrega carrinho do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tv_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Erro ao carregar carrinho:', e);
    }
    setLoaded(true);
  }, []);

  // Salva no localStorage quando muda
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('tv_cart', JSON.stringify(items));
    }
  }, [items, loaded]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, {
        product_id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '',
        quantity,
      }];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) {
      setItems(prev => prev.filter(i => i.product_id !== productId));
      return;
    }
    setItems(prev => prev.map(i =>
      i.product_id === productId ? { ...i, quantity } : i
    ));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count, loaded }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de CartProvider');
  return context;
}