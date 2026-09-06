import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conferirCarrinho } from '@/lib/carrinho-servidor';
import { lerConfig, calcularOpcoes, pesoDoPedido } from '@/lib/frete';

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

    const config = await lerConfig(db);
    const peso_g = pesoDoPedido(carrinho.itens, config);

    const resultado = calcularOpcoes({
      config,
      uf: body.uf,
      subtotal: carrinho.subtotal,
      peso_g,
    });

    return NextResponse.json({ ...resultado, subtotal: carrinho.subtotal });
  } catch (e) {
    console.error('Erro ao calcular frete:', e?.message);
    return NextResponse.json({ error: 'Não foi possível calcular o frete agora.' }, { status: 500 });
  }
}
