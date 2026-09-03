'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Formulário de cartão do Mercado Pago (Payment Brick).
 *
 * O formulário é renderizado pelo próprio Mercado Pago dentro de iframes: número,
 * validade e CVV nunca passam pelo nosso código nem pelo nosso servidor. O que
 * recebemos de volta é só um token de uso único.
 *
 * onPagar recebe { card_token, card_method_id, card_issuer_id, installments }.
 */

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';
const CONTAINER_ID = 'brick-cartao';

function carregarSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('sem window'));
    if (window.MercadoPago) return resolve();

    const existente = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existente) {
      existente.addEventListener('load', () => resolve());
      existente.addEventListener('error', () => reject(new Error('falha ao carregar o SDK')));
      return;
    }

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('falha ao carregar o SDK'));
    document.body.appendChild(script);
  });
}

export default function CardPaymentBrick({ amount, email, onPagar }) {
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  // onPagar muda a cada render do pai; o brick é criado uma vez e lê daqui
  const onPagarRef = useRef(onPagar);
  onPagarRef.current = onPagar;

  // O controlador do brick é global por container: se a montagem antiga desmontar
  // depois que a nova criou o seu, ela derruba o formulário de quem ficou. Em dev o
  // StrictMode roda o efeito duas vezes e isso acontece sempre. A geração diz quem
  // é a montagem atual, e só ela pode desmontar.
  const geracaoRef = useRef(0);

  useEffect(() => {
    const geracao = ++geracaoRef.current;
    let controller = null;

    const souAtual = () => geracaoRef.current === geracao;

    async function montar() {
      const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
      if (!publicKey) {
        setErro('Pagamento com cartão indisponível no momento.');
        console.error('[cartao] NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ausente');
        return;
      }

      try {
        await carregarSdk();
        if (!souAtual()) return;

        // Restos de uma montagem anterior impedem o brick novo de aparecer
        const container = document.getElementById(CONTAINER_ID);
        if (container) container.innerHTML = '';

        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const criado = await mp.bricks().create('cardPayment', CONTAINER_ID, {
          initialization: {
            amount: Number(amount),
            ...(email ? { payer: { email } } : {}),
          },
          customization: {
            paymentMethods: { maxInstallments: 12 },
          },
          callbacks: {
            onReady: () => { if (souAtual()) setPronto(true); },
            onSubmit: (dados) => {
              // O brick só reabilita o botão quando esta promise termina
              return Promise.resolve(
                onPagarRef.current({
                  card_token: dados.token,
                  card_method_id: dados.payment_method_id,
                  card_issuer_id: dados.issuer_id,
                  installments: dados.installments,
                  customer_document: dados.payer?.identification?.number || '',
                })
              );
            },
            onError: (e) => {
              console.error('[cartao] erro no brick:', e);
              if (souAtual()) setErro('Não foi possível processar o cartão. Confira os dados e tente de novo.');
            },
          },
        });

        // Terminou de criar mas já não sou a montagem atual: limpo o meu
        if (!souAtual()) {
          try { criado?.unmount?.(); } catch {}
          return;
        }
        controller = criado;
        // Nem sempre o onReady chega; a criação ter resolvido já significa formulário na tela
        setPronto(true);
      } catch (e) {
        console.error('[cartao] falha ao montar o formulário:', e);
        if (souAtual()) setErro('Não foi possível carregar o formulário de cartão. Recarregue a página.');
      }
    }

    montar();

    return () => {
      // Só desmonta se ninguém tomou o lugar desta montagem
      if (geracaoRef.current === geracao) {
        try { controller?.unmount?.(); } catch {}
      }
    };
    // Recria o brick quando o valor muda — o parcelamento depende dele
  }, [amount, email]);

  return (
    <div>
      {!pronto && !erro && (
        <p className="text-sm text-gray-500 py-4">Carregando formulário seguro do Mercado Pago...</p>
      )}
      <div id={CONTAINER_ID} />
      {erro && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mt-3">{erro}</div>}
    </div>
  );
}
