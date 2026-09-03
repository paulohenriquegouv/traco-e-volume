const mysql = require('mysql2/promise');
const { URL } = require('url');
let pool = null, mockDb = null;

class MySQLDB {
  constructor(p) { this.pool = p; }
  prepare(sql) {
    const self = this;
    return {
      async get(...p) { const [r] = await self.pool.execute(sql, p); return r[0] || null; },
      async all(...p) { const [r] = await self.pool.execute(sql, p); return r; },
      async run(...p) { const [r] = await self.pool.execute(sql, p); return { lastInsertRowid: r.insertId, changes: r.affectedRows ?? 0 }; },
    };
  }
  async exec(sql) { await this.pool.execute(sql); }
}

function createMockDb() {
  return { prepare(sql) { return { get: async () => null, all: async () => [], run: async () => ({ lastInsertRowid: 0, changes: 0 }) }; }, exec: async () => {} };
}

function parseDatabaseUrl(url) {
  try {
    const p = new URL(url);
    return { host: p.hostname, port: parseInt(p.port || '3306'), user: decodeURIComponent(p.username), password: decodeURIComponent(p.password), database: p.pathname.replace(/^\//, ''), ssl: { rejectUnauthorized: false } };
  } catch { return null; }
}

async function createTables(pool) {
  const sql = "CREATE TABLE IF NOT EXISTS ";
  await pool.execute(sql + "products (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL UNIQUE, description TEXT, short_description TEXT, price DECIMAL(10,2) NOT NULL DEFAULT 0, compare_price DECIMAL(10,2) DEFAULT NULL, images TEXT, category VARCHAR(100) DEFAULT '', tags TEXT, weight DECIMAL(10,2) DEFAULT NULL, dimensions VARCHAR(100) DEFAULT '', material VARCHAR(100) DEFAULT '', colors TEXT, stock INT DEFAULT 0, featured INT DEFAULT 0, active INT DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  await pool.execute(sql + "orders (id INT AUTO_INCREMENT PRIMARY KEY, order_id VARCHAR(50) NOT NULL UNIQUE, customer_name VARCHAR(255) NOT NULL, customer_email VARCHAR(255) NOT NULL, customer_phone VARCHAR(50) DEFAULT '', customer_document VARCHAR(50) DEFAULT '', shipping_address TEXT, payment_method VARCHAR(50) DEFAULT '', payment_id VARCHAR(255) DEFAULT '', payment_status VARCHAR(50) DEFAULT 'pending', total DECIMAL(10,2) NOT NULL DEFAULT 0, status VARCHAR(50) DEFAULT 'pending', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  await pool.execute(sql + "order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, product_id INT DEFAULT NULL, product_name VARCHAR(255) NOT NULL, quantity INT NOT NULL DEFAULT 1, unit_price DECIMAL(10,2) NOT NULL DEFAULT 0, total DECIMAL(10,2) NOT NULL DEFAULT 0, FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE, FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  await pool.execute(sql + "admin_users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  await pool.execute(sql + "settings (`key` VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  try { await pool.execute('CREATE INDEX idx_products_slug ON products(slug)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_products_category ON products(category)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_products_featured ON products(featured)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_products_active ON products(active)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_orders_status ON orders(status)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_orders_order_id ON orders(order_id)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_order_items_order ON order_items(order_id)'); } catch {}
}

// Nem todo servidor aceita SSL: o Aiven exige, o MySQL 5.7 da Locaweb (DBaaS) pode
// recusar o handshake. Tenta com SSL e, se a falha for do próprio TLS, repete sem.
// Para forçar, use ssl-mode=DISABLED ou ssl-mode=REQUIRED na DATABASE_URL.
function falhaDeSsl(e) {
  const m = String(e?.message || '');
  return e?.code === 'HANDSHAKE_NO_SSL_SUPPORT'
    || /SSL|TLS|secure connection|wrong version number/i.test(m);
}

async function abrirPool(config, comSsl) {
  const p = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ...(comSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  await p.execute('SELECT 1');
  return p;
}

async function getDb() {
  if (pool) return new MySQLDB(pool);
  if (mockDb) return mockDb;
  let config;
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) { config = parseDatabaseUrl(dbUrl); if (!config) { mockDb = createMockDb(); return mockDb; } }
  else { config = { host: process.env.MYSQL_HOST || 'localhost', port: parseInt(process.env.MYSQL_PORT || '3306'), user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASSWORD || '', database: process.env.MYSQL_DATABASE || 'traco_e_volume' }; }

  const modo = /ssl-mode=DISABLED/i.test(dbUrl || '') ? 'sem'
    : /ssl-mode=REQUIRED/i.test(dbUrl || '') ? 'com' : 'auto';

  try {
    try {
      pool = await abrirPool(config, modo !== 'sem');
    } catch (e) {
      if (modo === 'auto' && falhaDeSsl(e)) {
        console.log('Servidor sem SSL, reconectando sem TLS...');
        pool = await abrirPool(config, false);
      } else {
        throw e;
      }
    }
    await createTables(pool);
    console.log('OK MySQL: ' + config.database);
    return new MySQLDB(pool);
  } catch (e) {
    console.error(e.message);
    try {
      const tmp = mysql.createPool({ host: config.host, port: config.port, user: config.user, password: config.password, ssl: { rejectUnauthorized: false }, connectionLimit: 1 });
      await tmp.execute('CREATE DATABASE IF NOT EXISTS `' + config.database + '` CHARACTER SET utf8mb4');
      await tmp.end();
      pool = mysql.createPool({ host: config.host, port: config.port, user: config.user, password: config.password, database: config.database, ssl: { rejectUnauthorized: false }, waitForConnections: true, connectionLimit: 10, queueLimit: 0 });
      await createTables(pool);
      console.log('DB criado: ' + config.database);
      return new MySQLDB(pool);
    } catch (e2) { console.error(e2.message); mockDb = createMockDb(); return mockDb; }
  }
}

async function closeDb() { if (pool) { await pool.end(); pool = null; } }
module.exports = { getDb, closeDb };