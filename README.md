# WoW Forever Wiki

A static wiki generated from JSON research data with Vue. Every page is rendered to plain HTML at build time; readers get
only two small scripts: the theme toggle and search (`site/assets/search.js`). The generated pages are not committed: GitHub Actions builds them.

```
research/               the wiki's data: dungeon research, professions, zone maps (JSON)
src/data/               page sources: research JSON -> page models (plain data, no HTML)
src/pages/              Vue templates for whole pages (Doc.vue renders most of them)
src/components/         Vue components: infobox, tables, zone map, tooltip, ...
src/layout/             header, sidebar, footer and the article frame
src/lib/                helpers: slugs, the page model builders (doc.js), zone maps and pins (maps.js)
src/build/              render.js (Vue -> HTML), build.js (dist/), check.js, the .vue loader
site/assets/            static files copied as they are: CSS, theme script, icons, maps, pin sprite
scripts/                fetch-*: refresh research data and images from Wowhead and the game client
```

### How a page is made

1. A page source in `src/data/` (`dungeons.js`, `professions.js`, `zones.js`, `home.js`) reads the research JSON and returns
   a list of pages: `{ title, component, props }`. A page's title decides its URL, `/w/<slug of title>` (`src/lib/slug.js`).
2. Most pages use the JSON page model in `src/lib/doc.js`: an infobox, an intro and sections made of typed blocks
   (paragraph, list, table, map, tooltip, ...), with inline content as typed segments (text, wiki link, icon, ...).
   `src/pages/Doc.vue` renders any page described that way, so a page source never writes HTML.
3. `src/build/render.js` renders the component with Vue's server renderer and wraps it in the document `<head>`.
   Components are `.vue` files with a `<template>` and a plain `<script>` (`export default {}`, `require()` for imports);
   see `src/build/vue-loader.js`. Styles live in `site/assets/wiki.css`.

`collectPages()` stops with an error when two different titles would write the same file (also case-insensitively, as on
Windows and macOS). Within the dungeon pages, a later research file's page of the same title replaces an earlier one.

## Run

Local, no Docker (Node 22+):

```bash
npm ci
npm run dev     # http://localhost:8080 (PORT=3000 to change port)
```

The dev server renders each page when it is requested, straight from `research/` and `src/`, and restarts when either
changes, so there is no build step while editing. It has a `routes` table for backend endpoints; it serves `/search-index.json` from it, which the build writes as a file.

```bash
npm run check   # portable file names; every page renders, every /w/ link and /assets/ file resolves
```

## Build for static hosting

```bash
npm run build     # renders every page into dist/ (about 2,000 pages, a few seconds)
npm run preview   # serves dist/ at http://localhost:4173 to check it
docker compose up # or serve dist/ with nginx (nginx/default.conf) at http://localhost:8080
```

Upload `dist/` to any static host. No nginx or Node is needed at runtime. Pages are `dist/w/<Page>.html`, and the links use
`/w/<Page>`. Netlify, Cloudflare Pages and GitHub Pages serve those clean URLs and use `404.html` out of the box. On other
hosts, turn on clean URLs (e.g. Vercel `"cleanUrls": true`).

When the site is served from a subpath, set `BASE_PATH` (e.g. `BASE_PATH=/wow-forever-wiki npm run build`). The build then
prefixes every root-absolute `href`/`src` with it.

### GitHub Pages

`.github/workflows/pages.yml` renders the pages and deploys them on every push to `main`, or on demand from the Actions tab. It sets
`BASE_PATH` from the Pages config, so it works both at `<user>.github.io/wow-forever-wiki/` and on a custom domain. One-time
setup: Settings > Pages > Source: **GitHub Actions**. A private repo needs a paid GitHub plan for Pages.

## Drop rates

Rates are shown as `~1/N` with N to at most two decimal places, rather than raw counts or percentages:
`N = kills / drops`, so 66 drops in 205 kills is `~1/3.11`. Without counts, `N = 100 / drop %`, so 32.25% is `~1/3.1`.
`src/data/dungeons.js` works the rate out from the research's `kills`/`drops` or `drop_chance_pct` (see `rateOf`), and
hovering a counted rate shows the counts.

## Professions

Profession pages (the Professions hub, Mining, every mining node and every ore, stone, gem and bar) are generated from
`research/professions/` by `src/data/professions.js`. `scripts/fetch-professions.js` refreshes that data from Wowhead.
See [research/professions/README.md](research/professions/README.md) for the data, and
[docs/professions-plan.md](docs/professions-plan.md) for the plan to cover every profession.

## Classes

Class pages (the Classes hub and a page per class) are generated from `research/classes/` by `src/data/classes.js`. Each
class page lists every ability at the level it is first learned and marks the ones that come from talents.
`scripts/fetch-classes.js` refreshes the spell data from the Wowhead Forever tooltip API. All nine classes are done.
See [research/classes/README.md](research/classes/README.md).

## Zone maps

Node pages show spawn points as pins on the zone's map. The maps are the WoW Forever client's own world maps
(`site/assets/maps/<area id>.webp`), and `src/lib/maps.js` with `src/components/ZoneMap.vue` draws pins for each node type (mining, herbalism, fishing, skinning,
treasure). The Zones page lists every map, and each map has its own page (dungeons and gathering nodes in the zone), from
`src/data/zones.js`.
See [research/maps/README.md](research/maps/README.md).

## Quests

Quest pages (the Quests hub, a quest list per zone and a page per quest) are generated from `research/quests/` by
`src/data/quests.js`, laid out like the OSRS Wiki's quest pages. `scripts/fetch-quests.js` fetches a zone's quests from
Wowhead. Zones are being done region by region, starting with Desolace. See [research/quests/README.md](research/quests/README.md)
and [docs/quests-plan.md](docs/quests-plan.md).

## Search

The build writes `search-index.json`: every page's title, URL, kind (Quest, Item, Zone, ...) and, for quests, zone and
level (`searchIndex()` in `src/build/render.js`). `site/assets/search.js` searches it in the browser, so it works on any
static host: the search box suggests pages as you type and goes straight to an exact title on Enter, the `Search` page
(`/w/Search?q=...`) lists every match, and `/w/Search?random` is the sidebar's Random page. Search matches titles only.

## Read-only for now

The wiki has no accounts, editing or discussion yet. Every page shows a read-only notice (`src/components/SiteNotice.vue`),
the header has no Log in or Create account links, articles have no Discussion tab, and sidebar entries that need accounts
or are not written yet are greyed out (`src/layout/SiteSidebar.vue`). The `About the wiki` page (`src/data/special.js`)
explains it. Undo those to open the wiki for editing.
