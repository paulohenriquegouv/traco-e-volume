'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { mesclarTudo } from '@/lib/config-loja';

/**
 * Os parâmetros da loja, disponíveis em qualquer componente da interface.
 *
 * Começa com o PADRÃO — que é exatamente o texto que estava escrito no código —
 * e troca pelo que veio do banco quando a resposta chega. Assim a página nunca
 * pisca com um cabeçalho vazio, e a loja de quem nunca abriu a tela de
 * configurações continua idêntica.
 *
 * Uma requisição por navegação, feita aqui, no lugar da consulta de sessão que o
 * cabeçalho já fazia sozinho.
 */

const ConfigContext = createContext({ config: mesclarTudo(null), admin: false, cliente: null, carregado: false });

export function ConfigLojaProvider({ children }) {
  const [estado, setEstado] = useState({
    config: mesclarTudo(null),
    admin: false,
    cliente: null,
    carregado: false,
  });

  useEffect(() => {
    let vivo = true;
    fetch('/api/loja')
      .then(r => r.json())
      .then(d => {
        if (!vivo) return;
        setEstado({
          config: mesclarTudo(d.config),
          admin: Boolean(d.admin),
          cliente: d.cliente || null,
          carregado: true,
        });
      })
      .catch(() => { if (vivo) setEstado(e => ({ ...e, carregado: true })); });
    return () => { vivo = false; };
  }, []);

  return <ConfigContext.Provider value={estado}>{children}</ConfigContext.Provider>;
}

export function useConfigLoja() {
  return useContext(ConfigContext);
}
