'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const ic = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  const enviar = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      await fetch('/api/conta/senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setEnviado(true);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="container-custom py-10 md:py-16">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
          {enviado ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h1>
              {/* Mensagem igual para conta existente ou não: dizer "esse e-mail não
                  tem cadastro" entregaria a lista de clientes a quem sondar */}
              <p className="text-gray-600 text-sm mb-4">
                Se existir uma conta com <strong className="text-gray-900">{email}</strong>,
                enviamos um link para criar uma nova senha.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                O link vale por 1 hora. Não recebeu? Confira a caixa de spam.
              </p>
              <Link href="/entrar" className="btn text-primary-600 font-medium text-sm">Voltar para entrar</Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Esqueceu a senha?</h1>
              <p className="text-sm text-gray-500 mb-6">
                Informe seu e-mail e enviamos um link para criar uma nova.
              </p>

              <form onSubmit={enviar} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={ic} autoComplete="email" autoFocus />
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  aria-busy={carregando || undefined}
                  className="btn-3d w-full inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-medium disabled:opacity-75"
                >
                  {carregando && <span className="spinner" aria-hidden="true" />}
                  {carregando ? 'Enviando...' : 'Enviar link'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
                Lembrou? <Link href="/entrar" className="btn text-primary-600 font-medium">Entrar</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
