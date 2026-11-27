// Lightweight local server for the wiki. Zero dependencies, Node 18+.
// Mirrors nginx/default.conf: SSI includes, clean /w/ URLs, hidden _includes.
// Add future backend endpoints to `routes` (e.g. '/api/search').
const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, process.env.SITE_DIR || 'site'); // SITE_DIR=dist to preview a build
const PORT = process.env.PORT || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

// Backend routes: exact pathname -> async (req, res, url) handler.
const routes = {
  // '/api/search': async (req, res, url) => { ... },
};

// Live Auction House prices. With BLIZZARD_CLIENT_ID/SECRET set, /data/ah/<region>-<ruleset>-<faction>.json
// is built from the Blizzard API on request (cached per region, refreshed at most every AH_TTL_MIN
// minutes; Blizzard updates snapshots about hourly). Without credentials the static files that
// scripts/fetch-ah-prices.js wrote under site/data/ah/ are served as usual.
const ahApi = require('./scripts/ah/blizzard');
const AH_PATH = /^\/data\/ah\/(us|eu)-(pve|pvp|rp|rppvp)-(alliance|horde)\.json$/;
const AH_TTL = (Number(process.env.AH_TTL_MIN) || 30) * 60_000;
const ahCache = new Map(); // region -> { at, promise }
function ahRegion(region) {
  const hit = ahCache.get(region);
  if (hit && Date.now() - hit.at < AH_TTL) return hit.promise;
  const promise = ahApi.fetchRegion(region);
  ahCache.set(region, { at: Date.now(), promise });
  promise.catch(() => ahCache.delete(region)); // retry on the next request instead of caching the failure
  return promise;
}
async function ahRoute(req, res, m) {
  try {
    const seg = (await ahRegion(m[1]))[m.slice(1, 4).join('-')];
    if (!seg) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('null'); }
    res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'max-age=300' });
    res.end(JSON.stringify(seg));
  } catch (err) {
    console.error('AH prices:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end('null');
  }
}

// Resolve a URL path to a file inside ROOT, or null if outside/missing.
async function resolveFile(pathname, { allowUnderscore = false } = {}) {
  const rel = decodeURIComponent(pathname);
  const full = path.join(ROOT, rel);
  if (!full.startsWith(ROOT + path.sep)) return null;
  if (!allowUnderscore && rel.split('/').some((s) => s.startsWith('_'))) return null;
  const candidates = [full, full + '.html', path.join(full, 'index.html')];
  for (const c of candidates) {
    try {
      if ((await fs.stat(c)).isFile()) return c;
    } catch {}
  }
  return null;
}

// nginx-style SSI: <!--# include virtual="/_includes/x.html" -->
async function renderSSI(html, depth = 0) {
  const re = /<!--#\s*include\s+virtual="([^"]+)"\s*-->/g;
  const parts = [];
  let last = 0, m;
  while ((m = re.exec(html))) {
    parts.push(html.slice(last, m.index));
    const file = depth < 5 && (await resolveFile(m[1], { allowUnderscore: true }));
    parts.push(file ? await renderSSI(await fs.readFile(file, 'utf8'), depth + 1) : `<!-- missing include ${m[1]} -->`);
    last = re.lastIndex;
  }
  parts.push(html.slice(last));
  return parts.join('');
}

async function sendFile(res, file, status = 200) {
  const ext = path.extname(file);
  let body = await fs.readFile(file);
  if (ext === '.html') body = await renderSSI(body.toString('utf8'));
  res.writeHead(status, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const handler = routes[url.pathname];
    if (handler) return await handler(req, res, url);
    const ah = ahApi.hasCredentials() && url.pathname.match(AH_PATH);
    if (ah) return await ahRoute(req, res, ah);

    const file = await resolveFile(url.pathname === '/' ? '/index.html' : url.pathname);
    if (file) return await sendFile(res, file);
    await sendFile(res, path.join(ROOT, '404.html'), 404);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
});

server.listen(PORT, () => console.log(`Wiki running at http://localhost:${PORT}`));
