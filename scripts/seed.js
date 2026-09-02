const fs=require('fs');const path=require('path');
const envPath=path.join(__dirname,'..','.env.local');
if(fs.existsSync(envPath)){const c=fs.readFileSync(envPath,'utf-8');c.split('\n').forEach(l=>{const t=l.trim();if(t&&!t.startsWith('#')&&t.includes('=')){const i=t.indexOf('=');const k=t.substring(0,i).trim();let v=t.substring(i+1).trim();if((v.startsWith("'")&&v.endsWith("'"))||(v.startsWith('"')&&v.endsWith('"')))v=v.slice(1,-1);process.env[k]=v;}})}
const{getDb,closeDb}=require('../src/lib/db');
const{seedAdmin}=require('../src/lib/auth');

const products=[
{name:'Vaso Decorativo Geométrico',slug:'vaso-decorativo-geometrico',short_description:'Vaso moderno com design geométrico.',description:'Vaso decorativo PLA de alta qualidade.\n\n• Material: PLA Premium\n• Dimensões: 15x15x20 cm\n• Peso: 150g',price:59.90,compare_price:79.90,images:[],category:'decoração',material:'PLA Premium',weight:150,dimensions:'15x15x20 cm',stock:10,featured:1,active:1},
{name:'Porta-Canetas Personalizado',slug:'porta-canetas-personalizado',short_description:'Organizador de mesa exclusivo.',description:'Porta-canetas impresso em 3D.\n\n• Material: PLA\n• Dimensões: 10x8x12 cm\n• Peso: 80g',price:34.90,compare_price:null,images:[],category:'escritório',material:'PLA',weight:80,dimensions:'10x8x12 cm',stock:20,featured:1,active:1},
{name:'Suporte para Celular',slug:'suporte-para-celular',short_description:'Suporte ajustável minimalista.',description:'Suporte universal para celular.\n\n• Material: PLA+\n• Dimensões: 8x6x10 cm\n• Peso: 45g',price:24.90,compare_price:34.90,images:[],category:'acessórios',material:'PLA+',weight:45,dimensions:'8x6x10 cm',stock:30,featured:1,active:1},
{name:'Miniatura de Animal - Golfinho',slug:'miniatura-golfinho',short_description:'Miniatura realista detalhada.',description:'Miniatura de golfinho em resina.\n\n• Material: Resina\n• Dimensões: 12x5x8 cm\n• Peso: 60g',price:44.90,compare_price:null,images:[],category:'coleção',material:'Resina',weight:60,dimensions:'12x5x8 cm',stock:15,featured:0,active:1},
{name:'Luminária LED Personalizada',slug:'luminaria-led-personalizada',short_description:'Luminária com efeito noturno.',description:'Luminária decorativa com LED.\n\n• Material: PLA Translúcido\n• Dimensões: 12x12x18 cm\n• Peso: 200g',price:89.90,compare_price:129.90,images:[],category:'decoração',material:'PLA Translúcido',weight:200,dimensions:'12x12x18 cm',stock:8,featured:1,active:1},
{name:'Chaveiro Personalizado',slug:'chaveiro-personalizado',short_description:'Chaveiro com seu nome ou logo.',description:'Chaveiro personalizado impresso em 3D.\n\n• Material: PLA\n• Dimensões: 5x2.5x0.5 cm\n• Peso: 10g',price:14.90,compare_price:null,images:[],category:'acessórios',material:'PLA',weight:10,dimensions:'5x2.5x0.5 cm',stock:50,featured:0,active:1},
{name:'Busto para Decoração',slug:'busto-decoracao',short_description:'Busto clássico para interiores.',description:'Busto decorativo com detalhes precisos.\n\n• Material: PLA Premium\n• Dimensões: 8x6x15 cm\n• Peso: 120g',price:54.90,compare_price:69.90,images:[],category:'decoração',material:'PLA Premium',weight:120,dimensions:'8x6x15 cm',stock:12,featured:0,active:1},
{name:'Organizador de Gavetas',slug:'organizador-de-gavetas',short_description:'Módulo organizador divisível.',description:'Organizador modular para gavetas.\n\n• Material: PLA\n• Dimensões: 20x10x5 cm\n• Peso: 90g',price:29.90,compare_price:null,images:[],category:'escritório',material:'PLA',weight:90,dimensions:'20x10x5 cm',stock:25,featured:0,active:1},
];

async function seed(){const db=await getDb();await seedAdmin();const stmt=db.prepare('INSERT INTO products (name,slug,short_description,description,price,compare_price,images,category,material,weight,dimensions,stock,featured,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');let count=0;for(const p of products){const e=await db.prepare('SELECT id FROM products WHERE slug=?').get(p.slug);if(!e){await stmt.run(p.name,p.slug,p.short_description,p.description,p.price,p.compare_price,JSON.stringify(p.images),p.category,p.material,p.weight,p.dimensions,p.stock,p.featured,p.active);count++;}}
console.log('✅ '+count+' produtos cadastrados.');await closeDb();console.log('\n🎉 Pronto!');}
seed().catch(err=>{console.error(err);process.exit(1);});


