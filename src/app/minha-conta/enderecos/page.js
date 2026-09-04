'use client';

import { useEffect, useRef, useState } from 'react';

const VAZIO = { apelido: '', zip: '', address: '', number: '', complement: '', neighborhood: '', city: '', state: '' };

export default function MeusEnderecos() {
  const [enderecos, setEnderecos] = useState(null);
  const [form, setForm] = useState(null); // null = formulário fechado
  const [cepStatus, setCepStatus] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const campoNumero = useRef(null);

  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  const carregar = () =>
    fetch('/api/conta/enderecos').then(r => r.json()).then(d => setEnderecos(d.enderecos || []));

  useEffect(() => { carregar().catch(() => setEnderecos([])); }, []);

  // Mesmo comportamento do checkout: CEP preenche o resto, nada trava
  const mudarCep = (valor) => {
    const d = valor.replace(/\D/g, '').slice(0, 8);
    const formatado = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    setForm(f => ({ ...f, zip: formatado }));
    if (d.length < 8) { setCepStatus(''); return; }
    buscarCep(d);
  };

  const buscarCep = async (cep) => {
    setCepStatus('buscando');
    try {
      const d = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r => r.json());
      if (d.erro) { setCepStatus('erro'); return; }
      setForm(f => ({
        ...f,
        address: d.logradouro || f.address,
        neighborhood: d.bairro || f.neighborhood,
        city: d.localidade || f.city,
        state: d.uf || f.state,
      }));
      setCepStatus('ok');
      setTimeout(() => campoNumero.current?.focus(), 100);
    } catch { setCepStatus('erro'); }
  };

  const salvar = async (e) => {
    e.preventDefault();
    setErro(''); setSalvando(true);
    try {
      const editando = !!form.id;
      const res = await fetch('/api/conta/enderecos', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.erro || 'Não foi possível salvar.');
      setForm(null); setCepStatus('');
      await carregar();
    } catch (err) { setErro(err.message); } finally { setSalvando(false); }
  };

  const excluir = async (id) => {
    await fetch(`/api/conta/enderecos?id=${id}`, { method: 'DELETE' });
    await carregar();
  };

  const tornarPadrao = async (id) => {
    await fetch('/api/conta/enderecos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, apenasPadrao: true }),
    });
    await carregar();
  };

  if (enderecos === null) {
    return <p className="text-sm text-gray-400"><span className="spinner mr-2" aria-hidden="true" />Carregando endereços...</p>;
  }

  return (
    <div className="space-y-4">
      {enderecos.length === 0 && !form && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <h2 className="font-bold text-gray-900 mb-1">Nenhum endereço salvo</h2>
          <p className="text-sm text-gray-500 mb-5">Salve um endereço e o checkout já vem preenchido.</p>
          <button onClick={() => setForm({ ...VAZIO })} className="btn-3d bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
            Adicionar endereço
          </button>
        </div>
      )}

      {enderecos.map(e => (
        <div key={e.id} className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {e.apelido && <span className="font-medium text-gray-900 text-sm">{e.apelido}</span>}
                {!!e.padrao && (
                  <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium">Padrão</span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {e.address}{e.number ? `, ${e.number}` : ''}{e.complement ? ` — ${e.complement}` : ''}<br />
                {e.neighborhood ? `${e.neighborhood}, ` : ''}{e.city}/{e.state} · CEP {e.zip}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-50">
            <button onClick={() => { setForm({ ...e }); setCepStatus(''); }} className="btn text-sm text-primary-600 font-medium">Editar</button>
            {!e.padrao && (
              <button onClick={() => tornarPadrao(e.id)} className="btn text-sm text-gray-500 hover:text-gray-800">Tornar padrão</button>
            )}
            <button onClick={() => excluir(e.id)} className="btn text-sm text-gray-400 hover:text-red-600 ml-auto">Excluir</button>
          </div>
        </div>
      ))}

      {enderecos.length > 0 && !form && (
        <button onClick={() => setForm({ ...VAZIO })} className="btn w-full border border-dashed border-gray-300 hover:border-primary-400 text-gray-600 hover:text-primary-700 py-3 rounded-xl text-sm font-medium">
          + Adicionar outro endereço
        </button>
      )}

      {form && (
        <form onSubmit={salvar} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-bold text-gray-900">{form.id ? 'Editar endereço' : 'Novo endereço'}</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apelido</label>
            <input type="text" value={form.apelido} onChange={e => setForm({ ...form, apelido: e.target.value })} className={ic} placeholder="Casa, trabalho..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP *</label>
              <input type="text" inputMode="numeric" value={form.zip} onChange={e => mudarCep(e.target.value)} className={ic} placeholder="00000-000" maxLength={9} />
              {cepStatus === 'buscando' && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
              {cepStatus === 'ok' && <p className="text-xs text-green-600 mt-1">Endereço preenchido.</p>}
              {cepStatus === 'erro' && <p className="text-xs text-amber-600 mt-1">CEP não encontrado. Preencha à mão.</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço *</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input type="text" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} className={ic} ref={campoNumero} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
              <input type="text" value={form.complement} onChange={e => setForm({ ...form, complement: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input type="text" value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
              <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
              <input type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} className={ic} maxLength={2} placeholder="UF" />
            </div>
          </div>

          {erro && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{erro}</div>}

          <div className="flex gap-3">
            <button type="submit" disabled={salvando} aria-busy={salvando || undefined}
              className="btn-3d inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-75">
              {salvando && <span className="spinner" aria-hidden="true" />}
              {salvando ? 'Salvando...' : 'Salvar endereço'}
            </button>
            <button type="button" onClick={() => { setForm(null); setErro(''); setCepStatus(''); }}
              className="btn px-6 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
