'use client';

import { useEffect, useState } from 'react';
import PainelFrete from './PainelFrete';

/**
 * Tudo que é parâmetro da loja em um lugar só.
 *
 * Antes o frete era a única coisa editável, e morava num item solto do menu; o
 * resto — nome da loja, textos da vitrine, formas de pagamento, prazos — estava
 * escrito no código, e mudar uma vírgula pedia deploy.
 *
 * Os campos são declarados em dados, não em JSX repetido: adicionar um parâmetro
 * novo é acrescentar uma linha aqui e outra no padrão de src/lib/config-loja.js.
 */

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500';

const BLOCOS = {
  loja: {
    aba: 'Loja',
    descricao: 'Como a loja se apresenta e onde o cliente encontra você.',
    campos: [
      { campo: 'nome', rotulo: 'Nome da loja', ajuda: 'Aparece no site, nos e-mails e no pedido.' },
      { campo: 'email', rotulo: 'E-mail de contato', tipo: 'email' },
      { campo: 'whatsapp', rotulo: 'WhatsApp', ajuda: 'Link completo (https://wa.me/55...) ou só os números.' },
      { campo: 'cidade_origem', rotulo: 'Cidade de onde você posta', largura: 'metade',
        ajuda: 'Guardado para quando entrar a cotação automática. Hoje não entra no cálculo.' },
      { campo: 'uf_origem', rotulo: 'UF', largura: 'metade' },
    ],
  },
  vitrine: {
    aba: 'Vitrine',
    descricao: 'Os textos da página inicial. Mudam na hora, sem republicar o site.',
    campos: [
      { campo: 'selo', rotulo: 'Selo acima do título' },
      { campo: 'titulo', rotulo: 'Título do banner' },
      { campo: 'subtitulo', rotulo: 'Subtítulo', tipo: 'textarea' },
      { campo: 'botao_produtos', rotulo: 'Botão principal', largura: 'metade' },
      { campo: 'botao_contato', rotulo: 'Botão de contato', largura: 'metade' },
      { campo: 'titulo_categorias', rotulo: 'Título da seção de categorias', largura: 'metade' },
    ],
  },
  pagamento: {
    aba: 'Pagamento',
    descricao: 'O que o cliente pode escolher na hora de pagar.',
    campos: [
      { campo: 'pix_ativo', rotulo: 'Aceitar Pix', tipo: 'booleano' },
      { campo: 'cartao_ativo', rotulo: 'Aceitar cartão de crédito', tipo: 'booleano' },
      { campo: 'boleto_ativo', rotulo: 'Aceitar boleto', tipo: 'booleano' },
      { campo: 'max_parcelas', rotulo: 'Máximo de parcelas', tipo: 'numero', largura: 'metade',
        ajuda: 'De 1 a 12 — o Mercado Pago não vai além disso.' },
      { campo: 'parcela_minima', rotulo: 'Parcela mínima (R$)', tipo: 'dinheiro', largura: 'metade',
        ajuda: 'Zero desliga. Evita parcela pequena demais, que a taxa come inteira.' },
    ],
  },
  prazos: {
    aba: 'Prazos e status',
    descricao: 'O que o cliente lê enquanto acompanha o pedido.',
    campos: [
      { campo: 'producao_dias', rotulo: 'Dias de produção antes do envio', tipo: 'numero', largura: 'metade',
        ajuda: 'Somado ao prazo da entrega. Zero não aparece para o cliente.' },
      { campo: 'texto_aguardando_pagamento', rotulo: 'Aguardando pagamento', largura: 'metade' },
      { campo: 'texto_pago', rotulo: 'Pagamento confirmado', largura: 'metade' },
      { campo: 'texto_em_processamento', rotulo: 'Em produção', largura: 'metade' },
      { campo: 'texto_enviado', rotulo: 'Enviado', largura: 'metade' },
      { campo: 'texto_entregue', rotulo: 'Entregue', largura: 'metade' },
      { campo: 'texto_cancelado', rotulo: 'Cancelado', largura: 'metade' },
    ],
  },
};

// A entrega entra no meio: é o parâmetro que mais muda depois que a loja abre.
const ABAS = ['loja', 'vitrine', 'entrega', 'pagamento', 'prazos'];
const NOME_DA_ABA = { ...Object.fromEntries(Object.entries(BLOCOS).map(([k, b]) => [k, b.aba])), entrega: 'Entrega' };

function Campo({ def, valor, aoMudar }) {
  const comum = { className: ic, value: valor ?? '', onChange: e => aoMudar(e.target.value) };

  if (def.tipo === 'booleano') {
    return (
      <label className="flex items-center gap-3 py-2 cursor-pointer">
        <input
          type="checkbox"
          checked={valor === true || valor === 'true'}
          onChange={e => aoMudar(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm font-medium text-gray-700">{def.rotulo}</span>
      </label>
    );
  }

  return (
    <div className={def.largura === 'metade' ? '' : 'sm:col-span-2'}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{def.rotulo}</label>
      {def.tipo === 'textarea' ? (
        <textarea rows={3} {...comum} />
      ) : (
        <input
          type={def.tipo === 'numero' || def.tipo === 'dinheiro' ? 'number' : def.tipo || 'text'}
          min={def.tipo === 'numero' || def.tipo === 'dinheiro' ? '0' : undefined}
          step={def.tipo === 'dinheiro' ? '0.01' : def.tipo === 'numero' ? '1' : undefined}
          {...comum}
        />
      )}
      {def.ajuda && <p className="text-xs text-gray-400 mt-1">{def.ajuda}</p>}
    </div>
  );
}

function PainelBloco({ chave, valores, aoSalvar }) {
  const bloco = BLOCOS[chave];
  const [form, setForm] = useState(valores);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  // Trocar de aba e voltar traz o que está salvo, não um rascunho meio feito.
  useEffect(() => { setForm(valores); setAviso(''); setErro(''); }, [valores, chave]);

  const enviar = async (e) => {
    e.preventDefault();
    setSalvando(true); setAviso(''); setErro('');
    try {
      await aoSalvar(chave, form);
      setAviso('Salvo.');
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar}>
      <p className="text-sm text-gray-500 mb-6">{bloco.descricao}</p>

      {aviso && <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm mb-6">{aviso}</div>}
      {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{erro}</div>}

      <div className="bg-white rounded-xl border border-gray-100 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bloco.campos.map(def => (
          <Campo
            key={def.campo}
            def={def}
            valor={form?.[def.campo]}
            aoMudar={v => setForm(f => ({ ...f, [def.campo]: v }))}
          />
        ))}
      </div>

      <button type="submit" disabled={salvando}
        className="mt-6 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-70">
        {salvando ? 'Salvando...' : 'Salvar'}
      </button>
      <p className="text-xs text-gray-400 mt-3">
        Campo deixado em branco volta ao texto padrão — a loja nunca fica com um pedaço vazio.
      </p>
    </form>
  );
}

export default function AdminConfiguracoesPage() {
  const [aba, setAba] = useState('loja');
  const [config, setConfig] = useState(null);
  const [erro, setErro] = useState('');

  // O menu e os atalhos antigos apontam para #entrega, #pagamento etc.
  useEffect(() => {
    const alvo = String(window.location.hash || '').replace('#', '');
    if (ABAS.includes(alvo)) setAba(alvo);
  }, []);

  useEffect(() => {
    fetch('/api/admin/configuracoes')
      .then(r => r.json())
      .then(d => { if (d.error) setErro(d.error); else setConfig(d.config); })
      .catch(() => setErro('Não foi possível carregar as configurações.'));
  }, []);

  const salvar = async (bloco, valores) => {
    const r = await fetch('/api/admin/configuracoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bloco, valores }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Não foi possível salvar.');
    // Guarda o que o servidor devolveu, já normalizado: é o que está no banco.
    setConfig(c => ({ ...c, [bloco]: d.valor }));
  };

  const trocarAba = (nova) => {
    setAba(nova);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#${nova}`);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tudo que a loja usa como parâmetro fica aqui. O que você não mexer continua como está hoje.
      </p>

      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {ABAS.map(a => (
          <button
            key={a}
            type="button"
            onClick={() => trocarAba(a)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              aba === a
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {NOME_DA_ABA[a]}
          </button>
        ))}
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{erro}</div>}

      {aba === 'entrega' ? (
        <PainelFrete />
      ) : !config ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : (
        <PainelBloco chave={aba} valores={config[aba]} aoSalvar={salvar} />
      )}
    </div>
  );
}
