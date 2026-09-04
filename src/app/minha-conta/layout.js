'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const MENU = [
  { href: '/minha-conta', rotulo: 'Início' },
  { href: '/minha-conta/pedidos', rotulo: 'Meus pedidos' },
  { href: '/minha-conta/enderecos', rotulo: 'Endereços' },
  { href: '/minha-conta/dados', rotulo: 'Meus dados' },
];

export default function LayoutMinhaConta({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [cliente, setCliente] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch('/api/conta')
      .then(r => r.json())
      .then(d => {
        if (!d.autenticado) {
          router.replace('/entrar?destino=' + encodeURIComponent(pathname));
          return;
        }
        setCliente(d.cliente);
      })
      .catch(() => router.replace('/entrar'))
      .finally(() => setCarregando(false));
  }, [pathname, router]);

  const sair = async () => {
    await fetch('/api/conta', { method: 'DELETE' });
    router.push('/');
    router.refresh();
  };

  if (carregando) {
    return (
      <div className="container-custom py-20 text-center text-gray-500">
        <span className="spinner mr-2" aria-hidden="true" /> Carregando sua conta...
      </div>
    );
  }
  if (!cliente) return null;

  const primeiroNome = cliente.nome.split(' ')[0];

  return (
    <div className="container-custom py-8 md:py-12">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Olá, {primeiroNome}</h1>
        <p className="text-sm text-gray-500">{cliente.email}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <nav className="md:w-52 shrink-0">
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1">
            {MENU.map(item => {
              const ativo = pathname === item.href;
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    className={`btn block px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                      ativo ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.rotulo}
                  </Link>
                </li>
              );
            })}
            <li className="shrink-0 md:mt-4 md:pt-4 md:border-t md:border-gray-100">
              <button
                type="button"
                onClick={sair}
                className="btn block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 whitespace-nowrap"
              >
                Sair
              </button>
            </li>
          </ul>
        </nav>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
