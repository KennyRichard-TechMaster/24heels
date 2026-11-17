const fs = require('fs');
const path = require('path');
const { db } = require('../lib/database');

const respond = (res, status, payload) => res.status(status).json(payload);
const readBody = req => new Promise((resolve, reject) => {
  let value = '';
  req.on('data', chunk => { value += chunk; });
  req.on('end', () => { try { resolve(value ? JSON.parse(value) : {}); } catch { reject(Error('Bad JSON')); } });
});

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return respond(res, 405, { error: 'Method not allowed' });
    const requestBody = await readBody(req);
    if (!process.env.ADMIN_PASSWORD || requestBody.password !== process.env.ADMIN_PASSWORD) {
      return respond(res, 401, { error: 'Unauthorized' });
    }

    const q = db();
    await q`CREATE TABLE IF NOT EXISTS products (id text PRIMARY KEY,data jsonb NOT NULL,updated_at timestamptz DEFAULT now()); CREATE TABLE IF NOT EXISTS orders (id text PRIMARY KEY,date text NOT NULL,status text NOT NULL,subtotal numeric NOT NULL,delivery_fee numeric NOT NULL DEFAULT 0,total numeric NOT NULL,needs_delivery_arrangement boolean NOT NULL DEFAULT false,customer jsonb NOT NULL,data jsonb NOT NULL,created_at timestamptz DEFAULT now()); CREATE TABLE IF NOT EXISTS order_items (order_id text REFERENCES orders(id) ON DELETE CASCADE,product_id text,name text,size text,qty integer,price numeric,PRIMARY KEY(order_id,product_id,size)); CREATE TABLE IF NOT EXISTS delivery_areas (id text PRIMARY KEY,name text NOT NULL,lga text NOT NULL,zone text,price numeric NOT NULL,enabled boolean NOT NULL DEFAULT true,sort integer NOT NULL DEFAULT 0,bus_stops jsonb NOT NULL DEFAULT '[]'::jsonb); CREATE TABLE IF NOT EXISTS admin_settings (id boolean PRIMARY KEY DEFAULT true,data jsonb NOT NULL,updated_at timestamptz DEFAULT now())`;

    const legacyPath = path.join(process.cwd(), 'data', 'db.json');
    if (!fs.existsSync(legacyPath)) return respond(res, 200, { imported: false, reason: 'No legacy data file found' });
    const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    for (const product of legacy.products || []) await q`INSERT INTO products(id,data) VALUES(${product.id},${JSON.stringify(product)}::jsonb) ON CONFLICT(id) DO UPDATE SET data=excluded.data`;
    for (const area of legacy.deliveryAreas || []) await q`INSERT INTO delivery_areas(id,name,lga,zone,price,enabled,sort,bus_stops) VALUES(${area.id},${area.name},${area.lga},${area.zone || ''},${area.price || 0},${area.enabled !== false},${area.sort || 0},${JSON.stringify(area.busStops || [])}::jsonb) ON CONFLICT(id) DO UPDATE SET name=excluded.name,lga=excluded.lga,zone=excluded.zone,price=excluded.price,enabled=excluded.enabled,sort=excluded.sort,bus_stops=excluded.bus_stops`;
    if (legacy.settings) await q`INSERT INTO admin_settings(id,data) VALUES(true,${JSON.stringify(legacy.settings)}::jsonb) ON CONFLICT(id) DO UPDATE SET data=excluded.data`;
    for (const order of legacy.orders || []) {
      await q`INSERT INTO orders(id,date,status,subtotal,delivery_fee,total,needs_delivery_arrangement,customer,data) VALUES(${order.id},${order.date || ''},${order.status || 'Awaiting Payment'},${order.subtotal || 0},${order.deliveryFee || 0},${order.total || 0},${!!order.needsDeliveryArrangement},${JSON.stringify(order)}::jsonb,${JSON.stringify(order)}::jsonb) ON CONFLICT(id) DO NOTHING`;
      for (const item of order.items || []) await q`INSERT INTO order_items(order_id,product_id,name,size,qty,price) VALUES(${order.id},${item.id},${item.name},${item.size},${item.qty},${item.price}) ON CONFLICT DO NOTHING`;
    }
    return respond(res, 200, { imported: true, products: (legacy.products || []).length, orders: (legacy.orders || []).length, areas: (legacy.deliveryAreas || []).length });
  } catch (error) {
    console.error(error);
    return respond(res, 500, { error: 'Bootstrap failed' });
  }
};
