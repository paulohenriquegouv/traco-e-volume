import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { clienteAtual } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

const soDigitos = (v) => String(v || '').replace(/\D/g, '');

function validar(body) {
  if (soDigitos(body.zip).length !== 8) return 'Informe um CEP válido.';
  if (!String(body.address || '').trim()) return 'Informe o endereço.';
  if (!String(body.city || '').trim()) return 'Informe a cidade.';
  if (String(body.state || '').trim().length !== 2) return 'Informe o estado com 2 letras.';
  return null;
}

/** Um endereço padrão por cliente: marcar um desmarca os outros. */
async function definirComoPadrao(db, clienteId, enderecoId) {
  await db.prepare('UPDATE customer_addresses SET padrao = 0 WHERE customer_id = ?').run(clienteId);
  await db.prepare('UPDATE customer_addresses SET padrao = 1 WHERE id = ? AND customer_id = ?').run(enderecoId, clienteId);
}

export async function GET(request) {
  const cliente = await clienteAtual(request);
  if (!cliente) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const db = await getDb();
  const enderecos = await db.prepare(
    'SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY padrao DESC, id DESC'
  ).all(cliente.id);
  return NextResponse.json({ enderecos });
}

export async function POST(request) {
  const cliente = await clienteAtual(request);
  if (!cliente) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const problema = validar(body);
  if (problema) return NextResponse.json({ erro: problema }, { status: 400 });

  const db = await getDb();
  const jaTem = await db.prepare('SELECT COUNT(*) as c FROM customer_addresses WHERE customer_id = ?').get(cliente.id);

  const r = await db.prepare(
    `INSERT INTO customer_addresses (customer_id, apelido, zip, address, number, complement, neighborhood, city, state, padrao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    cliente.id,
    String(body.apelido || '').trim().slice(0, 60),
    soDigitos(body.zip),
    String(body.address).trim(),
    String(body.number || '').trim(),
    String(body.complement || '').trim(),
    String(body.neighborhood || '').trim(),
    String(body.city).trim(),
    String(body.state).trim().toUpperCase(),
    // o primeiro endereço vira o padrão sem o cliente precisar escolher
    jaTem.c === 0 || body.padrao ? 1 : 0
  );

  if (jaTem.c === 0 || body.padrao) await definirComoPadrao(db, cliente.id, r.lastInsertRowid);
  return NextResponse.json({ ok: true, id: r.lastInsertRowid });
}

export async function PUT(request) {
  const cliente = await clienteAtual(request);
  if (!cliente) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const id = Number(body.id);
  if (!id) return NextResponse.json({ erro: 'Endereço não informado' }, { status: 400 });

  const db = await getDb();
  const dono = await db.prepare('SELECT id FROM customer_addresses WHERE id = ? AND customer_id = ?').get(id, cliente.id);
  if (!dono) return NextResponse.json({ erro: 'Endereço não encontrado' }, { status: 404 });

  // Só marcar como padrão, sem editar o resto
  if (body.apenasPadrao) {
    await definirComoPadrao(db, cliente.id, id);
    return NextResponse.json({ ok: true });
  }

  const problema = validar(body);
  if (problema) return NextResponse.json({ erro: problema }, { status: 400 });

  await db.prepare(
    `UPDATE customer_addresses SET apelido = ?, zip = ?, address = ?, number = ?, complement = ?,
     neighborhood = ?, city = ?, state = ? WHERE id = ? AND customer_id = ?`
  ).run(
    String(body.apelido || '').trim().slice(0, 60),
    soDigitos(body.zip),
    String(body.address).trim(),
    String(body.number || '').trim(),
    String(body.complement || '').trim(),
    String(body.neighborhood || '').trim(),
    String(body.city).trim(),
    String(body.state).trim().toUpperCase(),
    id, cliente.id
  );
  if (body.padrao) await definirComoPadrao(db, cliente.id, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const cliente = await clienteAtual(request);
  if (!cliente) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  if (!id) return NextResponse.json({ erro: 'Endereço não informado' }, { status: 400 });

  const db = await getDb();
  const alvo = await db.prepare('SELECT padrao FROM customer_addresses WHERE id = ? AND customer_id = ?').get(id, cliente.id);
  if (!alvo) return NextResponse.json({ erro: 'Endereço não encontrado' }, { status: 404 });

  await db.prepare('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?').run(id, cliente.id);

  // Apagou o padrão: promove o mais recente, para nunca ficar sem padrão
  if (alvo.padrao) {
    const proximo = await db.prepare(
      'SELECT id FROM customer_addresses WHERE customer_id = ? ORDER BY id DESC LIMIT 1'
    ).get(cliente.id);
    if (proximo) await definirComoPadrao(db, cliente.id, proximo.id);
  }
  return NextResponse.json({ ok: true });
}
