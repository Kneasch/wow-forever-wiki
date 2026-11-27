// Local server for the wiki.
//
//   npm run dev       renders pages on request with Vue (src/), and restarts when src/, research/ or site/ change
//   npm start         the same, without restarting
//   npm run preview   serves a finished build (dist/) as a static host would (SITE_DIR=dist)
//
// Either way: clean /w/<Page> URLs, /404.html for anything else. Add future backend endpoints to `routes`.
const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const STATIC_DIR = process.env.SITE_DIR ? path.resolve(__dirname, process.env.SITE_DIR) : null;
const ASSETS = STATIC_DIR || path.join(__dirname, 'site');
const PORT = process.env.PORT || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

// Backend routes: exact pathname -> async (req, res, url) handler.
const routes = {
  // '/api/search': async (req, res, url) => { ... },
};

// Pages rendered live (no SITE_DIR): URL path -> page, from the same page sources the build uses
let pages = null;
let renderPage = null;
if (!STATIC_DIR) {
  const render = require('./src/build/render');
  renderPage = render.renderPage;
  const t = Date.now();
  pages = new Map(render.collectPages().map((p) => [decodeURI(p.url), p]));
  console.log(`Loaded ${pages.size} pages in ${Date.now() - t} ms`);
}

// Resolve a URL path to a file inside dir, or null if outside/missing.
async function resolveFile(dir, pathname) {
  const full = path.join(dir, decodeURIComponent(pathname));
  if (!full.startsWith(dir + path.sep)) return null;
  for (const c of [full, full + '.html', path.join(full, 'index.html')]) {
    try {
      if ((await fs.stat(c)).isFile()) return c;
    } catch {}
  }
  return null;
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

async function notFound(res) {
  if (pages) return send(res, 404, TYPES['.html'], await renderPage(pages.get('/404.html')));
  send(res, 404, TYPES['.html'], await fs.readFile(path.join(STATIC_DIR, '404.html')));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const handler = routes[url.pathname];
    if (handler) return await handler(req, res, url);

    if (pages) {
      const page = pages.get(decodeURIComponent(url.pathname));
      if (page) return send(res, 200, TYPES['.html'], await renderPage(page));
    }
    const file = await resolveFile(ASSETS, url.pathname === '/' ? '/index.html' : url.pathname);
    if (file) return send(res, 200, TYPES[path.extname(file)] || 'application/octet-stream', await fs.readFile(file));
    await notFound(res);
  } catch (err) {
    console.error(err);
    send(res, 500, 'text/plain', `Server error\n\n${err.stack}`);
  }
});

server.listen(PORT, () => console.log(`Wiki running at http://localhost:${PORT}${STATIC_DIR ? ` (serving ${path.relative(__dirname, STATIC_DIR)}/)` : ''}`));
