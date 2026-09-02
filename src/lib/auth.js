const { SignJWT, jwtVerify } = require('jose');
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production'
);

const COOKIE_NAME = 'tv_admin_token';
const TOKEN_EXPIRY = '24h';

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Create a JWT token for admin authentication
 */
async function createToken(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

/**
 * Verify a JWT token and return the payload
 */
async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Validate admin credentials and return a token
 */
async function loginAdmin(username, password) {
  const db = await getDb();
  const user = await db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);

  if (!user) return null;

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;

  const token = await createToken({
    id: user.id,
    username: user.username,
    role: 'admin',
  });

  return { token, user: { id: user.id, username: user.username } };
}

/**
 * Set the auth cookie in the response
 */
function setAuthCookie(response, token) {
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
  );
}

/**
 * Clear the auth cookie
 */
function clearAuthCookie(response) {
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );
}

/**
 * Get the token from request cookies
 */
function getTokenFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );
  return cookies[COOKIE_NAME] || null;
}

/**
 * Middleware to check if request is authenticated
 * Returns { authenticated: boolean, user: object | null }
 */
async function checkAuth(request) {
  const token = getTokenFromRequest(request);
  if (!token) return { authenticated: false, user: null };

  const payload = await verifyToken(token);
  if (!payload) return { authenticated: false, user: null };

  return { authenticated: true, user: payload };
}

/**
 * Seed the initial admin user (run only once)
 */
async function seedAdmin() {
  const db = await getDb();
  const existing = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();

  if (existing.count === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'tracovolume2026';
    const hash = await hashPassword(password);

    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`✅ Admin user "${username}" created with password "${password}"`);
  }
}

/**
 * Generate a unique order ID
 */
function generateOrderId() {
  const date = new Date();
  const prefix = `TV${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `${prefix}${random}`;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  loginAdmin,
  setAuthCookie,
  clearAuthCookie,
  getTokenFromRequest,
  checkAuth,
  seedAdmin,
  generateOrderId,
  COOKIE_NAME,
};