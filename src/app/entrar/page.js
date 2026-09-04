'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';

/**
 * Entrar e criar conta na mesma página.
 *
 * Separar em duas telas faz a pessoa que errou a porta ter que voltar e procurar
 * a outra — aqui é uma alternância, e o e-mail digitado permanece.
 */
function Conteudo() {
  const router = useRouter();
  const sp = useSearchParams();
  const destino = sp.get('destino') || '/minha-conta';

  const [modo, setModo] = useState(sp.get('modo') === 'cadastrar' ? 'cadastrar' : 'entrar');
  const [f, setF] = useState({ nome: '', email: '', senha: '', telefone: '', documento: '', aceitaMarketing: false });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  const ic = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const res = await fetch('/api/conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: modo, ...f }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Não foi possível concluir.');
      router.push(destino);
      router.refresh();
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="container-custom py-10 md:py-16">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {modo === 'entrar' ? 'Entrar na sua conta' : 'Criar sua conta'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {modo === 'entrar'
              ? 'Acompanhe seus pedidos e compre mais rápido.'
              : 'Seus endereços ficam salvos e o checkout fica mais rápido.'}
          </p>

          <form onSubmit={enviar} className="space-y-4">
            {modo === 'cadastrar' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                <input type="text" required value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} className={ic} autoComplete="name" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
              <input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} className={ic} autoComplete="email" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
              <div className="relative">
                <input
                  type={verSenha ? 'text' : 'password'}
                  required
                  value={f.senha}
                  onChange={e => setF({ ...f, senha: e.target.value })}
                  className={ic + ' pr-20'}
                  autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setVerSenha(v => !v)}
                  className="btn absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-800 px-2 py-1"
                >
                  {verSenha ? 'ocultar' : 'mostrar'}
                </button>
              </div>
              {modo === 'cadastrar' && (
                <p className="text-xs text-gray-400 mt-1">Pelo menos 8 caracteres.</p>
              )}
            </div>

            {modo === 'cadastrar' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input type="tel" value={f.telefone} onChange={e => setF({ ...f, telefone: e.target.value })} className={ic} autoComplete="tel" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                    <input type="text" value={f.documento} onChange={e => setF({ ...f, documento: e.target.value })} className={ic} />
                  </div>
                </div>

                {/* Desmarcada por padrão: consentimento de marketing precisa ser ato do cliente */}
                <label className="flex items-start gap-2.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.aceitaMarketing}
                    onChange={e => setF({ ...f, aceitaMarketing: e.target.checked })}
                    className="mt-1"
                  />
                  <span>Quero receber novidades e promoções por e-mail. Você pode cancelar quando quiser.</span>
                </label>
              </>
            )}

            {erro && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{erro}</div>}

            <button
              type="submit"
              disabled={carregando}
              aria-busy={carregando || undefined}
              className="btn-3d w-full inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-medium disabled:opacity-75"
            >
              {carregando && <span className="spinner" aria-hidden="true" />}
              {carregando
                ? (modo === 'entrar' ? 'Entrando...' : 'Criando conta...')
                : (modo === 'entrar' ? 'Entrar' : 'Criar conta')}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
            {modo === 'entrar' ? (
              <>
                Ainda não tem conta?{' '}
                <button type="button" onClick={() => { setModo('cadastrar'); setErro(''); }} className="btn text-primary-600 font-medium">
                  Criar agora
                </button>
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <button type="button" onClick={() => { setModo('entrar'); setErro(''); }} className="btn text-primary-600 font-medium">
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-5">
          Quer só consultar um pedido?{' '}
          <Link href="/pedido" className="text-primary-600">Buscar sem entrar</Link>
        </p>
      </div>
    </div>
  );
}

export default function EntrarPage() {
  return (
    <Suspense fallback={<div className="container-custom py-20 text-center text-gray-500">Carregando...</div>}>
      <Conteudo />
    </Suspense>
  );
}
