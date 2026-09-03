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

**Pendente de configuração:** cadastrar a URL no painel do MP e preencher
`MERCADO_PAGO_WEBHOOK_SECRET` no `.env.local` e na Vercel.

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

---

## 12. 🎨 Design

- **Primary:** Indigo `#4f46e5` | **Accent:** Laranja `#f97316`
- **Fonte:** Inter (Google Fonts)
- **Container:** max-width 1280px
- **Animações:** fadeIn, slideIn, pulse-dot

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
```

---

## 15. 🔄 Deploy

**Plataforma:** Vercel (auto-deploy via GitHub, branch `main`)
**URL:** https://traco-e-volume.vercel.app

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
| total | DECIMAL(10,2) |
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