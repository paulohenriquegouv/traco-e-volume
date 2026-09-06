import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { clienteAtual } from '@/lib/customer-auth';
import { lerConfigLoja, mesclarTudo } from '@/lib/config-loja';

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
 */
export async function GET(request) {
  let config;
  try {
    const db = await getDb();
    config = await lerConfigLoja(db);
  } catch {
    // Banco fora do ar não pode derrubar o cabeçalho: com o padrão, a loja
    // aparece como sempre apareceu.
    config = mesclarTudo(null);
  }

  const [admin, cliente] = await Promise.all([
    checkAuth(request).then(a => Boolean(a?.authenticated)).catch(() => false),
    clienteAtual(request).catch(() => null),
  ]);

  return NextResponse.json({
    config,
    admin,
    cliente: cliente ? { id: cliente.id, nome: cliente.name || cliente.nome || '' } : null,
  });
}
