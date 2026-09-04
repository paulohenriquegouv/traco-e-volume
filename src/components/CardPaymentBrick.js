'use client';

import { useEffect, useId, useRef, useState } from 'react';

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

function carregarSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('sem window'));
    if (window.MercadoPago) return resolve();

    const existente = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existente) {
      // O script pode ter terminado de carregar antes deste listener existir:
      // sem o polling a promise ficaria pendente para sempre.
      const inicio = Date.now();
      const checar = () => {
        if (window.MercadoPago) return resolve();
        if (Date.now() - inicio > 15000) return reject(new Error('timeout ao carregar o SDK'));
        setTimeout(checar, 100);
      };
      return checar();
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

  // O Mercado Pago guarda estado interno por id de container. Reaproveitar o mesmo
  // id entre montagens fazia a segunda criação resolver sem desenhar nada — id
  // próprio por montagem elimina a colisão.
  const containerId = 'brick-cartao-' + useId().replace(/:/g, '');

  // O brick é criado uma vez só; estes refs entregam os valores do momento da
  // criação e do envio, sem obrigar o efeito a rodar de novo.
  const onPagarRef = useRef(onPagar);
  onPagarRef.current = onPagar;
  const amountRef = useRef(amount);
  amountRef.current = amount;
  const emailRef = useRef(email);
  emailRef.current = email;

  useEffect(() => {
    let vivo = true;
    let controller = null;

    async function montar() {
      const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
      if (!publicKey) {
        setErro('Pagamento com cartão indisponível no momento.');
        console.error('[cartao] NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ausente');
        return;
      }

      try {
        await carregarSdk();
        if (!vivo) return;

        // O onload do script nao significa SDK pronto: ele ainda faz inicializacao
        // interna (device profiling). Criar o brick cedo demais falha com
        // "Bricks component initialization failed" e nada e desenhado. Por isso as
        // tentativas com espera crescente -- criar manualmente segundos depois
        // sempre funcionou.
        await new Promise(r => setTimeout(r, 400));
        if (!vivo) return;

        const criado = await criarComTentativas(publicKey);
        if (!criado) return;
        controller = criado;
        setErro(''); // uma tentativa anterior pode ter deixado aviso na tela
        setPronto(true);
      } catch (e) {
        console.error('[cartao] falha ao montar o formulário:', e);
        if (vivo) setErro('Não foi possível carregar o formulário de cartão. Recarregue a página.');
      }
    }

    async function criarComTentativas(publicKey) {
      const esperas = [0, 1500, 3000];
      for (let i = 0; i < esperas.length; i++) {
        if (esperas[i]) await new Promise(r => setTimeout(r, esperas[i]));
        if (!vivo) return null;

        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';

        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        let criado = null;
        try {
          criado = await mp.bricks().create('cardPayment', containerId, {
          initialization: {
            amount: Number(amountRef.current),
            ...(emailRef.current ? { payer: { email: emailRef.current } } : {}),
          },
          customization: {
            paymentMethods: { maxInstallments: 12 },
          },
          callbacks: {
            onReady: () => { if (vivo) setPronto(true); },
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
              if (vivo) setErro('Não foi possível processar o cartão. Confira os dados e tente de novo.');
            },
          },
        });

        } catch (e) {
          console.warn(`[cartao] tentativa ${i + 1} falhou:`, e?.message || e);
        }

        if (!vivo) { try { criado?.unmount?.(); } catch {} return null; }

        // A criação pode resolver sem desenhar nada: confirma pelo DOM
        await new Promise(r => setTimeout(r, 1200));
        if (!vivo) return null;
        if ((document.getElementById(containerId)?.childElementCount || 0) > 0) return criado;

        console.warn(`[cartao] tentativa ${i + 1}: brick nao renderizou`);
        try { criado?.unmount?.(); } catch {}
      }

      console.error('[cartao] o formulário não renderizou depois de 3 tentativas');
      if (vivo) setErro('Não foi possível carregar o formulário de cartão. Recarregue a página ou pague com Pix.');
      return null;
    }

    montar();

    return () => {
      vivo = false;
      try { controller?.unmount?.(); } catch {}
    };
    // Criado uma única vez: o valor e o e-mail vêm dos refs. O carrinho não muda
    // enquanto o checkout está aberto.
  }, [containerId]);

  // O container precisa ser SEMPRE o primeiro filho, sem irmao condicional antes
  // dele: quando o aviso de carregamento some, o React compara os filhos por
  // posicao, ve tipos diferentes no indice 0 e recria o elemento -- levando junto
  // o formulario que o Mercado Pago tinha acabado de montar dentro.
  return (
    <div>
      <div key="container-brick" id={containerId} />
      {!pronto && !erro && (
        <p className="text-sm text-gray-500 py-4">Carregando formulário seguro do Mercado Pago...</p>
      )}
      {erro && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mt-3">{erro}</div>}
    </div>
  );
}
