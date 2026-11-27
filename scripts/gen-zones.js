#!/usr/bin/env node
// Generate the Zones page and one page per map (zone, city, battleground, continent) from research/maps/zones.json.
// Usage: node scripts/gen-zones.js     (writes site/w/Zones.html and site/w/<Zone>.html; set WIKI_OUT to write elsewhere)
// Maps and thumbnails come from scripts/fetch-maps.py. See research/maps/README.md.
//
// A zone page also lists, from research already in the repo:
//   - dungeons whose `zone` names it (research/*.json)
//   - gathering nodes whose Wowhead main zone it is (research/professions/*.json `nodes[]`), pinned on its map
const fs = require('fs');
const path = require('path');
const { MAPS, zoneMap, PIN_TYPES, zonePageTitle } = require('./map');
const { slug, slugRegistry } = require('./slug');

const ROOT = path.join(__dirname, '..');
const RESEARCH = path.join(ROOT, 'research');
const OUT = process.env.WIKI_OUT || path.join(ROOT, 'site', 'w');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (name) => '/w/' + encodeURI(slug(name));
const link = (name) => `<a href="${esc(href(name))}">${esc(name)}</a>`;
const byName = (a, b) => a.name.localeCompare(b.name);
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const unknown = '<span class="unknown">?</span>';
const newTag = '<span class="new-tag">New in Forever</span>';
const plural = (n, word, many = word + 's') => `${n} ${n === 1 ? word : many}`;

const zones = MAPS.zones.filter((z) => z.has_image);
const byUiMap = new Map(zones.map((z) => [z.ui_map_id, z]));
const parentOf = (z) => byUiMap.get(z.parent_ui_map_id) || null;
const continentOf = (z) => { for (let p = parentOf(z); p; p = parentOf(p)) if (p.kind === 'continent') return p; return null; };
const continents = zones.filter((z) => z.kind === 'continent').sort(byName);
const of = (kind, parent) => zones.filter((z) => z.kind === kind && (parent === undefined || z.parent === parent));
// Zones whose parent is not a continent (Zephras Isle sits directly under Azeroth)
const elsewhere = zones.filter((z) => z.kind === 'zone' && !continents.some((c) => c.name === z.parent));

// ---------- Research that mentions zones ----------
// Dungeons: `zone` is free text ("Orgrimmar (Durotar)", "Ironforge / Dun Morogh"), so every map name it contains counts.
// Blackrock Mountain is not a map of its own: it sits on the border of these two zones.
const ZONE_ALIASES = { 'Blackrock Mountain': ['Searing Gorge', 'Burning Steppes'] };
const dungeons = fs.readdirSync(RESEARCH).filter((f) => f.endsWith('.json') && f !== 'icons.json')
  .map((f) => JSON.parse(fs.readFileSync(path.join(RESEARCH, f), 'utf8')))
  .map((d) => {
    const names = new Set(zones.filter((z) => z.kind !== 'continent' && d.zone?.includes(z.name)).map((z) => z.name));
    for (const [alias, real] of Object.entries(ZONE_ALIASES)) if (d.zone?.includes(alias)) real.forEach((n) => names.add(n));
    return { name: d.dungeon, levels: d.level_range, new_in_forever: d.new_in_forever, order: d.order, zones: names };
  });
const dungeonsIn = (z) => dungeons.filter((d) => d.zones.has(z.name)).sort((a, b) => a.order - b.order);

// Gathering nodes, from every profession research file that has nodes[]. The pin type follows the profession.
const profIndex = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'professions', 'index.json'), 'utf8'));
const profs = profIndex.groups.flatMap((g) => g.professions).filter((p) => p.file && fs.existsSync(path.join(RESEARCH, 'professions', p.file)))
  .map((p) => JSON.parse(fs.readFileSync(path.join(RESEARCH, 'professions', p.file), 'utf8')));
const nodesIn = (z) => profs.flatMap((p) => {
  const type = PIN_TYPES[p.profession.toLowerCase()] ? p.profession.toLowerCase() : 'other';
  const groups = new Map();
  for (const o of p.nodes.filter((n) => n.zone_id === z.area_id)) {
    if (!groups.has(o.name)) groups.set(o.name, { name: o.name, profession: p.profession, type, req: o.required_skill, coords: [] });
    groups.get(o.name).coords.push(...(o.coords || []));
  }
  return [...groups.values()];
}).sort((a, b) => (a.req ?? 0) - (b.req ?? 0) || a.name.localeCompare(b.name));

// ---------- Shared bits ----------
const KIND = { zone: 'zone', city: 'capital city', battleground: 'battleground', continent: 'continent' };
const thumbH = (z) => Math.round(334 * z.height / z.width);
const card = (z, note) => `        <li>
          <a href="${esc(href(zonePageTitle(z)))}"><img src="${esc(z.thumb || z.image)}" alt="Map of ${esc(z.name)}" width="334" height="${thumbH(z)}" loading="lazy" decoding="async"></a>
          <span class="map-gallery-name">${link(zonePageTitle(z))}</span>${note || z.new_in_forever ? `\n          <span class="map-gallery-note">${[note, z.new_in_forever ? newTag : ''].filter(Boolean).join(' ')}</span>` : ''}
        </li>`;
const gallery = (xs, note) => `    <ul class="map-gallery">
${[...xs].sort(byName).map((z) => card(z, note?.(z))).join('\n')}
    </ul>`;
const where = (z) => esc(parentOf(z)?.name || '');
const toc = (sections) => (sections.length < 2 ? '' : `    <nav class="toc" aria-label="Contents">
      <h2>Contents</h2>
      <ol>
${sections.map(([id, label]) => `        <li><a href="#${esc(id)}">${esc(label)}</a></li>`).join('\n')}
      </ol>
    </nav>\n`);
const sectionsHtml = (sections) => sections.map(([id, label, html]) => `    <h2 id="${esc(id)}">${esc(label)}</h2>\n${html}`).join('\n\n');
const table = (head, rows) => `    <div class="table-scroll">
      <table class="wikitable">
        <thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>
${rows.map((r) => `          <tr>${r.join('')}</tr>`).join('\n')}
        </tbody>
      </table>
    </div>`;
const td = (html, cls) => `<td${cls ? ` class="${cls}"` : ''}>${html}</td>`;
const sourceNote = `<p>The maps are the WoW Forever game client's own world maps (build ${esc(MAPS.build)}), read from <a class="external" href="${esc(MAPS.source_url)}">wago.tools</a> and shown fully explored.</p>`;

function page(title, tabLabel, body) {
  const self = href(title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<!--# include virtual="/_includes/head.html" -->
<title>${esc(title)} - WoW Forever Wiki</title>
</head>
<body>
<!--# include virtual="/_includes/header.html" -->
<!--# include virtual="/_includes/sidebar.html" -->
<div id="page">
  <nav class="tabs" aria-label="Page">
    <ul class="tabs-left">
      <li class="selected"><a href="${esc(self)}">${tabLabel}</a></li>
      <li><a href="#">Discussion</a></li>
    </ul>
    <ul class="tabs-right">
      <li class="selected"><a href="${esc(self)}">Read</a></li>
    </ul>
    <form class="search" role="search" action="#"><input type="search" name="q" placeholder="Search the wiki" aria-label="Search the wiki"></form>
  </nav>

  <main id="content">
    <h1 class="page-title">${esc(title)}</h1>
    <p class="byline">From the WoW Forever Wiki</p>
${body}
  </main>
<!--# include virtual="/_includes/footer.html" -->
</div>
</body>
</html>
`;
}

// ---------- One page per map ----------
function zonePage(z) {
  const parent = parentOf(z), continent = continentOf(z);
  const intro = {
    continent: `<b>${esc(z.name)}</b> is a continent. It has ${plural(of('zone', z.name).length, 'zone')} and ${plural(of('city').filter((c) => continentOf(c) === z).length, 'capital city', 'capital cities')}.`,
    zone: `<b>${esc(z.name)}</b> is a zone ${continent ? `in ${link(zonePageTitle(continent))}` : 'that is not part of either continent'}.`,
    city: `<b>${esc(z.name)}</b> is a capital city${continent ? ` in ${link(zonePageTitle(continent))}` : ''}.`,
    battleground: `<b>${esc(z.name)}</b> is a battleground. On the world map it sits under ${parent ? link(zonePageTitle(parent)) : unknown}.`,
  }[z.kind];
  const sections = [['Map', 'Map', zoneMap({ zone: z, caption: `The ${esc(KIND[z.kind])} map, fully explored.` })]];

  if (z.kind === 'continent') {
    sections.push(['Zones', 'Zones', gallery(of('zone', z.name))]);
    const cities = of('city').filter((c) => continentOf(c) === z);
    if (cities.length) sections.push(['Cities', 'Cities', gallery(cities)]);
  }

  const dgs = dungeonsIn(z);
  if (dgs.length) {
    sections.push(['Dungeons', 'Dungeons', table(['Dungeon', 'Levels', 'New in Forever'],
      dgs.map((d) => [td(link(d.name)), td(d.levels ? esc(d.levels) : unknown, 'num'), td(d.new_in_forever ? 'Yes' : '')]))]);
  }

  const nodes = nodesIn(z);
  if (nodes.length) {
    const pins = nodes.flatMap((n) => n.coords.map(([x, y]) => ({ x, y, type: n.type, label: n.name, href: href(n.name) })));
    sections.push(['Gathering', 'Gathering', `    <p>Gathering nodes whose main zone is ${esc(z.name)}. Wowhead's tooltip data gives each node only the zone where it spawns most, so nodes that spawn here less often are not listed yet. Select a point on the map to open its node.</p>
${table(['Node', 'Profession', 'Requires', 'Spawn points'], nodes.map((n) => [td(link(n.name)), td(link(n.profession)), td(n.req ?? unknown, 'num'), td(n.coords.length, 'num')]))}
${zoneMap({ zone: z, pins, caption: `${plural(pins.length, 'spawn point')} of ${plural(nodes.length, 'node')}.` })}`]);
  }

  sections.push(['Sources', 'Sources', `    ${sourceNote}`]);

  const body = `
    <table class="infobox">
      <tr><th colspan="2" class="infobox-header">${esc(z.name)}</th></tr>
      <tr><th>Type</th><td>${cap(KIND[z.kind])}</td></tr>
      ${z.kind === 'continent' ? '' : `<tr><th>Continent</th><td>${continent ? link(zonePageTitle(continent)) : '&ndash;'}</td></tr>`}
      ${z.kind === 'battleground' && parent ? `<tr><th>Parent map</th><td>${link(zonePageTitle(parent))}</td></tr>` : ''}
      <tr><th>New in Forever</th><td>${z.new_in_forever ? 'Yes' : 'No'}</td></tr>
      <tr><th colspan="2" class="infobox-subheader">Database</th></tr>
      ${z.area_id != null ? `<tr><th>Area ID</th><td>${z.area_id}</td></tr>` : ''}
      <tr><th>UiMap ID</th><td>${z.ui_map_id}</td></tr>
    </table>

    <p>${intro}${z.new_in_forever ? ' It is new in WoW Forever.' : ''}</p>

${toc(sections)}
${sectionsHtml(sections)}`.replace(/\n\s*\n(\s*<tr>)/g, '\n$1');
  return page(zonePageTitle(z), cap(z.kind), body);
}

// ---------- Zones list ----------
function zonesPage() {
  const sections = [
    ...continents.map((c) => [c.name.replace(/ /g, '_'), c.name, `    <p>${of('zone', c.name).length} zones. Cities and battlegrounds are listed further down.</p>\n${gallery(of('zone', c.name))}`]),
    ...(elsewhere.length ? [['Islands', 'Islands', `    <p>Zones that are not part of either continent's map.</p>\n${gallery(elsewhere)}`]] : []),
    ['Cities', 'Cities', gallery(of('city'), (z) => esc(continentOf(z)?.name || ''))],
    ['Battlegrounds', 'Battlegrounds', gallery(of('battleground'), where)],
    ['Continents', 'Continents', gallery(continents)],
  ];
  const fresh = zones.filter((z) => z.new_in_forever).sort(byName).map((z) => link(zonePageTitle(z)));
  const body = `
    <p>World maps for every zone in WoW Forever: ${of('zone').length} zones, ${of('city').length} cities, ${of('battleground').length} battlegrounds and ${continents.length} continents. Select a map to open its page.</p>
    <p>${fresh.length ? `${fresh.length === 1 ? 'One map is' : `${fresh.length} maps are`} new in Forever: ${list(fresh)}. The rest are` : 'All of them are'} the Classic zones, drawn from the Forever client, so they show any changes Forever has made.</p>

${toc(sections)}
${sectionsHtml(sections)}

    <h2 id="Sources">Sources</h2>
    ${sourceNote.replace('</p>', ' Dungeons and raids have no world map in the client yet.</p>')}`;
  return page('Zones', 'Guide', body);
}

const fileFor = slugRegistry(); // throws if two titles would share a file
const written = [];
const write = (title, html) => { fs.writeFileSync(path.join(OUT, fileFor(title) + '.html'), html); written.push(title); };
write('Zones', zonesPage());
zones.forEach((z) => write(zonePageTitle(z), zonePage(z)));
console.log(`Wrote ${written.length} pages (Zones and ${zones.length} maps)`);
