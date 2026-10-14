// Minimal static server for headless Chrome (ES modules don't load from file://).
//   /kit/...  files in this repo     /ws/...  files in the workspace
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { KIT } from './paths.mjs';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

export function serve(ws) {
  const roots = { kit: KIT, ws: resolve(ws) };
  const server = createServer((req, res) => {
    const [, root, ...rest] = decodeURIComponent(new URL(req.url, 'http://x').pathname).split('/');
    const base = roots[root];
    const file = base && resolve(join(base, ...rest));
    if (!file || !file.startsWith(base) || !existsSync(file) || statSync(file).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, base: `http://127.0.0.1:${server.address().port}` })));
}
