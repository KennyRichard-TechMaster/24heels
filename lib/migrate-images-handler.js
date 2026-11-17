const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { put } = require('@vercel/blob');
const { db } = require('./database');

const respond = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
const readBody = req => new Promise((resolve, reject) => { let value = ''; req.on('data', chunk => { value += chunk; }); req.on('end', () => { try { resolve(value ? JSON.parse(value) : {}); } catch { reject(Error('Bad JSON')); } }); });

module.exports = async (req, res) => {
  try {
    const body = await readBody(req);
    if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) return respond(res, 401, { error: 'Unauthorized' });
    const q = db();
    const products = (await q`SELECT id,data FROM products`).map(row => row.data);
    let migrated = 0;
    for (const product of products) {
      let changed = false;
      const images = [];
      for (const image of product.imgs || []) {
        if (!String(image).startsWith('/')) { images.push(image); continue; }
        const file = String(image).startsWith('/uploads/')
          ? path.join(process.cwd(), 'data', 'uploads', path.basename(image))
          : path.join(process.cwd(), 'public', decodeURIComponent(image).replace(/^\//, ''));
        if (!fs.existsSync(file)) { images.push(image); continue; }
        const extension = path.extname(file) || '.jpg';
        const blob = await put(`products/${crypto.randomUUID()}${extension}`, fs.readFileSync(file), { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
        images.push(blob.url);
        changed = true;
        migrated += 1;
      }
      if (changed) {
        product.imgs = images;
        await q`UPDATE products SET data=${JSON.stringify(product)}::jsonb,updated_at=now() WHERE id=${product.id}`;
      }
    }
    return respond(res, 200, { migrated });
  } catch (error) { console.error(error); return respond(res, 500, { error: 'Image migration failed' }); }
};
