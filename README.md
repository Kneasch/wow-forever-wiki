# WoW Forever Wiki

Static HTML wiki served by nginx. Shared chrome (head, header, sidebar, footer) lives in
`site/_includes/` and is stitched into each page server-side with nginx SSI.

```
nginx/default.conf      nginx server block (SSI, clean /w/ URLs)
site/assets/wiki.css    the skin
site/_includes/         shared fragments (not directly reachable)
site/w/                 article pages, served at /w/<Page_name>
```

## Run

Local, no Docker (needs Node 18+, no npm install):

```bash
npm run dev     # or: node server.js   (PORT=3000 to change port)
```

`server.js` mirrors the nginx config (SSI includes, clean `/w/` URLs, hidden `_includes`)
and has a `routes` table for future backend endpoints like `/api/search`.

Docker/nginx still works for production-like runs: `docker compose up`.

## Build for static hosting

```bash
npm run build     # writes dist/: plain HTML with the shared includes inlined
npm run preview   # serves dist/ at http://localhost:4173 to check it
```

Upload `dist/` to any static host. No nginx or Node is needed at runtime. Pages are `dist/w/<Page>.html`, and the links use
`/w/<Page>`. Netlify, Cloudflare Pages and GitHub Pages serve those clean URLs and use `404.html` out of the box. On other
hosts, turn on clean URLs (e.g. Vercel `"cleanUrls": true`).

When the site is served from a subpath, set `BASE_PATH` (e.g. `BASE_PATH=/wow-forever-wiki npm run build`). The build then
prefixes every root-absolute `href`/`src` with it.

### GitHub Pages

`.github/workflows/pages.yml` builds and deploys on every push to `main`, or on demand from the Actions tab. It sets
`BASE_PATH` from the Pages config, so it works both at `<user>.github.io/wow-forever-wiki/` and on a custom domain. One-time
setup: Settings > Pages > Source: **GitHub Actions**. A private repo needs a paid GitHub plan for Pages.

Then open http://localhost:8080/w/Hammer_of_Divine_Might

## Drop rates

Rates are shown as a rounded `~1/N` rather than raw counts or percentages:
`N = round(kills / drops)`, so 66 drops in 205 kills is `~1/3`.

## Professions

Profession pages (the Professions hub, Mining, every mining node and every ore, stone, gem and bar) are generated from
`research/professions/` by `node scripts/gen-profession.js`. `scripts/fetch-professions.js` refreshes that data from Wowhead.
See [research/professions/README.md](research/professions/README.md) for the data, and
[docs/professions-plan.md](docs/professions-plan.md) for the plan to cover every profession.
