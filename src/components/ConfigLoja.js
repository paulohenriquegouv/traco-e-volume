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

const VAZIO = {
  config: mesclarTudo(null),
  // Frete grátis e peça mais nova: a tarja do topo monta os avisos com isto.
  entrega: { gratis_acima: 0 },
  novidade: null,
  admin: false,
  cliente: null,
  carregado: false,
};

const ConfigContext = createContext(VAZIO);

export function ConfigLojaProvider({ children }) {
  const [estado, setEstado] = useState(VAZIO);

  useEffect(() => {
    let vivo = true;
    fetch('/api/loja')
      .then(r => r.json())
      .then(d => {
        if (!vivo) return;
        setEstado({
          config: mesclarTudo(d.config),
          entrega: d.entrega || VAZIO.entrega,
          novidade: d.novidade || null,
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
