const crypto = require('crypto');
const { db } = require('../lib/database');
const ceoHash = () => { const salt = '24heelz-ceo-owner-v1'; return `${salt}:${crypto.scryptSync('admin', salt, 64).toString('hex')}`; };

async function main() {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS products (id text PRIMARY KEY,data jsonb NOT NULL,updated_at timestamptz DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS orders (id text PRIMARY KEY,date text NOT NULL,status text NOT NULL,subtotal numeric NOT NULL,delivery_fee numeric NOT NULL DEFAULT 0,total numeric NOT NULL,needs_delivery_arrangement boolean NOT NULL DEFAULT false,customer jsonb NOT NULL,data jsonb NOT NULL,created_at timestamptz DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS order_items (order_id text REFERENCES orders(id) ON DELETE CASCADE,product_id text,name text,size text,qty integer,price numeric,PRIMARY KEY(order_id,product_id,size))`;
  await sql`CREATE TABLE IF NOT EXISTS delivery_areas (id text PRIMARY KEY,state text NOT NULL DEFAULT 'Lagos',name text NOT NULL,lga text NOT NULL,zone text,price numeric NOT NULL,enabled boolean NOT NULL DEFAULT true,sort integer NOT NULL DEFAULT 0,bus_stops jsonb NOT NULL DEFAULT '[]'::jsonb)`;
  await sql`ALTER TABLE delivery_areas ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'Lagos'`;
  await sql`CREATE TABLE IF NOT EXISTS admin_settings (id boolean PRIMARY KEY DEFAULT true,data jsonb NOT NULL,updated_at timestamptz DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS admin_users (username text PRIMARY KEY,password_hash text NOT NULL,role text NOT NULL DEFAULT 'Admin',created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`INSERT INTO admin_settings (id,data) VALUES (true,'{}'::jsonb) ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO admin_users(username,password_hash,role) VALUES(${'CEO'},${ceoHash()},${'Owner'}) ON CONFLICT(username) DO NOTHING`;
  console.log('Database schema and CEO admin account are ready.');
}
main().catch(error => { console.error(error); process.exit(1); });
