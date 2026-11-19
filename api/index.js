const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');
const { db } = require('../lib/database');
const { buildCatalogue, downloadNigeriaLocations } = require('../lib/delivery-catalogue');

const S = (value, length) => String(value ?? '').trim().slice(0, length);
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(String(password), salt, 64).toString('hex')}`;
const verifyPassword = (password, saved) => { try { const [salt, expected] = String(saved).split(':'); const actual = crypto.scryptSync(String(password), salt, 64).toString('hex'); return expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual)); } catch { return false; } };
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'local-secret';
const sign = user => { const payload = Buffer.from(JSON.stringify({ user, expires: Date.now() + 432e5 })).toString('base64url'); return `${payload}.${crypto.createHmac('sha256', secret()).update(payload).digest('base64url')}`; };
const authenticated = request => { try { const [payload, signature] = (request.headers.authorization || '').replace(/^Bearer /, '').split('.'); return signature === crypto.createHmac('sha256', secret()).update(payload).digest('base64url') && JSON.parse(Buffer.from(payload, 'base64url')).expires > Date.now(); } catch { return false; } };
const body = request => { if (request.body && typeof request.body === 'object') return Promise.resolve(request.body); return new Promise((resolve, reject) => { let raw = ''; request.on('data', chunk => { raw += chunk; }); request.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(Error('Bad JSON')); } }); }); };
const out = (response, status, payload) => response.status(status).json(payload);
const config = async query => (await query`SELECT data FROM admin_settings WHERE id=true`)[0]?.data || {};
const mapArea = row => ({ id: row.id, state: row.state || 'Lagos', name: row.name, lga: row.lga, zone: row.zone, price: +row.price, enabled: row.enabled, sort: row.sort, busStops: row.bus_stops || [] });

async function createTables(query) {
  await query`CREATE TABLE IF NOT EXISTS products (id text PRIMARY KEY,data jsonb NOT NULL,updated_at timestamptz DEFAULT now())`;
  await query`CREATE TABLE IF NOT EXISTS orders (id text PRIMARY KEY,date text NOT NULL,status text NOT NULL,subtotal numeric NOT NULL,delivery_fee numeric NOT NULL DEFAULT 0,total numeric NOT NULL,needs_delivery_arrangement boolean NOT NULL DEFAULT false,customer jsonb NOT NULL,data jsonb NOT NULL,created_at timestamptz DEFAULT now())`;
  await query`CREATE TABLE IF NOT EXISTS order_items (order_id text REFERENCES orders(id) ON DELETE CASCADE,product_id text,name text,size text,qty integer,price numeric,PRIMARY KEY(order_id,product_id,size))`;
  await query`CREATE TABLE IF NOT EXISTS delivery_areas (id text PRIMARY KEY,state text NOT NULL DEFAULT 'Lagos',name text NOT NULL,lga text NOT NULL,zone text,price numeric NOT NULL,enabled boolean NOT NULL DEFAULT true,sort integer NOT NULL DEFAULT 0,bus_stops jsonb NOT NULL DEFAULT '[]'::jsonb)`;
  await query`CREATE TABLE IF NOT EXISTS admin_settings (id boolean PRIMARY KEY DEFAULT true,data jsonb NOT NULL,updated_at timestamptz DEFAULT now())`;
  await query`CREATE TABLE IF NOT EXISTS admin_users (username text PRIMARY KEY,password_hash text NOT NULL,role text NOT NULL DEFAULT 'Admin',created_at timestamptz NOT NULL DEFAULT now())`;
  await query`ALTER TABLE delivery_areas ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'Lagos'`;
}

async function ensureAdminUsers(query) {
  await query`CREATE TABLE IF NOT EXISTS admin_users (username text PRIMARY KEY,password_hash text NOT NULL,role text NOT NULL DEFAULT 'Admin',created_at timestamptz NOT NULL DEFAULT now())`;
  // Requested permanent owner account. Only the salted password hash is stored.
  await query`INSERT INTO admin_users(username,password_hash,role) VALUES(${'CEO'},${hashPassword('admin', '24heelz-ceo-owner-v1')},${'Owner'}) ON CONFLICT(username) DO NOTHING`;
}

async function bootstrap(query) {
  await createTables(query);
  const file = path.join(process.cwd(), 'data', 'db.json');
  if (!fs.existsSync(file)) return { imported: false };
  const old = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const product of old.products || []) await query`INSERT INTO products(id,data) VALUES(${product.id},${JSON.stringify(product)}::jsonb) ON CONFLICT(id) DO UPDATE SET data=excluded.data`;
  for (const area of old.deliveryAreas || []) await query`INSERT INTO delivery_areas(id,state,name,lga,zone,price,enabled,sort,bus_stops) VALUES(${area.id},${area.state || 'Lagos'},${area.name},${area.lga},${area.zone || ''},${area.price || 0},${area.enabled !== false},${area.sort || 0},${JSON.stringify(area.busStops || [])}::jsonb) ON CONFLICT(id) DO UPDATE SET state=excluded.state,name=excluded.name,lga=excluded.lga,zone=excluded.zone,price=excluded.price,enabled=excluded.enabled,sort=excluded.sort,bus_stops=excluded.bus_stops`;
  if (old.settings) await query`INSERT INTO admin_settings(id,data) VALUES(true,${JSON.stringify(old.settings)}::jsonb) ON CONFLICT(id) DO UPDATE SET data=excluded.data`;
  for (const order of old.orders || []) { await query`INSERT INTO orders(id,date,status,subtotal,delivery_fee,total,needs_delivery_arrangement,customer,data) VALUES(${order.id},${order.date || ''},${order.status || 'Awaiting Payment'},${order.subtotal || 0},${order.deliveryFee || 0},${order.total || 0},${!!order.needsDeliveryArrangement},${JSON.stringify(order)}::jsonb,${JSON.stringify(order)}::jsonb) ON CONFLICT(id) DO NOTHING`; for (const item of order.items || []) await query`INSERT INTO order_items(order_id,product_id,name,size,qty,price) VALUES(${order.id},${item.id},${item.name},${item.size},${item.qty},${item.price}) ON CONFLICT DO NOTHING`; }
  return { imported: true, products: (old.products || []).length, orders: (old.orders || []).length, areas: (old.deliveryAreas || []).length };
}

async function seedDeliveryCatalogue(query) {
  await createTables(query);
  const source = await downloadNigeriaLocations();
  const areas = buildCatalogue(source);
  await query`DELETE FROM delivery_areas`;
  for (let index = 0; index < areas.length; index += 80) {
    await Promise.all(areas.slice(index, index + 80).map(area => query`INSERT INTO delivery_areas(id,state,name,lga,zone,price,enabled,sort,bus_stops) VALUES(${area.id},${area.state},${area.name},${area.lga},${area.zone},${area.price},${area.enabled},${area.sort},${JSON.stringify(area.busStops)}::jsonb)`));
  }
  return { states: source.states.length, lgas: source.totalLgas, areas: areas.length };
}

module.exports = async (request, response) => {
  try {
    const query = db();
    const url = new URL(request.url, 'http://localhost');
    const route = String(request.query?.path || url.searchParams.get('path') || '').replace(/^\//, '');
    if (request.method === 'POST' && route === 'bootstrap') { const input = await body(request); if (!process.env.ADMIN_PASSWORD || input.password !== process.env.ADMIN_PASSWORD) return out(response, 401, { error: 'Unauthorized' }); return out(response, 200, await bootstrap(query)); }
    if (request.method === 'POST' && route === 'seed-delivery') { const input = await body(request); if (!process.env.ADMIN_PASSWORD || input.password !== process.env.ADMIN_PASSWORD) return out(response, 401, { error: 'Unauthorized' }); return out(response, 200, await seedDeliveryCatalogue(query)); }
    if (request.method === 'GET' && route === 'products') return out(response, 200, (await query`SELECT data FROM products ORDER BY updated_at DESC`).map(row => row.data));
    if (request.method === 'GET' && route === 'config') return out(response, 200, await config(query));
    if (request.method === 'GET' && route === 'delivery-areas') return out(response, 200, (await query`SELECT * FROM delivery_areas WHERE enabled=true ORDER BY state,lga,sort,name`).map(mapArea));
    if (request.method === 'POST' && route === 'login') { const input = await body(request); await ensureAdminUsers(query); const admin = (await query`SELECT password_hash FROM admin_users WHERE username=${S(input.u, 60)}`)[0]; if ((input.u === process.env.ADMIN_USERNAME && input.p === process.env.ADMIN_PASSWORD) || (admin && verifyPassword(input.p, admin.password_hash))) return out(response, 200, { token: sign(input.u) }); return out(response, 401, { error: 'Wrong username or password' }); }
    if (request.method === 'POST' && route === 'upload') { if (!authenticated(request)) return out(response, 401, { error: 'Login required' }); const input = await body(request); const match = String(input.data || '').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/s); if (!match) return out(response, 400, { error: 'Bad image' }); const file = await put(`products/${crypto.randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`, Buffer.from(match[2], 'base64'), { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN }); return out(response, 200, { url: file.url }); }
    if (request.method === 'POST' && route === 'orders') {
      const input = await body(request), items = [];
      for (const item of input.items || []) { const product = (await query`SELECT data FROM products WHERE id=${item.id}`)[0]?.data; if (!product) return out(response, 400, { error: 'An item is unavailable' }); items.push({ id: product.id, name: product.name, size: S(item.size, 10), qty: +item.qty, price: +product.price }); }
      if (!items.length || !input.name || !input.phone || !input.email || !input.state || !input.city || !input.deliveryAreaId || !input.landmark || !input.street) return out(response, 400, { error: 'Complete every required delivery field' });
      const area = (await query`SELECT * FROM delivery_areas WHERE id=${S(input.deliveryAreaId, 160)} AND enabled=true`)[0];
      if (!area || area.state !== input.state || area.lga !== input.city) return out(response, 400, { error: 'Select a valid delivery area' });
      const subtotal = items.reduce((total, item) => total + item.qty * item.price, 0), fee = +area.price, id = `24H-${Date.now()}`;
      const order = { id, date: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }), status: 'Awaiting Payment', subtotal, deliveryFee: fee, total: subtotal + fee, needsDeliveryArrangement: false, deliveryArea: area.name, items, ...input };
      await query`INSERT INTO orders (id,date,status,subtotal,delivery_fee,total,needs_delivery_arrangement,customer,data) VALUES (${id},${order.date},${order.status},${subtotal},${fee},${subtotal + fee},false,${JSON.stringify(input)}::jsonb,${JSON.stringify(order)}::jsonb)`;
      for (const item of items) await query`INSERT INTO order_items VALUES (${id},${item.id},${item.name},${item.size},${item.qty},${item.price})`;
      return out(response, 200, order);
    }
    let match = route.match(/^orders\/(24H-[^/]+)\/(paid|status)$/);
    if (match) { const order = (await query`SELECT data FROM orders WHERE id=${match[1]}`)[0]?.data; if (!order) return out(response, 404, { error: 'Order not found' }); if (match[2] === 'paid' && request.method === 'POST') { order.status = 'Payment Confirming'; await query`UPDATE orders SET status=${order.status},data=${JSON.stringify(order)}::jsonb WHERE id=${order.id}`; } return out(response, 200, order); }
    if (!authenticated(request)) return out(response, 401, { error: 'Login required' });
    if (request.method === 'GET' && route === 'admins') { await ensureAdminUsers(query); return out(response, 200, (await query`SELECT username,role,created_at FROM admin_users ORDER BY role DESC,username`).map(admin => ({ username: admin.username, role: admin.role, createdAt: admin.created_at }))); }
    if (request.method === 'POST' && route === 'admins') { const input = await body(request), username = S(input.username, 60); if (!/^[A-Za-z0-9._-]{3,60}$/.test(username) || String(input.password || '').length < 4) return out(response, 400, { error: 'Use a 3+ character username and a password of at least 4 characters' }); await ensureAdminUsers(query); const exists = (await query`SELECT username FROM admin_users WHERE username=${username}`)[0]; if (exists) return out(response, 409, { error: 'That username is already in use' }); await query`INSERT INTO admin_users(username,password_hash,role) VALUES(${username},${hashPassword(input.password)},${'Admin'})`; return out(response, 200, { username, role: 'Admin' }); }
    let adminMatch = route.match(/^admins\/([^/]+)$/);
    if (adminMatch && request.method === 'DELETE') { const username = decodeURIComponent(adminMatch[1]); if (username === 'CEO') return out(response, 400, { error: 'The CEO owner account cannot be deleted' }); await query`DELETE FROM admin_users WHERE username=${username}`; return out(response, 200, { ok: true }); }
    if (adminMatch && request.method === 'PATCH') { const input = await body(request), username = decodeURIComponent(adminMatch[1]); if (String(input.password || '').length < 4) return out(response, 400, { error: 'Use a password of at least 4 characters' }); await query`UPDATE admin_users SET password_hash=${hashPassword(input.password)} WHERE username=${username}`; return out(response, 200, { ok: true }); }
    if (request.method === 'GET' && route === 'orders') return out(response, 200, (await query`SELECT data FROM orders ORDER BY created_at DESC`).map(row => row.data));
    if (request.method === 'GET' && route === 'delivery-areas') return out(response, 200, (await query`SELECT * FROM delivery_areas ORDER BY state,lga,sort,name`).map(mapArea));
    if (request.method === 'GET' && route === 'settings') return out(response, 200, await config(query));
    if (request.method === 'PUT' && route === 'products') { const input = await body(request); for (const product of input) await query`INSERT INTO products(id,data) VALUES(${product.id},${JSON.stringify(product)}::jsonb) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=now()`; return out(response, 200, input); }
    if (request.method === 'PUT' && route === 'delivery-areas') { const input = await body(request); for (const area of input) await query`INSERT INTO delivery_areas(id,state,name,lga,zone,price,enabled,sort,bus_stops) VALUES(${area.id},${area.state || 'Lagos'},${area.name},${area.lga},${area.zone || ''},${area.price},${!!area.enabled},${area.sort || 0},${JSON.stringify(area.busStops || [])}::jsonb) ON CONFLICT(id) DO UPDATE SET state=excluded.state,name=excluded.name,lga=excluded.lga,zone=excluded.zone,price=excluded.price,enabled=excluded.enabled,sort=excluded.sort,bus_stops=excluded.bus_stops`; return out(response, 200, input); }
    if (request.method === 'PUT' && route === 'settings') { const input = await body(request); await query`INSERT INTO admin_settings(id,data) VALUES(true,${JSON.stringify(input)}::jsonb) ON CONFLICT(id) DO UPDATE SET data=excluded.data`; return out(response, 200, input); }
    // Orders imported from the original JSON store use ORD-0001 style IDs,
    // while newer orders use 24H-timestamp IDs. Both must remain manageable.
    match = route.match(/^orders\/([^/]+)$/);
    if (match && request.method === 'DELETE') { await query`DELETE FROM orders WHERE id=${decodeURIComponent(match[1])}`; return out(response, 200, { ok: 1 }); }
    if (match && request.method === 'PATCH') { const id = decodeURIComponent(match[1]), input = await body(request), order = (await query`SELECT data FROM orders WHERE id=${id}`)[0]?.data; if (!order) return out(response, 404, { error: 'Not found' }); order.status = S(input.status, 40); await query`UPDATE orders SET status=${order.status},data=${JSON.stringify(order)}::jsonb WHERE id=${order.id}`; return out(response, 200, order); }
    return out(response, 404, { error: 'Not found' });
  } catch (error) { console.error(error); return out(response, 500, { error: 'Server error' }); }
};
