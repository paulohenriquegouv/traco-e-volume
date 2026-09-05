const enderecoDaLoja = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://tracoevolume.com.br';

export default function robots() {
  const base = enderecoDaLoja();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Areas sem valor de busca ou com dado de cliente
        disallow: ['/admin', '/minha-conta', '/checkout', '/checkout-sucesso', '/carrinho', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
