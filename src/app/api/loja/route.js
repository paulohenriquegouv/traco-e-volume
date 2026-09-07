import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { clienteAtual } from '@/lib/customer-auth';
import { lerConfigLoja, mesclarTudo } from '@/lib/config-loja';
import { lerConfig as lerConfigFrete } from '@/lib/frete';

/**
 * O que a loja precisa saber em toda página: os parâmetros e quem está olhando.
 *
 * Uma rota só porque o cabeçalho já fazia uma consulta de sessão a cada página —
 * juntar a configuração aqui não acrescenta nenhuma ida à rede. Nada de sensível
 * sai daqui: são os mesmos textos e regras que qualquer visitante vê na tela.
 *
 * `admin` serve para o atalho do painel aparecer no site para quem administra, e
 * some para todo o resto. Não é controle de acesso: quem protege o painel são o
 * middleware e o checkAuth de cada rota.
 *
 * `entrega` e `novidade` existem para a tarja do topo: o valor do frete grátis
 * mora na tabela de frete, e a peça mais recente só o banco sabe qual é. Vêm
 * junto na consulta que já acontecia, em vez de virarem mais duas idas à rede a
 * cada navegação. De `entrega` sai só o valor mínimo — a tabela de preços por
 * região não tem o que fazer no navegador.
 */
export async function GET(request) {
  let config;
  let gratisAcima = 0;
  let novidade = null;
  try {
    const db = await getDb();
    const [cfg, frete, recente] = await Promise.all([
      lerConfigLoja(db),
      lerConfigFrete(db),
      db.prepare(
        'SELECT name, slug, created_at FROM products WHERE active = 1 ORDER BY created_at DESC LIMIT 1'
      ).get(),
    ]);
    config = cfg;
    gratisAcima = frete.gratis_acima;
    novidade = recente
      ? { nome: recente.name, slug: recente.slug, created_at: recente.created_at }
      : null;
  } catch {
    // Banco fora do ar não pode derrubar o cabeçalho: com o padrão, a loja
    // aparece como sempre apareceu — e a tarja, sem dado nenhum, só não aparece.
    config = mesclarTudo(null);
  }

  const [admin, cliente] = await Promise.all([
    checkAuth(request).then(a => Boolean(a?.authenticated)).catch(() => false),
    clienteAtual(request).catch(() => null),
  ]);

  return NextResponse.json({
    config,
    entrega: { gratis_acima: gratisAcima },
    novidade,
    admin,
    cliente: cliente ? { id: cliente.id, nome: cliente.name || cliente.nome || '' } : null,
  });
}
