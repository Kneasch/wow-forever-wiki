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

## Auction House prices

Every tradable item page (not Binds when picked up, not a quest item) has an **Auction House** row in the infobox and an
Auction House section. When the page loads, `site/assets/ah-price.js` fetches the price for the reader's chosen segment
and fills both in. The reader picks the segment with three menus, and the choice is remembered:

- **Region:** NA or EU
- **Ruleset:** Normal (PvE), PvP, RP or RP-PvP. WoW Forever runs one realm per ruleset per region.
- **Faction:** Alliance or Horde, which have separate auction houses. The neutral house is not counted.

For each segment the widget shows the lowest buyout and the median buyout per unit, the quantity listed and the number of
auctions. The median is weighted by quantity. Bid-only auctions are not counted.

The prices come from the Blizzard Game Data API through a Battle.net API client
(<https://develop.battle.net/access/clients>). They are served at `/data/ah/<region>-<ruleset>-<faction>.json`, for
example `/data/ah/eu-rppvp-horde.json`. There are two ways to provide them:

```bash
# Static hosting: snapshot every segment into site/data/ah/ (git-ignored), then build
BLIZZARD_CLIENT_ID=... BLIZZARD_CLIENT_SECRET=... npm run ah && npm run build

# Live: server.js builds the same JSON from the API on request and caches it per region for 30 minutes (AH_TTL_MIN)
BLIZZARD_CLIENT_ID=... BLIZZARD_CLIENT_SECRET=... npm start
```

`AH_NAMESPACE` sets the API namespace. The default is `dynamic-classic-{region}`, and `{region}` becomes `us` or
`eu`. Change it if Blizzard publishes a separate namespace for Forever. `AH_REGIONS=us` limits the fetch to one region.
Without price data the pages still load and say that prices are not available.
