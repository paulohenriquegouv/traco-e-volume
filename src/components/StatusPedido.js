'use client';

/**
 * Status do pedido em linguagem de cliente.
 *
 * O banco guarda "aguardando_pagamento"; quem comprou quer ler "Aguardando
 * pagamento" e saber, pela cor, se precisa fazer algo.
 */
const ESTADOS = {
  aguardando_pagamento: { rotulo: 'Aguardando pagamento', cor: 'bg-amber-100 text-amber-700' },
  pago: { rotulo: 'Pagamento confirmado', cor: 'bg-green-100 text-green-700' },
  em_processamento: { rotulo: 'Em produção', cor: 'bg-blue-100 text-blue-700' },
  enviado: { rotulo: 'Enviado', cor: 'bg-indigo-100 text-indigo-700' },
  entregue: { rotulo: 'Entregue', cor: 'bg-green-100 text-green-700' },
  cancelado: { rotulo: 'Cancelado', cor: 'bg-gray-100 text-gray-600' },
};

export function rotuloDoStatus(status) {
  return ESTADOS[status]?.rotulo || status;
}

export default function StatusPedido({ status }) {
  const e = ESTADOS[status] || { rotulo: status, cor: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${e.cor}`}>
      {e.rotulo}
    </span>
  );
}

export function MetodoPagamento({ metodo }) {
  const nomes = { pix: 'Pix', boleto: 'Boleto', card: 'Cartão de crédito' };
  return <span>{nomes[metodo] || metodo}</span>;
}
