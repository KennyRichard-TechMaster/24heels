require('./lib/env');
const http = require('http');
const fs = require('fs');
const path = require('path');
const api = require('./api');
const bootstrap = require('./lib/bootstrap');
const migrateImages = require('./lib/migrate-images-handler');
const publicDir = path.join(__dirname, 'public');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];
  if (pathname === '/api/bootstrap') return bootstrap(req, res);
  if (pathname === '/api/migrate-images') return migrateImages(req, res);
  if (pathname.startsWith('/api/')) {
    res.status = code => ({ json: data => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); } });
    req.query = { path: pathname.slice(5) };
    return api(req, res);
  }
  let file = path.join(publicDir, decodeURIComponent(pathname || '/').replace(/^\//, ''));
  if (!file.startsWith(publicDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(publicDir, 'index.html');
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000);
