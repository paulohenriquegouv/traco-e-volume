'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import QRCode from 'qrcode';

function SuccessContent() {
  const sp = useSearchParams();
  const orderId = sp.get('order_id') || '';
  const method = sp.get('method') || 'pix';
  const qrCode = sp.get('qr_code') || '';
  const boletoUrl = sp.get('boleto_url') || '';
  const status = sp.get('status') || '';

  // A imagem que o Mercado Pago devolve vem em base64 e não cabe na querystring,
  // então o QR é desenhado aqui a partir do próprio código copia e cola.
  const [qrImg, setQrImg] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!qrCode) return;
    QRCode.toDataURL(qrCode, { width: 260, margin: 1 })
      .then(setQrImg)
      .catch(e => console.error('[pix] falha ao gerar QR Code:', e));
  }, [qrCode]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  const aprovado = status === 'approved';

  return (
    <div className="container-custom py-12 md:py-20">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {aprovado ? 'Pagamento Aprovado!' : 'Pedido Confirmado!'}
        </h1>
        <p className="text-gray-500 mb-2">Seu pedido <span className="font-semibold text-gray-900">#{orderId}</span> foi registrado.</p>
        <p className="text-sm text-gray-400 mb-8">
          {aprovado
            ? 'O pagamento foi confirmado e já estamos preparando seu pedido.'
            : 'Você receberá a confirmação no e-mail cadastrado.'}
        </p>

        {method === 'pix' && qrCode && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Pague com Pix</h3>
            <p className="text-sm text-gray-500 mb-4">Escaneie o QR Code com o app do seu banco:</p>

            {qrImg ? (
              <img src={qrImg} alt="QR Code do Pix" width={260} height={260} className="mx-auto rounded-lg border border-gray-100" />
            ) : (
              <div className="w-[260px] h-[260px] mx-auto rounded-lg bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                Gerando QR Code...
              </div>
            )}

            <p className="text-sm text-gray-500 mt-6 mb-2">Ou use o código copia e cola:</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 break-all bg-white p-3 rounded border">{qrCode}</p>
            </div>
            <button onClick={copiar}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
              {copiado ? 'Código copiado!' : 'Copiar Código Pix'}
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Assim que o pagamento cair, seu pedido é confirmado automaticamente.
            </p>
          </div>
        )}

        {method === 'boleto' && boletoUrl && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Boleto Bancário</h3>
            <p className="text-sm text-gray-500 mb-4">Clique no botão abaixo para visualizar e imprimir:</p>
            <a href={boletoUrl} target="_blank" rel="noopener noreferrer"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium inline-block">
              Ver Boleto
            </a>
          </div>
        )}

        {method === 'card' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Cartão de Crédito</h3>
            <p className="text-sm text-gray-500">
              {aprovado
                ? 'Pagamento aprovado pela operadora.'
                : 'Pagamento em análise pela operadora. Avisaremos por e-mail assim que for confirmado.'}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
          <Link href="/produtos" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
            Continuar Comprando
          </Link>
          <Link href={`/pedido?id=${orderId}`} className="bg-white border border-gray-200 hover:border-primary-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium">
            Acompanhar Pedido
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSucessoPage() {
  return (
    <Suspense fallback={<div className="container-custom py-20 text-center">Carregando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
