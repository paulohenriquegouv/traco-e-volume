'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';
import { useConfigLoja } from '@/components/ConfigLoja';
import { metodosAtivos, parcelasPara } from '@/lib/config-loja';

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

const dinheiro = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  // Formas de pagamento e limite de parcelas saem de /admin/configuracoes.
  const { config } = useConfigLoja();
  const METHODS = metodosAtivos(config.pagamento);
  const [f, setF] = useState({ name: '', email: '', phone: '', document: '', address: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip: '' });
  const [cepStatus, setCepStatus] = useState('');
  const campoNumero = useRef(null);
  const [cliente, setCliente] = useState(null);
  const [enderecosSalvos, setEnderecosSalvos] = useState([]);

  // Quem esta logado nao redigita nada: dados e endereco padrao ja vem preenchidos
  useEffect(() => {
    let vivo = true;
    fetch('/api/conta')
      .then(r => r.json())
      .then(d => {
        if (!vivo || !d.autenticado) return;
        setCliente(d.cliente);
        setF(prev => ({
          ...prev,
          name: prev.name || d.cliente.nome,
          email: prev.email || d.cliente.email,
          phone: prev.phone || d.cliente.telefone,
          document: prev.document || d.cliente.documento,
        }));
        return fetch('/api/conta/enderecos').then(r => r.json()).then(e => {
          if (!vivo) return;
          const lista = e.enderecos || [];
          setEnderecosSalvos(lista);
          const padrao = lista.find(x => x.padrao) || lista[0];
          if (padrao) aplicarEndereco(padrao);
        });
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const aplicarEndereco = (e) => {
    const cep = String(e.zip || '').replace(/\D/g, '');
    setF(prev => ({
      ...prev,
      zip: cep.length > 5 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep,
      address: e.address || '',
      number: e.number || '',
      complement: e.complement || '',
      neighborhood: e.neighborhood || '',
      city: e.city || '',
      state: e.state || '',
    }));
  };
  const [method, setMethod] = useState('pix');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Checkout em duas etapas. Antes era tudo numa tela so, e no celular o resumo
  // do pedido -- que fica numa coluna ao lado no computador -- caia DEPOIS do
  // bloco de pagamento: a pessoa escolhia como pagar antes de ver quanto era.
  // Agora o total fecha a primeira etapa, e a segunda so trata de pagar.
  const [etapa, setEtapa] = useState('dados');

  const irPara = (nova) => {
    setEtapa(nova);
    setError('');
    // Trocar de etapa sem subir deixaria a pessoa no meio da tela nova.
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // O admin pode ter desligado a forma que estava escolhida (ou o Pix, que e o
  // inicial): cair na primeira ativa evita um checkout sem nenhuma opcao marcada.
  const idsAtivos = METHODS.map(m => m.id).join(',');
  useEffect(() => {
    const ids = idsAtivos.split(',');
    if (!ids.includes(method)) setMethod(ids[0]);
  }, [idsAtivos, method]);

  // ---------- entrega ----------
  const [entrega, setEntrega] = useState(null);   // resposta do /api/frete
  const [opcaoFrete, setOpcaoFrete] = useState(''); // id escolhido pelo cliente
  const [calculando, setCalculando] = useState(false);
  const [erroFrete, setErroFrete] = useState('');

  // O carrinho vira uma string para o efeito nao disparar a cada render: o array
  // do contexto muda de identidade, o conteudo nao.
  const chaveCarrinho = items.map(i => `${i.product_id}:${i.quantity}`).join(',');
  const uf = f.state.trim().toUpperCase();

  useEffect(() => {
    if (!chaveCarrinho) return;
    let vivo = true;
    setCalculando(true);
    // Um respiro antes de chamar: a UF chega junto com o resto do endereco
    // quando o CEP e encontrado, e sem isso cada tecla no campo Estado viraria
    // uma requisicao.
    const t = setTimeout(() => {
      fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uf,
          items: chaveCarrinho.split(',').map(par => {
            const [product_id, quantity] = par.split(':');
            return { product_id: Number(product_id), quantity: Number(quantity) };
          }),
        }),
      })
        .then(r => r.json())
        .then(d => {
          if (!vivo) return;
          // Erro aqui quase sempre e item que saiu do catalogo. Sem mostrar, o
          // cliente ficaria vendo "informe o CEP" para sempre, e o pedido seria
          // recusado no fim sem que ele soubesse por que.
          if (d.error) { setErroFrete(d.error); setEntrega(null); return; }
          setErroFrete('');
          setEntrega(d);
          setOpcaoFrete(atual => {
            const ids = (d.opcoes || []).map(o => o.id);
            // Escolha do cliente manda, desde que continue existindo. So quando
            // ela some (mudou de UF, retirada desligada) e que voltamos ao
            // padrao: entrega no endereco, que e o que quem digitou um CEP quer.
            if (atual && ids.includes(atual)) return atual;
            return ids.includes('entrega') ? 'entrega' : (ids[0] || '');
          });
        })
        .catch(() => { if (vivo) setErroFrete('Não foi possível calcular o frete agora. Tente de novo em instantes.'); })
        .finally(() => { if (vivo) setCalculando(false); });
    }, 400);
    return () => { vivo = false; clearTimeout(t); };
  }, [chaveCarrinho, uf]);

  const opcoes = entrega?.opcoes || [];
  const escolhida = opcoes.find(o => o.id === opcaoFrete) || null;
  const valorFrete = escolhida ? Number(escolhida.preco) : 0;
  // O subtotal que vale e o do servidor (precos recalculados no banco); o do
  // carrinho serve so enquanto a primeira resposta nao chega.
  const subtotal = entrega ? Number(entrega.subtotal) : total;
  const totalComFrete = Math.round((subtotal + valorFrete) * 100) / 100;

  if (items.length === 0) {
    return (
      <div className="container-custom py-20 text-center">
        <h1 className="text-2xl font-bold">Carrinho Vazio</h1>
        <p className="text-gray-500 mb-6">Adicione produtos.</p>
        <Link href="/produtos" className="bg-primary-600 text-white px-8 py-3 rounded-lg font-medium inline-block">Ver Produtos</Link>
      </div>
    );
  }

  // CEP: formata enquanto digita e, ao completar 8 digitos, busca o endereco.
  // Os campos preenchidos continuam editaveis -- a busca so adianta o trabalho.
  const mudarCep = (valor) => {
    const digitos = valor.replace(/\D/g, '').slice(0, 8);
    const formatado = digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
    setF(prev => ({ ...prev, zip: formatado }));
    if (digitos.length < 8) { setCepStatus(''); return; }
    buscarCep(digitos);
  };

  const buscarCep = async (cep) => {
    setCepStatus('buscando');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await res.json();
      if (d.erro) { setCepStatus('erro'); return; }
      setF(prev => ({
        ...prev,
        address: d.logradouro || prev.address,
        neighborhood: d.bairro || prev.neighborhood,
        city: d.localidade || prev.city,
        state: d.uf || prev.state,
      }));
      setCepStatus('ok');
      // O que falta digitar depois do CEP e o numero: leva o cursor para la
      setTimeout(() => campoNumero.current?.focus(), 100);
    } catch {
      setCepStatus('erro');
    }
  };

  const dadosPessoaisOk = f.name.trim() && f.email.trim();
  const entregaOk = Boolean(escolhida);

  // Usado pelos dois fluxos: Pix/boleto pelo botão, cartão pelo brick (que manda o token)
  const enviarPedido = async (extra = {}) => {
    setError('');
    const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(i => ({ product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity })), customer_name: f.name, customer_email: f.email, customer_phone: f.phone, customer_document: f.document, shipping_address: { address: f.address, number: f.number, complement: f.complement, neighborhood: f.neighborhood, city: f.city, state: f.state, zip: f.zip }, payment_method: method, shipping_option: opcaoFrete, ...extra }),
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
    if (!entregaOk) { setError('Escolha como quer receber o pedido.'); setLoading(false); return; }
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
    if (!entregaOk) {
      setError('Escolha como quer receber o pedido antes de pagar.');
      throw new Error('entrega nao escolhida');
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
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Finalizar Pedido</h1>

      {/* Duas etapas, ditas em voz alta: quem chega aqui precisa saber que ainda
          vai ver o total antes de escolher como paga. */}
      <ol className="flex items-center gap-3 text-sm mb-6">
        <li className={etapa === 'dados' ? 'font-medium text-primary-700' : 'text-gray-400'}>
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs ${etapa === 'dados' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
          Dados e entrega
        </li>
        <li className="text-gray-300" aria-hidden>—</li>
        <li className={etapa === 'pagamento' ? 'font-medium text-primary-700' : 'text-gray-400'}>
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs ${etapa === 'pagamento' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
          Pagamento
        </li>
      </ol>

      {/* Quem ja tem conta nao redigita endereco: entrar traz tudo preenchido.
          Continua dando para comprar sem cadastro -- exigir conta para vender e
          um pedagio que so afasta quem esta com o produto escolhido. */}
      {etapa === 'dados' && !cliente && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-6 text-sm text-primary-900">
          Já tem conta na loja?{' '}
          <Link href="/entrar" className="font-medium underline hover:text-primary-700">Entre aqui</Link>{' '}
          e seus dados e endereços vêm preenchidos. Ou siga preenchendo abaixo, sem cadastro.
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
        <form id="form-checkout" onSubmit={handleSubmit} className="space-y-6">
          {etapa === 'dados' && (<>
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
          {!cliente && (
            <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 text-sm text-primary-900">
              Já tem conta?{' '}
              <a href={`/entrar?destino=${encodeURIComponent('/checkout')}`} className="btn font-medium underline">
                Entre
              </a>{' '}
              e seus dados vêm preenchidos. Comprar sem conta também funciona.
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Endereço de Entrega</h3>

            {enderecosSalvos.length > 0 && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">Endereços salvos</p>
                <div className="flex flex-wrap gap-2">
                  {enderecosSalvos.map(e => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => aplicarEndereco(e)}
                      className="btn text-left border border-gray-200 hover:border-primary-400 rounded-lg px-3 py-2 text-xs text-gray-600"
                    >
                      <span className="block font-medium text-gray-900">{e.apelido || e.city}</span>
                      {e.address}{e.number ? `, ${e.number}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CEP primeiro: preenche o resto sozinho, mas nada fica travado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP{method === 'boleto' ? ' *' : ''}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={f.zip}
                  onChange={e => mudarCep(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  className={ic}
                />
                {cepStatus === 'buscando' && <p className="text-xs text-gray-400 mt-1">Buscando endereço...</p>}
                {cepStatus === 'ok' && <p className="text-xs text-green-600 mt-1">Endereço preenchido — confira e complete o número.</p>}
                {cepStatus === 'erro' && <p className="text-xs text-amber-600 mt-1">CEP não encontrado. Preencha o endereço manualmente.</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço{method === 'boleto' ? ' *' : ''}</label>
                <input type="text" value={f.address} onChange={e => setF({...f, address: e.target.value})} className={ic} placeholder="Rua, avenida..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input type="text" value={f.number} onChange={e => setF({...f, number: e.target.value})} className={ic} ref={campoNumero} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                <input type="text" value={f.complement} onChange={e => setF({...f, complement: e.target.value})} className={ic} placeholder="Apto, bloco, ponto de referência" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input type="text" value={f.neighborhood} onChange={e => setF({...f, neighborhood: e.target.value})} className={ic} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade{method === 'boleto' ? ' *' : ''}</label>
                <input type="text" value={f.city} onChange={e => setF({...f, city: e.target.value})} className={ic} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado{method === 'boleto' ? ' *' : ''}</label>
                <input type="text" value={f.state} onChange={e => setF({...f, state: e.target.value.toUpperCase()})} className={ic} maxLength={2} placeholder="UF" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Entrega</h3>

            {calculando && !opcoes.length && (
              <p className="text-sm text-gray-400"><span className="spinner mr-2" aria-hidden="true" />Calculando...</p>
            )}

            {erroFrete && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{erroFrete}</p>
            )}

            {!calculando && !opcoes.length && !erroFrete && (
              <p className="text-sm text-gray-500">
                Informe o CEP acima para ver as formas de entrega.
              </p>
            )}

            <div className="space-y-3">
              {opcoes.map(o => (
                <label
                  key={o.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer ${opcaoFrete === o.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <input
                    type="radio"
                    name="entrega"
                    value={o.id}
                    checked={opcaoFrete === o.id}
                    onChange={() => setOpcaoFrete(o.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium text-gray-900">{o.nome}</p>
                      <p className="font-medium text-gray-900 shrink-0">
                        {o.preco > 0 ? dinheiro(o.preco) : <span className="text-green-600">Grátis</span>}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {o.detalhe}
                      {o.detalhe && o.prazo_dias > 0 ? ' · ' : ''}
                      {o.prazo_dias > 0 ? `em até ${o.prazo_dias} ${o.prazo_dias === 1 ? 'dia útil' : 'dias úteis'}` : ''}
                    </p>
                    {/* Frete que caiu para zero pelo valor da compra: mostrar o
                        preco cortado deixa claro o que foi economizado */}
                    {o.id === 'entrega' && o.preco === 0 && o.preco_cheio > 0 && (
                      <p className="text-sm text-green-600">
                        Frete grátis nesta compra <span className="text-gray-400 line-through">{dinheiro(o.preco_cheio)}</span>
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {entrega?.falta_para_gratis > 0 && (
              <p className="text-sm text-gray-500 mt-3">
                Faltam <strong className="text-gray-900">{dinheiro(entrega.falta_para_gratis)}</strong> para o frete grátis.
              </p>
            )}

            {calculando && opcoes.length > 0 && (
              <p className="text-xs text-gray-400 mt-3"><span className="spinner mr-2" aria-hidden="true" />Atualizando o frete...</p>
            )}
          </div>

          {/* O total no fim da primeira etapa: no celular a coluna do resumo so
              aparece la embaixo, e sem isto a pessoa avancaria para o pagamento
              sem nunca ter visto a soma. */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">{dinheiro(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
              <span>Frete{escolhida ? ` (${escolhida.nome})` : ''}</span>
              <span className="font-medium text-gray-900">
                {!escolhida
                  ? <span className="text-gray-400 font-normal">informe o CEP</span>
                  : valorFrete > 0 ? dinheiro(valorFrete) : <span className="text-green-600">Grátis</span>}
              </span>
            </div>
            <hr className="border-gray-100 my-3" />
            <div className="flex items-center justify-between font-bold text-lg">
              <span>Total</span>
              <span>{dinheiro(totalComFrete)}</span>
            </div>

            <button
              type="button"
              onClick={() => irPara('pagamento')}
              disabled={!dadosPessoaisOk || !entregaOk}
              className="btn-3d w-full mt-5 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ir para o pagamento
            </button>

            {(!dadosPessoaisOk || !entregaOk) && (
              <p className="text-sm text-amber-700 mt-3">
                {!dadosPessoaisOk
                  ? 'Preencha nome e e-mail para continuar.'
                  : 'Escolha como quer receber o pedido para continuar.'}
              </p>
            )}
          </div>
          </>)}

          {etapa === 'pagamento' && (
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
          )}
        </form>

        {/*
          Daqui para baixo fica FORA do <form> de propósito: o brick do Mercado Pago
          renderiza um <form> próprio, e formulário dentro de formulário é inválido em
          HTML — o navegador descarta o interno e o brick falha ao inicializar. O botão
          continua enviando o formulário pelo atributo form="form-checkout".
        */}
        {etapa === 'pagamento' && (
        <div className="space-y-6">
          {method === 'boleto' && (
            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm">
              O boleto exige CPF/CNPJ e endereço completo (com CEP) — é uma exigência do banco emissor.
            </div>
          )}

          {method === 'card' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-1">Dados do Cartão</h3>
              <p className="text-sm text-gray-500 mb-4">
                Formulário seguro do Mercado Pago — os dados do cartão não passam pela nossa loja.
              </p>
              {/* A entrega vem antes do cartão de propósito: o brick calcula as
                  parcelas com o valor que recebe ao ser criado e não relê depois.
                  Montá-lo antes do frete estar escolhido mostraria "12x de" um
                  total que ainda vai mudar. A key faz o brick renascer se o valor
                  mudar mesmo assim (trocar de entrega para retirada no fim) —
                  apaga o cartão digitado, mas é melhor que parcelar pelo valor errado. */}
              {!dadosPessoaisOk ? (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-lg text-sm">
                  Preencha nome e e-mail acima para liberar o pagamento com cartão.
                </div>
              ) : !entregaOk ? (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-lg text-sm">
                  Escolha como quer receber o pedido acima — o parcelamento é calculado com o frete incluído.
                </div>
              ) : (
                <CardPaymentBrick key={totalComFrete} amount={totalComFrete} parcelas={parcelasPara(totalComFrete, config.pagamento)} email={f.email} onPagar={handleCartao} />
              )}
            </div>
          )}

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>}

          {method !== 'card' && (
            <button
              type="submit"
              form="form-checkout"
              disabled={loading}
              aria-busy={loading || undefined}
              className="btn-3d w-full inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-medium disabled:opacity-75"
            >
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading
                ? (method === 'pix' ? 'Gerando código Pix...' : 'Gerando boleto...')
                : 'Finalizar Pedido'}
            </button>
          )}

          <button type="button" onClick={() => irPara('dados')}
            className="btn w-full text-sm text-gray-500 hover:text-gray-800 underline py-2">
            Voltar e revisar os dados
          </button>
        </div>
        )}
        </div>
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
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">{dinheiro(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Frete{escolhida ? ` (${escolhida.nome})` : ''}</span>
                <span className="font-medium text-gray-900">
                  {!escolhida
                    ? <span className="text-gray-400 font-normal">informe o CEP</span>
                    : valorFrete > 0 ? dinheiro(valorFrete) : <span className="text-green-600">Grátis</span>}
                </span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{dinheiro(totalComFrete)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}