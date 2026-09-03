'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';

// O brick monta iframes do Mercado Pago: só faz sentido no navegador
const CardPaymentBrick = dynamic(() => import('@/components/CardPaymentBrick'), {
  ssr: false,
  loading: () => <p className="text-sm text-gray-500 py-4">Carregando formulário de cartão...</p>,
});

// Mensagens do Mercado Pago traduzidas para algo que o cliente entenda e possa agir
const MOTIVO_RECUSA = {
  cc_rejected_insufficient_amount: 'Cartão sem limite disponível para esta compra.',
  cc_rejected_bad_filled_card_number: 'Número do cartão incorreto.',
  cc_rejected_bad_filled_date: 'Data de validade incorreta.',
  cc_rejected_bad_filled_security_code: 'Código de segurança incorreto.',
  cc_rejected_bad_filled_other: 'Dados do cartão incorretos. Confira e tente de novo.',
  cc_rejected_call_for_authorize: 'Autorize o pagamento com o seu banco e tente novamente.',
  cc_rejected_card_disabled: 'Cartão desativado. Fale com o seu banco.',
  cc_rejected_high_risk: 'Pagamento recusado por segurança. Tente outro meio de pagamento.',
  cc_rejected_max_attempts: 'Muitas tentativas com este cartão. Tente outro.',
  cc_rejected_duplicated_payment: 'Já existe um pagamento igual a este. Confira antes de tentar de novo.',
};

const METHODS = [
  { id: 'pix', label: 'Pix', desc: 'Pagamento instantâneo via QR Code.' },
  { id: 'card', label: 'Cartão de Crédito', desc: 'Parcele em até 12x.' },
  { id: 'boleto', label: 'Boleto Bancário', desc: 'Vence em 3 dias úteis.' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [f, setF] = useState({ name: '', email: '', phone: '', document: '', address: '', city: '', state: '', zip: '' });
  const [method, setMethod] = useState('pix');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (items.length === 0) {
    return (
      <div className="container-custom py-20 text-center">
        <h1 className="text-2xl font-bold">Carrinho Vazio</h1>
        <p className="text-gray-500 mb-6">Adicione produtos.</p>
        <Link href="/produtos" className="bg-primary-600 text-white px-8 py-3 rounded-lg font-medium inline-block">Ver Produtos</Link>
      </div>
    );
  }

  const dadosPessoaisOk = f.name.trim() && f.email.trim();

  // Usado pelos dois fluxos: Pix/boleto pelo botão, cartão pelo brick (que manda o token)
  const enviarPedido = async (extra = {}) => {
    setError('');
    const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(i => ({ product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity })), customer_name: f.name, customer_email: f.email, customer_phone: f.phone, customer_document: f.document, shipping_address: { address: f.address, city: f.city, state: f.state, zip: f.zip }, payment_method: method, shipping: 0, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro no pagamento');

    // No cartão o MP responde na hora: recusa vem com sucesso HTTP, mas sem pagamento.
    // Sem isto o cliente veria "Pedido Confirmado" com o cartão negado.
    if (data.status === 'rejected') {
      throw new Error(MOTIVO_RECUSA[data.status_detail] || 'Pagamento recusado pela operadora. Tente outro cartão.');
    }

    clearCart();
    const p = new URLSearchParams({ order_id: data.order_id, method: data.payment_method });
    if (data.qr_code) p.set('qr_code', data.qr_code);
    if (data.boleto_url) p.set('boleto_url', data.boleto_url);
    if (data.status) p.set('status', data.status);
    router.push('/checkout-sucesso?' + p);
    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (method === 'card') return; // no cartão quem envia é o brick
    setLoading(true); setError('');
    if (!dadosPessoaisOk) { setError('Nome e e-mail são obrigatórios.'); setLoading(false); return; }
    try {
      await enviarPedido();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  // O brick já validou e tokenizou o cartão; aqui só criamos o pagamento
  const handleCartao = async (dadosCartao) => {
    if (!dadosPessoaisOk) {
      setError('Preencha nome e e-mail antes de pagar.');
      throw new Error('dados pessoais incompletos');
    }
    try {
      await enviarPedido(dadosCartao);
    } catch (err) {
      setError(err.message);
      throw err; // o brick precisa saber que falhou para reabilitar o botão
    }
  };
const ic = "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div className="container-custom py-8 md:py-12">
      <div className="text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-primary-600">Início</Link><span className="mx-2">/</span>
        <Link href="/carrinho" className="hover:text-primary-600">Carrinho</Link><span className="mx-2">/</span>
        <span className="text-gray-600">Checkout</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Finalizar Pedido</h1>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" required value={f.name} onChange={e => setF({...f, name: e.target.value})} className={ic} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                <input type="email" required value={f.email} onChange={e => setF({...f, email: e.target.value})} className={ic} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="tel" value={f.phone} onChange={e => setF({...f, phone: e.target.value})} className={ic} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                <input type="text" value={f.document} onChange={e => setF({...f, document: e.target.value})} className={ic} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Endereço de Entrega</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input type="text" value={f.address} onChange={e => setF({...f, address: e.target.value})} className={ic} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input type="text" value={f.city} onChange={e => setF({...f, city: e.target.value})} className={ic} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <input type="text" value={f.state} onChange={e => setF({...f, state: e.target.value})} className={ic} maxLength={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input type="text" value={f.zip} onChange={e => setF({...f, zip: e.target.value})} className={ic} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Forma de Pagamento</h3>
            <div className="space-y-3">
              {METHODS.map(m => (
                <label key={m.id} className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer ${method === m.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="mt-0.5" />
                  <div><p className="font-medium text-gray-900">{m.label}</p><p className="text-sm text-gray-500">{m.desc}</p></div>
                </label>
              ))}
            </div>
          </div>
          {method === 'card' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-1">Dados do Cartão</h3>
              <p className="text-sm text-gray-500 mb-4">
                Formulário seguro do Mercado Pago — os dados do cartão não passam pela nossa loja.
              </p>
              {dadosPessoaisOk ? (
                <CardPaymentBrick amount={total} email={f.email} onPagar={handleCartao} />
              ) : (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-lg text-sm">
                  Preencha nome e e-mail acima para liberar o pagamento com cartão.
                </div>
              )}
            </div>
          )}

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>}

          {method !== 'card' && (
            <button type="submit" disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-medium disabled:opacity-50">
              {loading ? 'Processando...' : 'Finalizar Pedido'}
            </button>
          )}
        </form>
        <aside className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Resumo do Pedido</h3>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.product_id} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate max-w-[200px]">{item.name} x{item.quantity}</span>
                  <span className="font-medium text-gray-900">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              ))}
              <hr className="border-gray-100" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}