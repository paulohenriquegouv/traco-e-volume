'use client';

import { useEffect, useState } from 'react';

export default function MeusDados() {
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  useEffect(() => {
    fetch('/api/conta').then(r => r.json()).then(d => {
      if (d.autenticado) setF({ ...d.cliente, senhaAtual: '', senhaNova: '' });
    });
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setErro(''); setMsg(''); setSalvando(true);
    try {
      const res = await fetch('/api/conta/dados', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.erro || 'Não foi possível salvar.');
      setMsg(d.mensagem || 'Dados atualizados.');
      setF(v => ({ ...v, senhaAtual: '', senhaNova: '' }));
    } catch (err) { setErro(err.message); } finally { setSalvando(false); }
  };

  if (!f) return <p className="text-sm text-gray-400"><span className="spinner mr-2" aria-hidden="true" />Carregando...</p>;

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-bold text-gray-900">Meus dados</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
          <input type="text" value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} className={ic} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input type="email" value={f.email} className={ic + ' bg-gray-50 text-gray-500'} readOnly />
          <p className="text-xs text-gray-400 mt-1">
            O e-mail identifica sua conta e os pedidos. Para trocar, fale com a gente.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input type="tel" value={f.telefone} onChange={e => setF({ ...f, telefone: e.target.value })} className={ic} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
            <input type="text" value={f.documento} onChange={e => setF({ ...f, documento: e.target.value })} className={ic} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-bold text-gray-900">Trocar senha</h2>
        <p className="text-sm text-gray-500 -mt-2">Deixe em branco para manter a senha atual.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
            <input type="password" value={f.senhaAtual} onChange={e => setF({ ...f, senhaAtual: e.target.value })} className={ic} autoComplete="current-password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <input type="password" value={f.senhaNova} onChange={e => setF({ ...f, senhaNova: e.target.value })} className={ic} autoComplete="new-password" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-3">Comunicações</h2>
        <label className="flex items-start gap-2.5 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={!!f.aceitaMarketing}
            onChange={e => setF({ ...f, aceitaMarketing: e.target.checked })}
            className="mt-1"
          />
          <span>
            Quero receber novidades e promoções por e-mail.
            <span className="block text-xs text-gray-400 mt-0.5">
              Você pode mudar isso quando quiser, e todo e-mail traz link para cancelar.
            </span>
          </span>
        </label>
      </div>

      {erro && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{erro}</div>}
      {msg && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{msg}</div>}

      <button type="submit" disabled={salvando} aria-busy={salvando || undefined}
        className="btn-3d inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-75">
        {salvando && <span className="spinner" aria-hidden="true" />}
        {salvando ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  );
}
