import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conferirCarrinho } from '@/lib/carrinho-servidor';
import { lerConfig, calcularOpcoes, pesoParaFrete } from '@/lib/frete';
import { lerConfigLoja } from '@/lib/config-loja';

/**
 * Opções de entrega para um carrinho e uma UF.
 *
 * O checkout chama esta rota para MOSTRAR as opções; na hora de cobrar, o
 * /api/checkout refaz a mesma conta pelo id escolhido. O preço que sai daqui é
 * informativo — o que vale é o recalculado no pedido.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const db = await getDb();

    const carrinho = await conferirCarrinho(db, body.items);
    if (!carrinho.ok) return NextResponse.json({ error: carrinho.erro }, { status: 400 });

    const [config, loja] = await Promise.all([lerConfig(db), lerConfigLoja(db)]);
    const peso_g = pesoParaFrete(carrinho.itens, config);

    const resultado = calcularOpcoes({
      config,
      uf: body.uf,
      subtotal: carrinho.subtotal,
      peso_g,
    });

    // O prazo que importa para quem compra e o total: producao mais transporte.
    // So entra na entrega -- o campo da retirada ja e "fica pronto em", que
    // embute a producao, e somar de novo contaria duas vezes. Prazo de regiao
    // ainda nao definido (zero) continua sem prazo, em vez de anunciar so os
    // dias de producao como se fosse a entrega inteira.
    const producao = loja.prazos.producao_dias;
    const opcoes = resultado.opcoes.map(o =>
      o.id === 'entrega' && o.prazo_dias > 0
        ? { ...o, prazo_dias: o.prazo_dias + producao, producao_dias: producao }
        : o
    );

    return NextResponse.json({ ...resultado, opcoes, subtotal: carrinho.subtotal });
  } catch (e) {
    console.error('Erro ao calcular frete:', e?.message);
    return NextResponse.json({ error: 'Não foi possível calcular o frete agora.' }, { status: 500 });
  }
}
