import { redirect } from 'next/navigation';

/**
 * O frete virou uma aba de Configurações, junto com o resto da parametrização.
 *
 * Este redirecionamento fica porque /admin/frete pode estar num favorito, num
 * atalho da tela inicial do celular ou num link que alguém mandou. Mandar para
 * um 404 seria fazer o lojista procurar o que só mudou de lugar.
 */
export default function AdminFreteRedirect() {
  redirect('/admin/configuracoes#entrega');
}
