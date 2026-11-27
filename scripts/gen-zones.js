#!/usr/bin/env node
// Generate the Zones page: every WoW Forever map, grouped by continent, from research/maps/zones.json.
// Usage: node scripts/gen-zones.js     (writes site/w/Zones.html; set WIKI_OUT to write somewhere else)
// Maps and thumbnails come from scripts/fetch-maps.py. See research/maps/README.md.
const fs = require('fs');
const path = require('path');
const { MAPS } = require('./map');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.WIKI_OUT || path.join(ROOT, 'site', 'w');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const byName = (a, b) => a.name.localeCompare(b.name);
const zones = MAPS.zones.filter((z) => z.has_image);
const newTag = '<span class="new-tag">New in Forever</span>';

// One card per map: thumbnail linking to the full-size map, name, and what it is
const card = (z, note) => `        <li>
          <a href="${esc(z.image)}"><img src="${esc(z.thumb || z.image)}" alt="Map of ${esc(z.name)}" width="334" height="${Math.round(334 * z.height / z.width)}" loading="lazy" decoding="async"></a>
          <span class="map-gallery-name"><a href="${esc(z.image)}">${esc(z.name)}</a></span>${note || z.new_in_forever ? `\n          <span class="map-gallery-note">${[note, z.new_in_forever ? newTag : ''].filter(Boolean).join(' ')}</span>` : ''}
        </li>`;
const gallery = (list, note) => `    <ul class="map-gallery">
${list.sort(byName).map((z) => card(z, note?.(z))).join('\n')}
    </ul>`;

const continents = zones.filter((z) => z.kind === 'continent').sort(byName);
const of = (kind, parent) => zones.filter((z) => z.kind === kind && (parent === undefined || z.parent === parent));
// Zones whose parent is not a continent (Zephras Isle sits directly under Azeroth)
const elsewhere = zones.filter((z) => z.kind === 'zone' && !continents.some((c) => c.name === z.parent));

const sections = [
  ...continents.map((c) => [c.name.replace(/ /g, '_'), c.name, `    <p>${of('zone', c.name).length} zones. Cities and battlegrounds are listed further down.</p>\n${gallery(of('zone', c.name))}`]),
  ...(elsewhere.length ? [['Islands', 'Islands', `    <p>Zones that are not part of either continent's map.</p>\n${gallery(elsewhere)}`]] : []),
  ['Cities', 'Cities', gallery(of('city'), (z) => esc(z.parent || ''))],
  ['Battlegrounds', 'Battlegrounds', gallery(of('battleground'), (z) => esc(z.parent ? `Entrance: ${z.parent}` : ''))],
  ['Continents', 'Continents', gallery(continents)],
];
const counts = { zone: of('zone').length, city: of('city').length, battleground: of('battleground').length };
const fresh = zones.filter((z) => z.new_in_forever).sort(byName).map((z) => esc(z.name));

const body = `
    <p>World maps for every zone in WoW Forever: ${counts.zone} zones, ${counts.city} cities, ${counts.battleground} battlegrounds and ${continents.length} continents. Select a map to open it full size.</p>
    <p>${fresh.length} maps are new in Forever: ${fresh.slice(0, -1).join(', ')} and ${fresh[fresh.length - 1]}. The rest are the Classic zones, drawn from the Forever client, so they show any changes Forever has made.</p>

    <nav class="toc" aria-label="Contents">
      <h2>Contents</h2>
      <ol>
${sections.map(([id, label]) => `        <li><a href="#${esc(id)}">${esc(label)}</a></li>`).join('\n')}
      </ol>
    </nav>

${sections.map(([id, label, html]) => `    <h2 id="${esc(id)}">${esc(label)}</h2>\n${html}`).join('\n\n')}

    <h2 id="Sources">Sources</h2>
    <p>The maps are the WoW Forever game client's own world maps (build ${esc(MAPS.build)}), read from <a class="external" href="${esc(MAPS.source_url)}">wago.tools</a> and shown fully explored. Dungeons and raids have no world map in the client yet.</p>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<!--# include virtual="/_includes/head.html" -->
<title>Zones - WoW Forever Wiki</title>
</head>
<body>
<!--# include virtual="/_includes/header.html" -->
<!--# include virtual="/_includes/sidebar.html" -->
<div id="page">
  <nav class="tabs" aria-label="Page">
    <ul class="tabs-left">
      <li class="selected"><a href="/w/Zones">Guide</a></li>
      <li><a href="#">Discussion</a></li>
    </ul>
    <ul class="tabs-right">
      <li class="selected"><a href="/w/Zones">Read</a></li>
    </ul>
    <form class="search" role="search" action="#"><input type="search" name="q" placeholder="Search the wiki" aria-label="Search the wiki"></form>
  </nav>

  <main id="content">
    <h1 class="page-title">Zones</h1>
    <p class="byline">From the WoW Forever Wiki</p>
${body}
  </main>
<!--# include virtual="/_includes/footer.html" -->
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'Zones.html'), html);
console.log(`Wrote Zones (${zones.length} maps)`);
