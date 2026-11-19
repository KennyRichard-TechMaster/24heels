const fs = require('fs');
const path = require('path');
const { db } = require('./database');

const json = (res, status, payload) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const readBody = req => new Promise((resolve, reject) => { let text = ''; req.on('data', chunk => { text += chunk; }); req.on('end', () => { try { resolve(text ? JSON.parse(text) : {}); } catch { reject(Error('Bad JSON')); } }); });

module.exports = async (req, res) => {
  try {
    const body = await readBody(req);
    if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) return json(res, 401, { error: 'Unauthorized' });
    const q = db();
    await q`CREATE TABLE IF NOT EXISTS products (id text PRIMARY KEY,data jsonb NOT NULL,updated_at timestamptz DEFAULT now())`;
    await q`CREATE TABLE IF NOT EXISTS orders (id text PRIMARY KEY,date text NOT NULL,status text NOT NULL,subtotal numeric NOT NULL,delivery_fee numeric NOT NULL DEFAULT 0,total numeric NOT NULL,needs_delivery_arrangement boolean NOT NULL DEFAULT false,customer jsonb NOT NULL,data jsonb NOT NULL,created_at timestamptz DEFAULT now())`;
    await q`CREATE TABLE IF NOT EXISTS order_items (order_id text REFERENCES orders(id) ON DELETE CASCADE,product_id text,name text,size text,qty integer,price numeric,PRIMARY KEY(order_id,product_id,size))`;
    await q`CREATE TABLE IF NOT EXISTS delivery_areas (id text PRIMARY KEY,state text NOT NULL DEFAULT 'Lagos',name text NOT NULL,lga text NOT NULL,zone text,price numeric NOT NULL,enabled boolean NOT NULL DEFAULT true,sort integer NOT NULL DEFAULT 0,bus_stops jsonb NOT NULL DEFAULT '[]'::jsonb)`;
    await q`ALTER TABLE delivery_areas ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'Lagos'`;
    await q`CREATE TABLE IF NOT EXISTS admin_settings (id boolean PRIMARY KEY DEFAULT true,data jsonb NOT NULL,updated_at timestamptz DEFAULT now())`;
    const file = path.join(process.cwd(), 'data', 'db.json');
    if (!fs.existsSync(file)) return json(res, 200, { imported: false, reason: 'No legacy data file found' });
    const legacy = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const product of legacy.products || []) await q`INSERT INTO products(id,data) VALUES(${product.id},${JSON.stringify(product)}::jsonb) ON CONFLICT(id) DO UPDATE SET data=excluded.data`;
    for (const area of legacy.deliveryAreas || []) await q`INSERT INTO delivery_areas(id,state,name,lga,zone,price,enabled,sort,bus_stops) VALUES(${area.id},${area.state || 'Lagos'},${area.name},${area.lga},${area.zone || ''},${area.price || 0},${area.enabled !== false},${area.sort || 0},${JSON.stringify(area.busStops || [])}::jsonb) ON CONFLICT(id) DO UPDATE SET state=excluded.state,name=excluded.name,lga=excluded.lga,zone=excluded.zone,price=excluded.price,enabled=excluded.enabled,sort=excluded.sort,bus_stops=excluded.bus_stops`;
    if (legacy.settings) await q`INSERT INTO admin_settings(id,data) VALUES(true,${JSON.stringify(legacy.settings)}::jsonb) ON CONFLICT(id) DO UPDATE SET data=excluded.data`;
    for (const order of legacy.orders || []) { await q`INSERT INTO orders(id,date,status,subtotal,delivery_fee,total,needs_delivery_arrangement,customer,data) VALUES(${order.id},${order.date || ''},${order.status || 'Awaiting Payment'},${order.subtotal || 0},${order.deliveryFee || 0},${order.total || 0},${!!order.needsDeliveryArrangement},${JSON.stringify(order)}::jsonb,${JSON.stringify(order)}::jsonb) ON CONFLICT(id) DO NOTHING`; for (const item of order.items || []) await q`INSERT INTO order_items(order_id,product_id,name,size,qty,price) VALUES(${order.id},${item.id},${item.name},${item.size},${item.qty},${item.price}) ON CONFLICT DO NOTHING`; }
    return json(res, 200, { imported: true, products: (legacy.products || []).length, orders: (legacy.orders || []).length, areas: (legacy.deliveryAreas || []).length });
  } catch (error) { console.error(error); return json(res, 500, { error: 'Bootstrap failed' }); }
};
