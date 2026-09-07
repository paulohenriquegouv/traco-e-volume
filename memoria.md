# 🧠 Memória do Projeto — Traço & Volume

> **Repositório:** https://github.com/paulohenriquegouv/traco-e-volume
> **Deploy:** https://traco-e-volume.vercel.app
> **Stack:** Next.js 14 + MySQL (Aiven) + Tailwind CSS + Mercado Pago

---

## 1. 📋 Visão Geral

Loja online para venda de produtos em **impressão 3D**. Clientes podem navegar por categorias, adicionar produtos ao carrinho, finalizar compra via **WhatsApp** ou **checkout tradicional** com Pix, boleto ou cartão (Mercado Pago).

---

## 2. 🗂️ Estrutura de Diretórios

```
traco-e-volume/
├── data/
│   └── loja.json              # Backup/dados iniciais em JSON
├── public/
│   └── uploads/                # Imagens enviadas via admin
├── scripts/
│   ├── init-db.js             # Inicializador do banco
│   ├── seed.js                # Popula banco com produtos
│   └── seed.sql               # SQL de seed alternativo
├── src/
│   ├── app/
│   │   ├── globals.css         # Tailwind + estilos globais
│   │   ├── layout.js           # Layout root (CartProvider + Header + Footer)
│   │   ├── page.js             # Home (hero, categorias, produtos em destaque, CTA)
│   │   ├── carrinho/
│   │   │   └── page.js         # Página do carrinho
│   │   ├── checkout/
│   │   │   └── page.js         # Checkout com formulário + pagamento
│   │   ├── checkout-sucesso/
│   │   │   └── page.js         # Confirmação pós-pagamento (QR Code Pix / boleto)
│   │   ├── pedido/
│   │   │   ├── page.js         # Buscar pedido por e-mail ou ID
│   │   │   └── [id]/           # (reservado para detalhe)
│   │   ├── produtos/
│   │   │   ├── page.js         # Lista com grid + sidebar de categorias
│   │   │   └── [slug]/
│   │   │       ├── page.js (server)       # Server Component: busca produto
│   │   │       └── ProductDetailClient.js # Client Component: detalhes + ações
│   │   ├── admin/
│   │   │   ├── layout.js       # Sidebar + verificação de auth
│   │   │   ├── login/
│   │   │   │   └── page.js     # Login admin
│   │   │   ├── dashboard/
│   │   │   │   └── page.js     # Stats: produtos, pedidos, receita
│   │   │   ├── produtos/
│   │   │   │   ├── page.js     # Lista / gerenciar produtos
│   │   │   │   ├── novo/
│   │   │   │   │   └── page.js # Criar produto
│   │   │   │   └── [id]/
│   │   │   │       └── editar/
│   │   │   │           └── page.js # Editar produto
│   │   │   └── pedidos/
│   │   │       ├── page.js     # Listar pedidos
│   │   │       └── [id]/
│   │   │           ├── page.js          # Detalhe do pedido
│   │   │           └── OrderStatusForm.js # Alterar status
│   │   └── api/
│   │       ├── auth/
│   │       │   └── route.js    # POST (login), GET (verificar), DELETE (logout)
│   │       ├── checkout/
│   │       │   └── route.js    # POST: processa pagamento (Pix/Boleto/Card)
│   │       ├── pedidos/
│   │       │   ├── route.js    # GET (admin listar), POST (público buscar)
│   │       │   └── [id]/
│   │       │       └── route.js # GET detalhe, PATCH status
│   │       ├── produtos/
│   │       │   ├── route.js    # GET (listar público), POST (criar admin)
│   │       │   └── [id]/
│   │       │       └── route.js # GET, PATCH, DELETE
│   │       └── upload/
│   │           └── route.js    # POST: upload de imagem (admin)
│   ├── components/
│   │   ├── CartContext.js      # Context do carrinho + localStorage
│   │   ├── Header.js           # Navbar com logo, links e ícone do carrinho
│   │   ├── Footer.js           # Rodapé com links e contato
│   │   └── ProductCard.js      # Card de produto (imagem, nome, preço, add)
│   └── lib/
│       ├── auth.js             # JWT, bcrypt, login, cookies
│       └── db.js               # Conexão MySQL, criação de tabelas
---

## 3. ⚙️ Stack Técnica

| Tecnologia | Versão | Uso |
|---|---|---|
| **Next.js** | 14.2 | Framework React (App Router) |
| **React** | 18.3 | UI |
| **Tailwind CSS** | 3.4 | Estilização |
| **MySQL** (Aiven) | — | Banco de dados |
| **mysql2** | 3.24 | Driver MySQL |
| **Mercado Pago** | 2.3 | Pagamentos (Pix, boleto, cartão) |
| **bcryptjs** | 2.4 | Hash de senha admin |
| **jose** | 5.6 | JWT para autenticação admin |
| **uuid** | 10 | IDs únicos |

---

## 4. 🗄️ Banco de Dados

### Tabelas (MySQL via Aiven)

#### `products`
| Campo | Tipo | Descrição |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| name | VARCHAR(255) | Nome |
| slug | VARCHAR(255) UNIQUE | Slug |
| description | TEXT | Descrição completa |
| short_description | TEXT | Descrição curta |
| price | DECIMAL(10,2) | Preço |
| compare_price | DECIMAL(10,2) | Preço de comparação |
| images | TEXT | JSON array de URLs |
| category | VARCHAR(100) | Categoria |
| tags | TEXT | JSON tags |
| weight | DECIMAL(10,2) | Peso (g) |
| dimensions | VARCHAR(100) | Dimensões |
| material | VARCHAR(100) | Material |
| colors | TEXT | JSON cores |
| stock | INT | Estoque |
| featured | INT | 0/1 destaque |
| active | INT | 0/1 ativo |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `orders`
| Campo | Descrição |
|---|---|
| id PK | |
| order_id UNIQUE | TV2026090100001 |
| customer_name | |
| customer_email | |
| customer_phone | |
| customer_document | CPF/CNPJ |
| shipping_address | JSON |
| payment_method | pix/boleto/card |
| payment_id | ID MP |
| payment_status | pending/approved |
---

## 5. 🔐 Autenticação Admin

- **Login:** POST `/api/auth` com `username` + `password`
- **JWT:** Assinado com HS256, expira em 24h
- **Cookie:** `tv_admin_token` (HttpOnly, SameSite=Strict)
- **Middleware:** `checkAuth()` lê o cookie e verifica o token
- **Admin padrão:** criado automaticamente via `seedAdmin()` se não existir
- **Credenciais padrão:** `admin` / `tracovolume2026` (configurável via `.env`)

---

## 5.1 🛡️ Proteção do /admin (middleware)

**Arquivo:** `src/middleware.js` — barra `/admin/*` no servidor, antes de qualquer renderização.

O `admin/layout.js` é Client Component: a checagem de sessão roda no navegador, num
`useEffect`. Isso expulsa o visitante da tela, mas **só depois** de o servidor ter montado e
enviado o HTML. Como `/admin/dashboard` e `/admin/produtos` são Server Components que
consultam o banco, elas entregavam seus dados a quem pedisse a URL sem sessão nenhuma —
inclusive os 5 pedidos mais recentes do dashboard, com nome, e-mail, telefone, CPF e endereço.

O middleware valida o cookie `tv_admin_token` com `jose` (roda no Edge; `lib/auth.js` não
serve porque importa o driver MySQL). `/admin/login` fica liberado, e `/admin` redireciona
para o dashboard.

**Gotcha de teste:** `npm start` local **não consegue** simular o Edge Runtime no Node 24 —
todas as rotas viram 500 com `EvalError: Code generation from strings disallowed`. É falha do
simulador, não do código: no `npm run dev` funciona, e na Vercel também. Middleware se valida
em **deploy de preview** (branch separada), nunca direto na main.

---

## 6. 🛒 Carrinho (CartContext)

- **Provider:** `CartProvider` no `layout.js` → envolvendo toda a app
- **Armazenamento:** `localStorage` chave `tv_cart`
- **Carregamento:** `useEffect` no mount carrega do `localStorage` → flag `loaded`
- **Persistência:** `useEffect` salva sempre que `items` muda
- **Estrutura:** `{ product_id, slug, name, price, image, category, quantity }`
- **Funções:** `items`, `addItem`, `removeItem`, `updateQuantity`, `clearCart`, `total`, `count`, `loaded`

---

## 7. 💰 Checkout / Pagamento

### Fluxo
1. Cliente preenche dados no `/checkout`
2. POST `/api/checkout` com `items`, `customer_name`, `customer_email`, `payment_method`
3. API cria pedido no Mercado Pago e salva no banco
4. Redireciona para `/checkout-sucesso`

### Métodos
- **Pix** (`pix`) — QR Code
- **Boleto** (`bolbradesco`) — Boleto bancário
- **Cartão** (dinâmico) — Token + method_id

### ID do Pedido
```
TV{ano}{mes}{dia}{5 dígitos}
Ex: TV2026090100001
```

---

## 7.1 🔔 Webhook do Mercado Pago (confirmação automática)

**Rota:** `/api/webhooks/mercadopago` — já era apontada pelo `notification_url` dos três métodos
de pagamento no checkout, mas não existia (retornava 404). Pix e boleto pagos nunca saíam de
`aguardando_pagamento`.

**Lógica:** `src/lib/webhook-mp.js` (separada da rota para ser testável sem chamar o MP).

- **Fonte da verdade é a API do MP:** o corpo da notificação nunca é usado para decidir status —
  o pagamento é relido com `Payment.get()`. Corpo forjado não consegue marcar pedido como pago.
- **Assinatura HMAC-SHA256** dos headers `x-signature`/`x-request-id`, manifest
  `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, comparação em tempo constante.
  Sem `MERCADO_PAGO_WEBHOOK_SECRET` configurado a validação é pulada (o status ainda vem da API).
- **Idempotência:** o UPDATE de aprovação tem `WHERE payment_status <> 'approved'` e usa
  `affectedRows` para saber se foi a transição real — reenvio do MP não baixa estoque duas vezes.
- **Baixa de estoque** acontece só na transição para pago, com `GREATEST(stock - ?, 0)`.
- **Nunca rebaixa** pedido que o admin já moveu para `em_processamento`, `enviado` ou `entregue`.
- **Códigos:** 200 processado/ignorado, 400 sem `data.id`, 401 assinatura inválida,
  500 falha transitória (faz o MP reenviar).

**Testes:** `npm run teste-webhook` — 33 casos com banco falso em memória, não toca no banco real.

**Configurado e validado em 02/09/2026:** URL cadastrada no painel do MP (modo produção,
evento Pagamentos), credenciais de produção e `MERCADO_PAGO_WEBHOOK_SECRET` na Vercel e no
`.env.local`. "Simular notificação" do painel respondeu **200 OK**. `npm run verifica-webhook`
passa nos 8 checks.

**Gotcha da configuração:** o access token e a public key ficam em *Credenciais de produção*,
mas a **assinatura secreta só existe depois** de salvar a URL em *Webhooks > Configurar
notificações*. São coisas diferentes — colar um access token no `MERCADO_PAGO_WEBHOOK_SECRET`
faz o servidor rejeitar toda notificação real com 401, o que é pior que não ter secret.

---

## 7.2 🚚 Frete e entrega

**Tabela de preços:** fica no banco, em `settings.frete` (JSON), e é editada em **/admin/frete**.
Nada de valor de frete escrito no código.

**Conta:** `base da região + adicional por quilo (ou fração) que passar do peso base`.
O peso vem de `products.weight`; produto sem peso cadastrado entra com o *peso padrão* da
configuração — sem isso um cadastro incompleto faria o pedido pesar zero e sair mais barato.

**Regiões:** agrupamento do IBGE (Norte, Nordeste, Centro-Oeste, Sudeste, Sul), resolvidas pela
**UF**, não pela faixa de CEP. A UF chega preenchida pela busca do ViaCEP e continua editável.

**Opções no checkout:**
- `retirada` — sempre R$ 0, some se o admin desligar.
- `entrega` — só aparece quando a UF é conhecida. Zera sozinha quando o subtotal passa do
  *frete grátis acima de* (0 desliga a regra).

**Nasce zerada de propósito.** Loja recém-migrada cobra frete zero — o mesmo que fazia antes
desta funcionalidade — até alguém definir os valores em /admin/frete. Ninguém é cobrado por um
número que o código inventou. A tela avisa enquanto a tabela estiver zerada e oferece uma
sugestão de partida, que só entra nos campos com um clique e só vale depois de salvar.

**O servidor não confia no navegador.** `POST /api/frete` só *mostra* as opções; quem cobra é o
`/api/checkout`, que refaz a conta pelo **id** da opção escolhida. Preço, nome e peso dos itens
saem do banco (`src/lib/carrinho-servidor.js`) — o corpo da requisição é editável por quem
compra, e antes disso o preço de cada item vinha de lá. Opção inexistente (ou `entrega` sem UF)
devolve 400 em vez de cobrar frete não calculado.

**Efeito colateral desta troca:** pedido com produto que saiu do catálogo, ou com quantidade
quebrada, agora é recusado com mensagem clara em vez de ser aceito com os dados do navegador.

**Arquivos:** `src/lib/frete.js` (conta pura + leitura/escrita da configuração),
`src/lib/carrinho-servidor.js` (confere o carrinho contra o banco),
`src/app/api/frete/route.js`, `src/app/api/admin/frete/route.js`, `src/app/admin/frete/page.js`.

**Banco:** `orders.shipping` (DECIMAL) e `orders.shipping_method` (`retirada`/`entrega`).
O `total` já vem com o frete somado; o `shipping` fica à parte para mostrar "subtotal + frete"
no pedido e conferir a cobrança meses depois. Migração: `npm run migrar-frete`
(seguro rodar mais de uma vez; marca os pedidos antigos como `entrega` com frete 0).

**Rede de segurança do deploy:** se o código subir antes da migração, o `saveOrder` percebe o
`Unknown column`, avisa no log e grava o pedido sem as duas colunas. O total cobrado continua
certo — só falta a quebra entre subtotal e entrega. Perder o detalhamento é ruim; perder a
venda seria pior. Ainda assim: **rode a migração antes do deploy.**

**Testes:** `npm run teste-frete` — 31 casos, banco falso em memória, não toca no banco real.

**Não testado de ponta a ponta:** o caminho completo (checkout real → Mercado Pago → webhook)
não foi exercitado com banco e MP de verdade. Vale conferir um pedido de teste com frete > 0
antes de anunciar o recurso.

---

## 8. 📱 WhatsApp

### Botão na página do produto
- **Arquivo:** `/produtos/[slug]/ProductDetailClient.js`
- **Função:** `getWhatsAppLink(product)`
- **Mensagem:** Nome, Categoria, Preço, Descrição, Foto, Material, Dimensões, Link
- **Variáveis:** `NEXT_PUBLIC_WHATSAPP` (número), `NEXT_PUBLIC_WHATSAPP_LINK` (link completo)

### Links genéricos (sem dados de produto)
- Home (`page.js`) — contato
- Footer (`Footer.js`) — contato

---

## 9. 📄 Páginas Públicas

| Rota | Tipo | Descrição |
|---|---|---|
| `/` | Server | Hero, categorias, destaque, CTA |
| `/produtos` | Server + Client | Grid + sidebar + paginação |
| `/produtos/[slug]` | Server/Client | Detalhe + carrinho + WhatsApp |
| `/carrinho` | Client | Itens, quantidades, total |
| `/checkout` | Client | Formulário + pagamento |
| `/checkout-sucesso` | Client | QR Code Pix / boleto |
| `/pedido` | Client | Buscar por e-mail ou ID |
| `/links` | Server | Página do link da bio do Instagram — título, frase e botões editáveis em Configurações → "Página de links" (bloco `links` do config-loja) |

---

## 10. 🔧 Admin

| Rota | Descrição |
|---|---|
| `/admin/login` | Login |
| `/admin/dashboard` | Stats |
| `/admin/produtos` | Gerenciar |
| `/admin/produtos/novo` | Criar |
| `/admin/produtos/[id]/editar` | Editar |
| `/admin/pedidos` | Listar |
| `/admin/pedidos/[id]` | Detalhe + status |
| `/admin/frete` | Tabela de frete por região, peso e retirada |

---

## 11. 🔌 API Routes

| Rota | Métodos | Auth | Descrição |
|---|---|---|---|
| `/api/auth` | POST, GET, DELETE | — | Login, sessão, logout |
| `/api/checkout` | POST | — | Pagamento MP |
| `/api/produtos` | GET, POST | POST: admin | Listar/criar |
| `/api/produtos/[id]` | GET, PATCH, DELETE | PATCH/DEL: admin | CRUD |
| `/api/pedidos` | GET, POST | GET: admin | Listar/buscar |
| `/api/pedidos/[id]` | GET, PATCH | admin | Detalhe/status |
| `/api/upload` | POST | admin | Upload imagem |
| `/api/webhooks/mercadopago` | POST, GET | HMAC | Confirmação automática de pagamento |
| `/api/frete` | POST | — | Opções de entrega para um carrinho + UF |
| `/api/admin/frete` | GET, PUT | admin | Ler/salvar a tabela de frete |

---

## 12. 🎨 Design

- **Primary:** Indigo `#4f46e5` | **Accent:** Laranja `#f97316`
- **Fonte:** Inter (Google Fonts)
- **Container:** max-width 1280px
- **Animações:** fadeIn, slideIn, pulse-dot

### Tarja de avisos (topo de todas as páginas)

`FaixaAvisos` gira, de 6 em 6 segundos, entre frases que `src/lib/avisos.js` monta a partir
do que já está configurado (07/09/2026): liquidação — com contagem regressiva só na última
semana —, frete grátis acima de X (`gratis_acima` da tabela de frete), a peça mais recente
do catálogo, prazo de produção e parcelamento. O que não está configurado não vira frase, e
loja sem aviso nenhum não mostra tarja. O giro para com o ponteiro **sobre a frase** (não em
qualquer ponto da faixa — no desktop o cursor descansa na primeira linha da tela sem querer
nada, e pausar pela faixa inteira travava o giro) ou com o foco do teclado no link, e não
acontece para quem pediu menos animação no sistema (aí sai um aviso só, escolhido pela data). Os dados que não
estavam no config — `entrega.gratis_acima` e `novidade` — vêm na resposta de `/api/loja`,
na consulta que já existia. Aviso novo se acrescenta em `avisosDaLoja`, não no componente.

### Marca (`Logo.js`, `public/logo.svg`, `public/logo-completo.svg`)

O anel laranja tem volume por três pistas somadas: a metade da frente é mais grossa que a de
trás, cada metade tem degradê com a luz vindo de cima, e um reflexo fino corre pela borda
superior da frente. A espessura é a única que sobrevive a 24 px (favicon) — mexer nela com
cuidado. Os dois SVGs de `public/` são cópias estáticas do mesmo desenho: mudou um, mudar os
três.

---

## 13. 🌍 Variáveis de Ambiente

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Traço & Volume
NEXT_PUBLIC_INSTAGRAM=...
NEXT_PUBLIC_WHATSAPP=5591981158315
NEXT_PUBLIC_WHATSAPP_LINK=https://wa.me/5591981158315
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tracovolume2026
JWT_SECRET=<secret>
MERCADO_PAGO_ACCESS_TOKEN=<token>
MERCADO_PAGO_WEBHOOK_SECRET=<assinatura secreta do webhook>
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=<key>
DATABASE_URL=mysql://user:pass@host:port/db?ssl-mode=REQUIRED
```

---

## 14. 🧪 Comandos

```bash
npm run dev     # Dev (localhost:3000)
npm run build   # Build
npm start       # Produção
npm run seed    # Popula banco
npm run init-db # Inicializa banco

npm run migrar-frete   # Cria orders.shipping e orders.shipping_method
npm run teste-frete    # Testes do cálculo de frete (sem banco)
npm run teste-webhook  # Testes do webhook do Mercado Pago (sem banco)
```

---

## 15. 🔄 Deploy

**Plataforma:** Vercel (auto-deploy via GitHub, branch `main`)
**URL:** https://traco-e-volume.vercel.app

### Cache da vitrine (ISR + revalidação no salvar)

A home tem `revalidate = 60` e o ISR serve a página **velha** enquanto regenera em segundo
plano — o primeiro acesso após uma mudança ainda vê o conteúdo antigo. Por isso as rotas de
escrita chamam `revalidatePath()` no ato (06/09/2026): criar/editar/excluir produto revalida
`/`, `/produtos`, `/produtos/[slug]` (o slug antigo também, em renomeação) e `/sitemap.xml`;
salvar bloco em `/api/admin/configuracoes` revalida `/` e `/produtos`. O admin vê a mudança
na loja imediatamente. Se criar rota nova que altere o que a loja mostra, repetir o padrão.

---

## 16. 🐛 Problemas Conhecidos

### Carrinho não persiste
**Causa:** `<a>` em vez de `<Link>` causa recarregamento.
**Solução:** Usar `<Link>` + `ProductCard` Client Component.

### WhatsApp sem dados
**Causa:** Faltavam campos na mensagem.
**Solução:** Adicionar nome, categoria, preço, descrição, foto, material, dimensões.

### Push bloqueado por secrets
**Causa:** Senha Aiven detectada em commit.
**Solução:** Autorizar via GitHub Secret Scanning.
| total | DECIMAL(10,2) — já inclui o frete |
| shipping | DECIMAL(10,2) — quanto do total foi frete |
| shipping_method | retirada / entrega |
| status | aguardando_pagamento / pago / em_processamento / enviado / entregue / cancelado |
| notes | |
| created_at / updated_at | |

#### `order_items` — id PK, order_id FK, product_id FK, product_name, quantity, unit_price, total
#### `admin_users` — id PK, username UNIQUE, password_hash, created_at
#### `settings` — key PK, value, updated_at
├── .env.local                  # Variáveis de ambiente (NÃO comitar)
├── next.config.js              # Config Next.js (remotePatterns imagens)
├── tailwind.config.js          # Cores primary (índigo) e accent (laranja)
├── postcss.config.js
├── jsconfig.json               # Alias @/ para src/
└── package.json
```