'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function Conteudo() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';

  const [estado, setEstado] = useState('conferindo'); // conferindo | valido | invalido | pronto
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const ic = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  // Confere o link antes de mostrar o formulário: melhor avisar que expirou
  // agora do que depois de a pessoa escolher uma senha nova
  useEffect(() => {
    if (!token) { setEstado('invalido'); setErro('Link sem token.'); return; }
    fetch(`/api/conta/senha?token=${encodeURIComponent(token)}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok || !d.valido) throw new Error(d.erro || 'Link inválido.');
        setEmail(d.email);
        setEstado('valido');
      })
      .catch(e => { setErro(e.message); setEstado('invalido'); });
  }, [token]);

  const salvar = async (e) => {
    e.preventDefault();
    setErro(''); setSalvando(true);
    try {
      const res = await fetch('/api/conta/senha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.erro || 'Não foi possível redefinir.');
      setEstado('pronto');
      setTimeout(() => router.push('/entrar'), 2500);
    } catch (err) { setErro(err.message); } finally { setSalvando(false); }
  };

  return (
    <div className="container-custom py-10 md:py-16">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
          {estado === 'conferindo' && (
            <p className="text-gray-500 text-sm py-4">
              <span className="spinner mr-2" aria-hidden="true" />Conferindo o link...
            </p>
          )}

          {estado === 'invalido' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h1>
              <p className="text-gray-600 text-sm mb-1">{erro}</p>
              <p className="text-sm text-gray-500 mb-6">
                Links de redefinição valem por 1 hora e só podem ser usados uma vez.
              </p>
              <Link href="/esqueci-senha" className="btn-3d inline-block bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
                Pedir um novo link
              </Link>
            </>
          )}

          {estado === 'pronto' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Senha alterada</h1>
              <p className="text-gray-600 text-sm mb-6">Levando você para a tela de entrada...</p>
              <Link href="/entrar" className="btn text-primary-600 font-medium text-sm">Entrar agora</Link>
            </>
          )}

          {estado === 'valido' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Criar nova senha</h1>
              <p className="text-sm text-gray-500 mb-6">
                Para a conta <strong className="text-gray-700">{email}</strong>
              </p>

              <form onSubmit={salvar} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                  <div className="relative">
                    <input
                      type={verSenha ? 'text' : 'password'}
                      required
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      className={ic + ' pr-20'}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button type="button" onClick={() => setVerSenha(v => !v)}
                      className="btn absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-800 px-2 py-1">
                      {verSenha ? 'ocultar' : 'mostrar'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Pelo menos 8 caracteres.</p>
                </div>

                {erro && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{erro}</div>}

                <button type="submit" disabled={salvando} aria-busy={salvando || undefined}
                  className="btn-3d w-full inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-medium disabled:opacity-75">
                  {salvando && <span className="spinner" aria-hidden="true" />}
                  {salvando ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div className="container-custom py-20 text-center text-gray-500">Carregando...</div>}>
      <Conteudo />
    </Suspense>
  );
}
