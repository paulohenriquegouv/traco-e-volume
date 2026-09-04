const { criarToken } = require('./tokens');
const { enviarVerificacaoDeEmail, enviarRecuperacaoDeSenha } = require('./email');

/**
 * Disparos de e-mail que envolvem token.
 *
 * Ficam aqui, e não dentro de um route.js, porque o Next compila cada rota de
 * forma isolada: importar uma função exportada por um route handler funciona em
 * desenvolvimento e some no build de produção — foi exatamente o que aconteceu
 * com a verificação de e-mail do cadastro.
 */

const enderecoDaLoja = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://traco-e-volume.vercel.app';

async function enviarVerificacao(cliente) {
  const token = await criarToken(cliente.id, 'verificacao');
  const url = `${enderecoDaLoja()}/verificar-email?token=${token}`;
  return enviarVerificacaoDeEmail({
    para: cliente.email,
    nome: cliente.name || cliente.nome || 'cliente',
    url,
  });
}

async function enviarLinkDeSenha(cliente) {
  const token = await criarToken(cliente.id, 'senha');
  const url = `${enderecoDaLoja()}/redefinir-senha?token=${token}`;
  return enviarRecuperacaoDeSenha({
    para: cliente.email,
    nome: cliente.name || cliente.nome || 'cliente',
    url,
  });
}

module.exports = { enviarVerificacao, enviarLinkDeSenha };
