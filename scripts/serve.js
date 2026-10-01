import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = (await readFile(resolve(root, 'package.json'), 'utf8')).includes('catalog-match-lab');
const port = Number(process.env.PORT ?? (catalog ? 4311 : 4312));
const allowedHosts = new Set(['127.0.0.1:' + port, 'localhost:' + port]);
const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.csv': 'text/csv' };
let busy = false, windowStart = Date.now(), calls = 0;
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
  if (!allowedHosts.has(req.headers.host)) return json(res, 403, { error: 'Local host required' });
  try {
    const path = new URL(req.url, 'http://' + req.headers.host).pathname;
    if (path === '/api/config' && req.method === 'GET') return json(res, 200, { jev: catalog && Boolean(process.env.JEV_API_KEY) });
    if (path === '/api/jev' && req.method === 'POST' && catalog) {
      const origin = req.headers.origin;
      if (!origin || ![...allowedHosts].some(h => origin === 'http://' + h) || req.headers['content-type'] !== 'application/json') return json(res, 403, { error: 'Same-origin JSON request required' });
      if (!process.env.JEV_API_KEY) return json(res, 503, { error: 'Start the local server with JEV_API_KEY configured' });
      if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); calls = 0; }
      if (busy || calls >= 6) return json(res, 429, { error: 'One request at a time, up to six per minute' });
      busy = true; calls++;
      try {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
          if (Buffer.byteLength(body) > 32768) { json(res, 413, { error: 'Request too large' }); req.destroy(); return; }
        }
        const { reviewWithJev } = await import('../src/jev.js');
        const result = await reviewWithJev(JSON.parse(body).pairs, { apiKey: process.env.JEV_API_KEY });
        return json(res, 200, result);
      } catch { return json(res, 502, { error: 'Could not complete the provider request. Check configuration and try again.' }); }
      finally { busy = false; }
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });
    const relative = path === '/' ? 'demo/index.html' : decodeURIComponent(path).slice(1);
    const allow = /^(demo\/[a-z-]+\.(html|css|js)|docs\/images\/[a-z-]+\.(svg|png)|src\/(index|cache|match|csv)\.js|data\/(catalog\.js|sample\.csv)|examples\/scenarios\.js)$/;
    if (!allow.test(relative)) return json(res, 404, { error: 'Not found' });
    const file = resolve(root, relative);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) return json(res, 404, { error: 'Not found' });
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { json(res, 404, { error: 'Not found' }); }
});
server.listen(port, '127.0.0.1', () => console.log('Local demo: http://127.0.0.1:' + port));
