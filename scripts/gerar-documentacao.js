const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType } = require('docx');

const tbl = (h, r) => new Table({ rows: [
  new TableRow({ tableHeader: true, children: h.map(x => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: x, bold: true, color: 'FFFFFF', size: 22 })], alignment: AlignmentType.CENTER })], shading: { fill: '4F46E5' } })) }),
  ...r.map((row, i) => new TableRow({ children: row.map(c => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(c), size: 20 })], alignment: AlignmentType.LEFT })], shading: i % 2 === 0 ? { fill: 'F9FAFB' } : undefined })) }))
] });

const S = (t) => new Paragraph({ children: [new TextRun({ text: t, size: 32, bold: true, color: '4F46E5' })], spacing: { before: 600, after: 300 } });
const P = (t, sz, c) => new Paragraph({ children: [new TextRun({ text: t, size: sz||22, color: c||'000000' })] });

async function main() {
  const doc = new Document({ title: 'Documentacao Traco e Volume', styles: { default: { document: { run: { size: 22, font: 'Calibri' }, paragraph: { spacing: { after: 120 } } } } }, sections: [
    { children: [P('',0),P('',0),P('',0),P('Traço & Volume',56,'4F46E5'),P('Documentação do Projeto',32,'6B7280'),P('Loja Online — Produtos em Impressão 3D',24,'9CA3AF'),P('─'.repeat(50),22,'D1D5DB'),P('Versão 1.0.0 — '+new Date().toLocaleDateString('pt-BR'),20,'374151')] },
    { children: [S('1. Visão Geral'),P('Loja virtual de impressão 3D. Next.js 14 + MySQL (Aiven) + Mercado Pago.'),P('Tecnologias:',24),tbl(['Tec','Versão','Finalidade'],[['Next.js','14.2.35','Framework'],['React','18.3.0','UI'],['Tailwind','3.4.x','CSS'],['MySQL','Aiven','DB'],['mysql2','3.24.3','Driver'],['bcryptjs','2.4.3','Hash'],['jose','5.6.0','JWT'],['mercadopago','2.3.0','Pagto']])] },
    { children: [S('2. Ambiente'),P('Node 18+, NPM. Arquivo .env.local:'),tbl(['Variável','Valor'],[['NEXT_PUBLIC_SITE_URL','http://localhost:3000'],['ADMIN_USERNAME','admin'],['ADMIN_PASSWORD','tracovolume2026'],['JWT_SECRET','...-change-this-in-production'],['MERCADO_PAGO_ACCESS_TOKEN','TEST-...'],['NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY','TEST-...'],['DATABASE_URL','mysql://avnadmin:***@aivencloud.com:26834/traco_e_volume?ssl-mode=REQUIRED'],['NEXT_PUBLIC_WHATSAPP','5591981158315'],['NEXT_PUBLIC_INSTAGRAM','https://www.instagram.com/tracoevolume']])] },
    { children: [S('3. Banco de Dados'),P('Aiven Cloud MySQL 8.0. SSL REQUIRED.'),tbl(['Propriedade','Valor'],[['Host','mysql-915e8df-paulohenriquegouv.l.aivencloud.com:26834'],['Database','traco_e_volume'],['Usuário','avnadmin'],['Senha','AVNS_SZKZOSVaQQWawAt5WL3']]),P('Tabelas: products, orders, order_items, admin_users, settings.'),P('Fallback: mock DB em memória se MySQL falhar.')] },
    { children: [S('4. Estrutura'),P('D:\\Dropbox\\claude\\traco-e-volume'),P('.env.local, package.json, next.config.js, tailwind.config.js'),P('scripts/: init-db.js, seed.js'),P('src/lib/: db.js (MySQL), auth.js (JWT+bcrypt)'),P('src/components/: Header, Footer, CartContext, ProductCard'),P('src/app/: páginas (produtos, carrinho, checkout, admin, pedido)'),P('src/app/api/: auth, produtos, pedidos, checkout, upload'),P('public/uploads/: imagens')] },
    { children: [S('5. Páginas'),tbl(['Rota','Acesso'],[['/','Home público'],['/produtos','Lista público'],['/produtos/[slug]','Detalhe público'],['/carrinho','Carrinho'],['/checkout','Finalizar pedido'],['/checkout-sucesso','Confirmação'],['/pedido','Buscar pedido'],['/admin/login','Login restrito'],['/admin/dashboard','Admin dashboard'],['/admin/produtos','Admin CRUD'],['/admin/pedidos','Admin lista']])] },
    { children: [S('6. API'),P('Auth: POST /api/auth (login), GET (sessão), DELETE (logout)'),P('Produtos: GET /api/produtos (lista), POST (criar), GET/PUT/DELETE /api/produtos/[id]'),P('Pedidos: GET /api/pedidos (lista admin), POST (busca pública), GET/PUT /api/pedidos/[id]'),P('Checkout: POST /api/checkout (PIX, boleto, cartão)'),P('Upload: POST /api/upload (imagens, admin)')] },
    { children: [S('7. Painel Admin'),P('JWT em cookie HttpOnly. Login: admin / tracovolume2026.'),P('Dashboard: estatísticas (produtos, pedidos, receita).'),P('Produtos: CRUD completo + upload imagens.'),P('Pedidos: listar, filtrar status, ver detalhes, atualizar.')] },
    { children: [S('8. Mercado Pago'),P('Sandbox. PIX (QR Code), Boleto (URL), Cartão (parcelado).'),P('⚠ Em produção: substituir chaves TEST- por reais!')] },
    { children: [S('9. Scripts'),tbl(['Comando','Função'],[['npm run dev','Servidor dev (:3000)'],['npm run build','Build produção'],['npm start','Servidor produção'],['npm run init-db','Criar DB + admin'],['npm run seed','Popular 8 produtos']])] },
    { children: [S('10. Git'),tbl(['Hash','Mensagem'],[['fdc106e','Corrige await queries'],['017008c','cline checkpoint'],['5b301fd','MySQL Aiven + seed fix'],['9b83f03','MySQL Aiven + seed fix'],['ec39c39','Add seed.sql']])] },
    { children: [S('11. Dados de Acesso - ADMIN'),P('⚠ GUARDE ESTAS INFORMAÇÕES EM LOCAL SEGURO ⚠',24,'EF4444'),P('Painel Administrativo:',24),tbl(['Campo','Valor'],[['URL de Login','http://localhost:3000/admin/login'],['Usuário','admin'],['Senha','tracovolume2026'],['Cookie','tv_admin_token (JWT HttpOnly)']]),P('',0),P('Se esquecer a senha, ela está no arquivo .env.local na raiz do projeto.',20,'6B7280'),P('Para resetar: DELETE o admin no banco e rode "npm run init-db" novamente.',20,'6B7280'),P('',0),P('Banco de Dados (Aiven):',24),tbl(['Campo','Valor'],[['Host','mysql-915e8df-...:26834'],['DB','traco_e_volume'],['User','avnadmin'],['Pass','AVNS_SZKZOSVaQQWawAt5WL3']]),P('',0),P('Contato / Redes:',24),tbl(['Canal','Link'],[['Instagram','@tracoevolume'],['WhatsApp','wa.me/5591981158315']])] },
    { children: [S('12. Comandos'),tbl(['Ação','Comando'],[['Dev','npm run dev'],['Init DB','npm run init-db'],['Seed','npm run seed'],['Build','npm run build'],['Start','npm start'],['Git push','git push']]),P('─'.repeat(50),22,'D1D5DB'),P('Traço & Volume © 2026',20,'9CA3AF')] },
  ]});

  const out = path.join(__dirname, '..', 'Documentacao_Traco_e_Volume.docx');
  fs.writeFileSync(out, await Packer.toBuffer(doc));
  console.log('OK: ' + out);
}
main().catch(e => { console.error(e); process.exit(1); });