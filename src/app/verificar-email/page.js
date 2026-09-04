'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

function Conteudo() {
  const token = useSearchParams().get('token') || '';
  const [estado, setEstado] = useState('confirmando');
  const [mensagem, setMensagem] = useState('');
  const jaRodou = useRef(false); // o token é de uso único: não pode ser gasto duas vezes

  useEffect(() => {
    if (jaRodou.current) return;
    jaRodou.current = true;

    if (!token) { setEstado('erro'); setMensagem('Link sem token.'); return; }

    fetch('/api/conta/verificar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.erro || 'Não foi possível confirmar.');
        setMensagem(d.mensagem);
        setEstado('ok');
      })
      .catch(e => { setMensagem(e.message); setEstado('erro'); });
  }, [token]);

  return (
    <div className="container-custom py-10 md:py-16">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 text-center">
          {estado === 'confirmando' && (
            <p className="text-gray-500 text-sm py-4">
              <span className="spinner mr-2" aria-hidden="true" />Confirmando seu e-mail...
            </p>
          )}

          {estado === 'ok' && (
            <>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">E-mail confirmado</h1>
              <p className="text-gray-600 text-sm mb-6">{mensagem}</p>
              <Link href="/minha-conta" className="btn-3d inline-block bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
                Ir para minha conta
              </Link>
            </>
          )}

          {estado === 'erro' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Não foi possível confirmar</h1>
              <p className="text-gray-600 text-sm mb-1">{mensagem}</p>
              <p className="text-sm text-gray-500 mb-6">
                Entre na sua conta e peça um novo link de confirmação.
              </p>
              <Link href="/minha-conta" className="btn text-primary-600 font-medium text-sm">Ir para minha conta</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<div className="container-custom py-20 text-center text-gray-500">Carregando...</div>}>
      <Conteudo />
    </Suspense>
  );
}
