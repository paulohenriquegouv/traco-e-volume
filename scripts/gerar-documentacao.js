/**
 * Script para gerar documentação do projeto Traço & Volume em formato .docx
 * Uso: node scripts/gerar-documentacao.js
 * Requer: docx (já instalado — devDependency)
 *
 * ATENÇÃO: Este script NÃO contém senhas ou secrets.
 * As variáveis de ambiente estão documentadas no .env.local e na memoria.md
 */

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType } = require('docx');
const fs = require('fs');

// ============================
// DADOS DA DOCUMENTAÇÃO
// ============================

const projectName = 'Traço & Volume';
const projectUrl = 'https://traco-e-volume.vercel.app';
const repoUrl = 'https://github.com/paulohenriquegouv/traco-e-volume';

const techStack = [
  ['Next.js 14', 'Framework React com App Router'],
  ['React 18', 'Biblioteca de UI'],
  ['Tailwind CSS 3', 'Estilização utilitária'],
  ['MySQL (Aiven)', 'Banco de dados relacional'],
  ['Mercado Pago', 'Gateway de pagamentos (Pix, boleto, cartão)'],
  ['JWT (jose)', 'Autenticação admin'],
  ['Vercel', 'Plataforma de deploy'],
];

const pages = [
  ['/', 'Home', 'Hero, categorias, produtos em destaque, CTA'],
  ['/produtos', 'Produtos', 'Grid de produtos com sidebar de categorias e paginação'],
  ['/produtos/[slug]', 'Detalhe', 'Imagens, descrição, carrinho, WhatsApp'],
  ['/carrinho', 'Carrinho', 'Lista de itens, quantidades, total'],
  ['/checkout', 'Checkout', 'Formulário de dados e formas de pagamento'],
  ['/checkout-sucesso', 'Confirmação', 'QR Code Pix, link do boleto'],
  ['/pedido', 'Meu Pedido', 'Buscar por e-mail ou ID'],
  ['/admin/login', 'Admin Login', 'Autenticação'],
  ['/admin/dashboard', 'Dashboard', 'Estatísticas'],
  ['/admin/produtos', 'Admin Produtos', 'CRUD de produtos'],
  ['/admin/pedidos', 'Admin Pedidos', 'Listagem e status'],
];

const apiRoutes = [
  ['POST /api/auth', 'Login', 'Público'],
  ['GET /api/auth', 'Verificar sessão', 'Público'],
  ['DELETE /api/auth', 'Logout', 'Público'],
  ['POST /api/checkout', 'Processar pagamento (MP)', 'Público'],
  ['GET /api/produtos', 'Listar produtos', 'Público'],
  ['POST /api/produtos', 'Criar produto', 'Admin'],
  ['GET /api/produtos/[id]', 'Obter produto', 'Público'],
  ['PATCH /api/produtos/[id]', 'Atualizar produto', 'Admin'],
  ['DELETE /api/produtos/[id]', 'Excluir produto', 'Admin'],
  ['GET /api/pedidos', 'Listar pedidos', 'Admin'],
  ['POST /api/pedidos', 'Buscar pedido', 'Público'],
  ['PATCH /api/pedidos/[id]', 'Atualizar status', 'Admin'],
  ['POST /api/upload', 'Upload de imagem', 'Admin'],
  ['POST /api/webhooks/mercadopago', 'Confirmacao automatica de pagamento (Mercado Pago)', 'Assinatura HMAC'],
];

// ============================
// HELPER: Tabela
// ============================

function createTable(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
      shading: { fill: '4F46E5' },
      width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
    })),
  });
  const dataRows = rows.map((row, i) => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({ children: [new TextRun(cell)] })],
      shading: i % 2 === 0 ? { fill: 'F8FAFC' } : undefined,
    })),
  }));
  return new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } });
}
// ============================
// CONSTRUÇÃO DO DOCUMENTO
// ============================

async function generate() {
  const doc = new Document({
    title: `Documentação - ${projectName}`,
    sections: [
      // CAPA
      {
        children: [
          new Paragraph({ spacing: { before: 3000 } }),
          new Paragraph({ children: [new TextRun({ text: projectName, bold: true, size: 52, color: '4F46E5' })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'Documentação do Projeto', size: 36, color: '6B7280' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1000 } }),
          new Paragraph({ children: [new TextRun({ text: `URL: ${projectUrl}`, size: 22 })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: `Repo: ${repoUrl}`, size: 22 })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: `Data: ${new Date().toLocaleDateString('pt-BR')}`, size: 22 })], alignment: AlignmentType.CENTER }),
        ],
      },
      // 1. VISÃO GERAL
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '1. Visão Geral', bold: true, color: '4F46E5' })] }),
          new Paragraph({ children: [new TextRun('Loja online de impressão 3D. Clientes navegam, adicionam ao carrinho e finalizam via WhatsApp ou checkout (Pix, boleto, cartão via Mercado Pago). Painel admin para produtos e pedidos, deploy na Vercel.')] }),
        ],
      },
      // 2. STACK
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '2. Stack Tecnológica', bold: true, color: '4F46E5' })] }),
          createTable(['Tecnologia', 'Descrição'], techStack),
        ],
      },
      // 3. PÁGINAS
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '3. Páginas do Site', bold: true, color: '4F46E5' })] }),
          createTable(['Rota', 'Página', 'Descrição'], pages.map(p => [p[0], p[1], p[2]])),
        ],
      },
      // 4. API
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '4. Rotas de API', bold: true, color: '4F46E5' })] }),
          createTable(['Rota', 'Descrição', 'Autenticação'], apiRoutes),
        ],
      },
      // 5. BANCO DE DADOS
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '5. Banco de Dados', bold: true, color: '4F46E5' })] }),
          new Paragraph({ children: [new TextRun('MySQL via Aiven. 5 tabelas: products, orders, order_items, admin_users, settings.')] }),
          new Paragraph({ children: [new TextRun({ text: 'products: ', bold: true }), new TextRun('id, name, slug, description, short_description, price, compare_price, images (JSON), category, tags, weight, dimensions, material, colors, stock, featured, active, created_at, updated_at')] }),
          new Paragraph({ children: [new TextRun({ text: 'orders: ', bold: true }), new TextRun('id, order_id (TVYYYYMMDDXXXXX), customer_name/email/phone/document, shipping_address (JSON), payment_method/id/status, total, status, notes')] }),
          new Paragraph({ children: [new TextRun({ text: 'order_items: ', bold: true }), new TextRun('id, order_id (FK), product_id (FK), product_name, quantity, unit_price, total')] }),
          new Paragraph({ children: [new TextRun({ text: 'admin_users: ', bold: true }), new TextRun('id, username, password_hash, created_at')] }),
        ],
      },
      // 6. CARRINHO
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '6. Carrinho', bold: true, color: '4F46E5' })] }),
          new Paragraph({ children: [new TextRun('React Context (CartProvider) + localStorage (chave "tv_cart"). Estrutura: product_id, slug, name, price, image, category, quantity.')] }),
        ],
      },
      // 7. WHATSAPP
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '7. WhatsApp', bold: true, color: '4F46E5' })] }),
          new Paragraph({ children: [new TextRun('Botão no produto envia: nome, categoria, preço, descrição, foto, material, dimensões, link. Variáveis: NEXT_PUBLIC_WHATSAPP e NEXT_PUBLIC_WHATSAPP_LINK.')] }),
        ],
      },
      // 8. COMANDOS
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '8. Comandos', bold: true, color: '4F46E5' })] }),
          createTable(['Comando', 'Descrição'], [
            ['npm run dev', 'Dev (localhost:3000)'],
            ['npm run build', 'Build produção'],
            ['npm start', 'Produção'],
            ['npm run seed', 'Popular banco'],
            ['npm run init-db', 'Inicializar banco'],
          ]),
        ],
      },
      // 9. DEPLOY
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '9. Deploy', bold: true, color: '4F46E5' })] }),
          new Paragraph({ children: [new TextRun(`Vercel (auto-deploy via GitHub, branch main). URL: ${projectUrl}`)] }),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const out = './Documentacao_Traco_e_Volume.docx';
  fs.writeFileSync(out, buf);
  console.log(`✅ Documento gerado: ${out}`);
}

generate().catch(console.error);