import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { clienteAtual, problemaNaSenha } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export async function PUT(request) {
  const cliente = await clienteAtual(request);
  if (!cliente) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const db = await getDb();

  if (!String(body.nome || '').trim()) {
    return NextResponse.json({ erro: 'Informe seu nome.' }, { status: 400 });
  }

  let trocouSenha = false;

  // Trocar senha exige a senha atual: sem isso, um computador deixado aberto
  // permitiria a qualquer um assumir a conta.
  if (body.senhaNova) {
    if (!body.senhaAtual) {
      return NextResponse.json({ erro: 'Informe a senha atual para definir uma nova.' }, { status: 400 });
    }
    const problema = problemaNaSenha(body.senhaNova);
    if (problema) return NextResponse.json({ erro: problema }, { status: 400 });

    const completo = await db.prepare('SELECT password_hash FROM customers WHERE id = ?').get(cliente.id);
    const confere = await bcrypt.compare(String(body.senhaAtual), completo.password_hash);
    if (!confere) return NextResponse.json({ erro: 'A senha atual está incorreta.' }, { status: 400 });

    const novoHash = await bcrypt.hash(String(body.senhaNova), 12);
    await db.prepare('UPDATE customers SET password_hash = ? WHERE id = ?').run(novoHash, cliente.id);
    trocouSenha = true;
  }

  // Consentimento de marketing: registra QUANDO foi dado, exigência da LGPD
  const aceita = body.aceitaMarketing ? 1 : 0;
  const mudouConsentimento = aceita !== (cliente.aceita_marketing ? 1 : 0);

  await db.prepare(
    `UPDATE customers SET name = ?, phone = ?, document = ?, aceita_marketing = ?
     ${mudouConsentimento && aceita ? ', aceita_marketing_em = NOW()' : ''}
     WHERE id = ?`
  ).run(
    String(body.nome).trim(),
    String(body.telefone || '').trim(),
    String(body.documento || '').trim(),
    aceita,
    cliente.id
  );

  return NextResponse.json({
    ok: true,
    mensagem: trocouSenha ? 'Dados e senha atualizados.' : 'Dados atualizados.',
  });
}
