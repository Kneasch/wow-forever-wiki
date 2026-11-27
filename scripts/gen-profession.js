#!/usr/bin/env node
// Generate profession pages from research/professions/*.json.
// Usage: node scripts/gen-profession.js            (hub + every profession with a research file)
//        node scripts/gen-profession.js research/professions/mining.json
// Writes site/w/<Page_name>.html (overwrites). Set WIKI_OUT to write somewhere else.
//
// Pages:
//   Professions           hub listing every profession (research/professions/index.json)
//   <Profession>          e.g. Mining: training, nodes, smelting/recipes, materials, camp, Forever changes
//   <Node>                e.g. Copper Vein: required skill, skill-up colours, zones, spawn map, contents
//   <Material>            e.g. Copper Ore: item infobox, where it is gathered, what makes it, what uses it
// Research data comes from scripts/fetch-professions.js (Wowhead Forever tooltip API) plus hand-written fields.
const fs = require('fs');
const path = require('path');
const { slug, slugRegistry } = require('./slug');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'research', 'professions');
const OUT = process.env.WIKI_OUT || path.join(ROOT, 'site', 'w');
const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : index.groups.flatMap((g) => g.professions).filter((p) => p.file).map((p) => path.join(DIR, p.file));
const profs = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));

// Every profession with a research file gets pages, so the hub links to all of them (not just the ones
// generated this run) and pages never link to a profession page that does not exist.
const withPages = new Set(index.groups.flatMap((g) => g.professions).filter((p) => p.file && fs.existsSync(path.join(DIR, p.file))).map((p) => p.name));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (name) => '/w/' + encodeURI(slug(name));
const link = (name, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${esc(href(name))}">${esc(name)}</a>`;
const unknown = '<span class="unknown">?</span>';
const val = (v) => (v === null || v === undefined || v === '' ? unknown : esc(v));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const article = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const newTag = (x) => (x?.new_in_forever ? '<span class="new-tag">New in Forever</span>' : '') + (x?.scarce ? '<span class="new-tag">Scarce</span>' : '');
const wowhead = (type, id) => `https://www.wowhead.com/forever/${type}=${id}`;
const iconImg = (icon, alt = '') => (icon && fs.existsSync(path.join(ROOT, 'site', 'assets', 'icons', icon + '.jpg'))
  ? `<img class="mini-icon" src="/assets/icons/${esc(icon)}.jpg" alt="${esc(alt)}" width="18" height="18">` : '');

function page({ title, tabLabel, body }) {
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

const toc = (entries) => `    <nav class="toc" aria-label="Contents">
      <h2>Contents</h2>
      <ol>
${entries.map(([id, label]) => `        <li><a href="#${esc(id)}">${esc(label)}</a></li>`).join('\n')}
      </ol>
    </nav>`;
const table = (head, rows, cls = 'wikitable') => `    <div class="table-scroll">
      <table class="${cls}">
        <thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>
${rows.map((r) => `          <tr>${r.join('')}</tr>`).join('\n')}
        </tbody>
      </table>
    </div>`;
const td = (html, cls) => `<td${cls ? ` class="${cls}"` : ''}>${html}</td>`;
const ul = (items) => `    <ul>\n${items.map((i) => `      <li>${i}</li>`).join('\n')}\n    </ul>`;
const sourcesList = (srcs) => ul(srcs.map((s) => `<a class="external" href="${esc(s.url)}">${esc(s.name)}</a>${s.used_for ? ` &ndash; ${esc(s.used_for)}` : ''}`));

// Classic skill-up rule (see skill_up_rule in the research file): orange to +24, yellow to +49, green to +99, then grey.
const skillColours = (req) => {
  const r = Math.max(req, 1);
  return [['orange', r, req + 24], ['yellow', req + 25, req + 49], ['green', req + 50, req + 99], ['grey', req + 100, null]];
};
const skillRange = (req) => (req == null ? unknown : `<span class="skill-range">${skillColours(req)
  .map(([c, a, b]) => `<span class="sk-${c}" title="${cap(c)}">${a}${b ? '&ndash;' + b : '+'}</span>`).join('')}</span>`);
const skillKey = `    <ul class="rarity-key" aria-label="Skill-up colour key">
      <li><span class="swatch sk-orange"></span>Orange: always gives a skill point</li>
      <li><span class="swatch sk-yellow"></span>Yellow: usually does</li>
      <li><span class="swatch sk-green"></span>Green: sometimes does</li>
      <li><span class="swatch sk-grey"></span>Grey: never does</li>
    </ul>`;

// Spawn points as dots on a plain 0-100 grid (the map image is not included). Game maps are 3:2.
function spawnMap(coords, zone) {
  if (!coords?.length) return '';
  const grid = [10, 20, 30, 40, 50, 60, 70, 80, 90]
    .map((g) => `<line class="grid" x1="${g * 1.5}" y1="0" x2="${g * 1.5}" y2="100"/><line class="grid" x1="0" y1="${g}" x2="150" y2="${g}"/>`).join('');
  const dots = coords.map(([x, y]) => `<circle class="dot" cx="${+(x * 1.5).toFixed(2)}" cy="${y}" r="0.9"/>`).join('');
  return `    <svg class="spawn-map" viewBox="0 0 150 100" role="img" aria-label="${esc(`${coords.length} spawn points in ${zone || 'an unknown zone'}`)}">${grid}${dots}</svg>
    <p class="spawn-map-caption">${plural(coords.length, 'spawn point')} in ${zone ? esc(zone) : unknown}, plotted on the zone's map coordinates (0&ndash;100). Gridlines are every 10.</p>`;
}

// ---------- Per profession ----------
function build(p, write) {
  const P = p.profession;
  const mat = new Map(p.materials.map((m) => [m.item_id, m]));
  const matName = (id) => mat.get(id)?.name;
  const matLink = (id, name) => {
    const m = mat.get(id);
    return m ? `${iconImg(m.icon)}${link(m.name, 'q-' + (m.quality || 'common'))}` : esc(name ?? `item ${id}`);
  };
  const counted = (r) => `${matLink(r.item_id, r.name)}${r.count > 1 ? ` &times;${r.count}` : ''}`;

  // Group node objects by name: "Copper Vein" is several objects in different zones
  const nodeGroups = new Map();
  for (const n of p.nodes) {
    if (!nodeGroups.has(n.name)) nodeGroups.set(n.name, []);
    nodeGroups.get(n.name).push(n);
  }
  const groups = [...nodeGroups.entries()].map(([name, objs]) => ({
    name,
    objs: objs.sort((a, b) => (b.spawn_count || 0) - (a.spawn_count || 0)),
    req: objs[0].required_skill,
    contains: [...new Set(objs.flatMap((o) => o.contains))],
    variant: objs[0].variant,
    new_in_forever: objs.some((o) => o.new_in_forever),
  })).sort((a, b) => a.req - b.req || a.name.localeCompare(b.name));
  // "Zephras Isle (339), The Barrens (59)": objects that share a zone are added together, most spawns first
  const zonesOf = (g) => {
    const z = new Map();
    for (const o of g.objs.filter((x) => x.zone)) z.set(o.zone, (z.get(o.zone) || 0) + (o.spawn_count || 0));
    return [...z].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${esc(name)}${n ? ` (${n})` : ''}`);
  };
  const contentsOf = (ids) => (ids.length ? ids.map((id) => matLink(id)).join(', ') : unknown);

  // ----- Node pages -----
  for (const g of groups) {
    const zones = zonesOf(g);
    const intro = `<b>${esc(g.name)}</b> is ${g.variant === 'ooze' ? 'an ooze-covered' : 'a'} ${esc(P.toLowerCase())} node that needs ${link(P)} ${g.req ?? unknown}.${g.new_in_forever ? ' It is new in WoW Forever.' : ''} ${g.contains.length ? `Mining it gives ${list(g.contains.map((id) => matLink(id)))}.` : 'What it contains is not known yet.'}`;
    const locRows = g.objs.map((o) => [td(val(o.zone)), td(val(o.zone_level), 'num'), td(val(o.spawn_count), 'num'), td(`<a class="external" href="${esc(wowhead('object', o.object_id))}">${o.object_id}</a>`, 'num')]);
    const maps = g.objs.filter((o) => o.coords?.length).map((o) => `    <h3>${val(o.zone)} (object ${o.object_id})</h3>\n${spawnMap(o.coords, o.zone)}`).join('\n');
    const body = `
    <table class="infobox">
      <tr><th colspan="2" class="infobox-header">${esc(g.name)}</th></tr>
      <tr><th>Type</th><td>${link(P)} node</td></tr>
      <tr><th>Requires</th><td>${link(P)} (${val(g.req)})</td></tr>
      <tr><th>Contains</th><td>${contentsOf(g.contains)}</td></tr>
      <tr><th>New in Forever</th><td>${g.new_in_forever ? 'Yes' : 'No'}</td></tr>
      <tr><th colspan="2" class="infobox-subheader">Database</th></tr>
      <tr><th>Object ID${g.objs.length > 1 ? 's' : ''}</th><td>${g.objs.map((o) => o.object_id).join(', ')}</td></tr>
    </table>

    <p>${intro}</p>

${toc([['Skill', 'Skill'], ['Locations', 'Locations'], ['Contents', 'Contents']])}

    <h2 id="Skill">Skill</h2>
    <p>${skillRange(g.req)}</p>
${skillKey}
    <p>${esc(p.skill_up_rule)}</p>

    <h2 id="Locations">Locations</h2>
    <p>Each object ID is a separate spawn set. Wowhead's tooltip data lists only the zone where each one spawns most, so ${esc(g.name)} may also appear in zones not listed here.</p>
${table(['Zone', 'Zone level', 'Spawn points', 'Object ID'], locRows)}
${maps}

    <h2 id="Contents">Contents</h2>
    ${g.contains.length ? `<p>${esc(p.nodes_contents_basis)}</p>\n${ul(g.contains.map((id) => matLink(id)))}` : '<p>What this node contains is not known yet.</p>'}`;
    write(g.name, page({ title: g.name, tabLabel: 'Object', body }));
  }

  // ----- Material pages -----
  const madeBy = (id) => p.recipes.filter((r) => r.creates?.item_id === id);
  const usedBy = (id) => p.recipes.filter((r) => r.reagents?.some((x) => x.item_id === id));
  const plannedMadeBy = (id) => (p.recipes_unresearched || []).filter((r) => r.creates_item_id === id);
  const plannedUsedBy = (id) => (p.recipes_unresearched || []).filter((r) => r.reagent_item_ids?.includes(id));
  const campUses = (id) => p.camp.filter((c) => c.build_reagents?.some((x) => x.item_id === id));
  const recipeRow = (r) => [td(`${iconImg(mat.get(r.creates?.item_id)?.icon)}${esc(r.name)}`), td(val(r.required_skill), 'num'), td(r.reagents.map(counted).join(', ')), td(r.creates ? counted(r.creates) : unknown)];
  const RECIPE_HEAD = ['Recipe', 'Skill', 'Reagents', 'Creates'];
  const KIND_WORD = { ore: 'ore', stone: 'stone', gem: 'gem', bar: 'metal bar', tool: 'tool' };

  for (const m of p.materials) {
    const nodes = groups.filter((g) => g.contains.includes(m.item_id));
    const made = madeBy(m.item_id), used = usedBy(m.item_id), camp = campUses(m.item_id);
    const plannedMade = plannedMadeBy(m.item_id), plannedUsed = plannedUsedBy(m.item_id);
    const q = m.quality || 'common';
    const how = nodes.length ? `It is gathered with ${link(P)} from ${list(nodes.map((g) => link(g.name)))}.`
      : made.length ? `It is made with ${link(P)} by ${list(made.map((r) => esc(r.name)))}.`
        : plannedMade.length ? `It is made with ${link(P)} by ${list(plannedMade.map((r) => esc(r.name)))}.`
          : m.kind === 'tool' ? `It is needed to use ${link(P)}.` : '';
    const sections = [];
    if (nodes.length) {
      sections.push(['Gathered_from', 'Gathered from', `    <p>${esc(p.nodes_contents_basis)}</p>
${table(['Node', 'Requires', 'Main zones (spawn points)'], nodes.map((g) => [td(link(g.name)), td(val(g.req), 'num'), td(zonesOf(g).join(', ') || unknown)]))}`]);
    }
    if (made.length || plannedMade.length) {
      sections.push(['Created_by', 'Created by', [
        made.length ? table(RECIPE_HEAD, made.map(recipeRow)) : '',
        plannedMade.length ? `    <p>New in Forever, not yet confirmed on Wowhead:</p>\n${ul(plannedMade.map((r) => `<b>${esc(r.name)}</b> (${link(P)} ${r.required_skill}): ${esc(r.note)}`))}` : '',
      ].filter(Boolean).join('\n')]);
    }
    if (m.dropped_by && ['ore', 'stone', 'gem'].includes(m.kind)) {
      sections.push(['Drops', 'Dropped by', `    <p>Wowhead also lists it as dropped by ${esc(m.dropped_by.npc)}${m.dropped_by.drop_chance_pct != null ? ` (${m.dropped_by.drop_chance_pct}%)` : ''}.</p>`]);
    }
    if (used.length || plannedUsed.length || camp.length) {
      sections.push(['Used_for', `Used in ${P}`, [
        used.length ? table(RECIPE_HEAD, used.map(recipeRow)) : '',
        plannedUsed.length ? ul(plannedUsed.map((r) => `<b>${esc(r.name)}</b> (${link(P)} ${r.required_skill}, not yet confirmed): ${esc(r.note)}`)) : '',
        camp.length ? `    <p>Camp features built with it:</p>\n${ul(camp.map((c) => `${link(P)} camp: <b>${esc(c.name)}</b> needs ${c.build_reagents.map(counted).join(', ')}`))}` : '',
      ].filter(Boolean).join('\n')]);
    }
    const body = `
    <table class="infobox">
      <tr><th colspan="2" class="infobox-header">${esc(m.name)}</th></tr>
      <tr>
        <td colspan="2" class="infobox-image">
          <span class="item-icon${q === 'poor' || q === 'common' ? '' : ' q-border-' + q}" role="img" aria-label="${esc(m.name)} icon">
            ${m.icon ? `<img src="/assets/icons/${esc(m.icon)}.jpg" alt="" width="56" height="56">` : ''}
          </span>
        </td>
      </tr>
      <tr><th>Quality</th><td>${m.quality ? `<span class="q-${q}">${cap(q)}</span>` : unknown}</td></tr>
      <tr><th>Type</th><td>${cap(KIND_WORD[m.kind] || m.kind)}</td></tr>
      <tr><th>Item level</th><td>${val(m.item_level)}</td></tr>
      <tr><th>Max stack</th><td>${val(m.max_stack)}</td></tr>
      <tr><th>Sell price</th><td>${val(m.sell_price)}</td></tr>
      <tr><th>Profession</th><td>${link(P)}</td></tr>
      <tr><th colspan="2" class="infobox-subheader">Database</th></tr>
      <tr><th>Item ID</th><td>${m.item_id}</td></tr>
      <tr><th>Source</th><td><a class="external" href="${esc(wowhead('item', m.item_id))}">Wowhead</a></td></tr>
    </table>

    <p><b>${esc(m.name)}</b> is ${article(m.quality || 'a')} ${m.quality ? `<span class="q-${q}">${esc(q)}</span> ` : ''}${KIND_WORD[m.kind] || m.kind}${m.kind === 'tool' ? '' : ' used as a crafting reagent'}.${newTag(m) ? ' It is new in WoW Forever.' : ''} ${how}${m.note ? ' ' + esc(m.note) : ''}</p>
${sections.length > 1 ? '\n' + toc(sections.map(([id, label]) => [id, label])) + '\n' : ''}
${sections.map(([id, label, html]) => `    <h2 id="${id}">${esc(label)}</h2>\n${html}`).join('\n\n')}`;
    write(m.name, page({ title: m.name, tabLabel: 'Item', body }));
  }

  // ----- Profession page -----
  const ranks = p.ranks.map((r, i) => [td(`<b>${esc(r.rank)}</b>`), td(`1&ndash;${r.max_skill}`, 'num'), td(i === 0 ? 'None' : `${P} ${val(r.requires_skill)}, level ${val(r.requires_level)}`), td(`<a class="external" href="${esc(wowhead('spell', r.spell_id))}">${r.spell_id}</a>`, 'num')]);
  const nodeRows = groups.map((g) => [td(`${link(g.name)}${newTag(g)}`), td(val(g.req), 'num'), td(skillRange(g.req)), td(contentsOf(g.contains)), td(zonesOf(g).join(', ') || unknown)]);
  const byKind = (k) => p.materials.filter((m) => m.kind === k);
  const matRows = (k) => byKind(k).map((m) => [td(`${iconImg(m.icon)}${link(m.name, 'q-' + (m.quality || 'common'))}${newTag(m)}`), td(val(m.item_level), 'num'), td(val(m.sell_price)), td(groups.filter((g) => g.contains.includes(m.item_id)).map((g) => link(g.name)).join(', ') || [...madeBy(m.item_id), ...plannedMadeBy(m.item_id)].map((r) => esc(r.name)).join(', ') || '&ndash;')]);
  const MAT_HEAD = ['Item', 'Item level', 'Sells for', 'Source'];
  const camp = p.camp.map((c) => [td(`<b>${esc(c.name)}</b>`), td(val(c.required_skill), 'num'), td(esc(c.effect_note || c.effect || '') || unknown), td(c.build_reagents?.length ? c.build_reagents.map(counted).join(', ') : '&ndash;'), td(c.kind === 'blueprint' ? `${esc(c.blueprint)}: dropped by ${c.blueprint_source ? `${esc(c.blueprint_source.npc)}${c.blueprint_source.drop_chance_pct != null ? ` (${c.blueprint_source.drop_chance_pct}%)` : ''}` : unknown}` : 'Learned with the profession')]);
  const planned = (p.recipes_unresearched || []).map((r) => `<b>${esc(r.name)}</b> (${P} ${r.required_skill}): ${esc(r.note)}`);
  const sections = [
    ['Training', 'Training', `    <p>${P} is learned from a ${P.toLowerCase()} trainer in rank order. Each rank raises the maximum skill by 75.</p>
${table(['Rank', 'Skill', 'Requires', 'Spell'], ranks)}
    <p>Maximum skill comes from the Forever spell tooltips. The skill and level needed to train each rank are the Classic values and have not been confirmed for Forever.</p>
${ul([...p.tools.map((t) => `${matLink(t.item_id, t.name)}: ${esc(t.note)}`), ...p.abilities.map((a) => `<b>${esc(a.name)}</b> (<a class="external" href="${esc(wowhead('spell', a.spell_id))}">spell ${a.spell_id}</a>): ${esc(a.note)}`)])}`],
    ['Nodes', 'Mining nodes', `    <p>Nodes are listed by required skill. The colours show which skill levels a node still gives skill points at. Zones are the ones where each node spawns most (spawn points in brackets). ${esc(p.nodes_contents_basis)}</p>
${table(['Node', 'Requires', 'Skill-up', 'Contains', 'Main zones'], nodeRows)}
${skillKey}`],
    ['Smelting', 'Smelting', `    <p>Smelting needs a forge unless noted. Skill levels are the Classic values; reagents and results are from the Forever tooltips.</p>
${table(RECIPE_HEAD, p.recipes.map(recipeRow))}
${planned.length ? `    <p>New in Forever, from fan guides and not yet confirmed on Wowhead:</p>\n${ul(planned)}` : ''}`],
    ['Materials', 'Materials', ['ore', 'stone', 'gem', 'bar'].filter((k) => byKind(k).length).map((k) => `    <h3 id="${cap(k)}s">${cap(KIND_WORD[k])}s</h3>\n${table(MAT_HEAD, matRows(k))}`).join('\n') +
      '\n    <p>Gems come from mining nodes as a bonus. Which nodes drop which gems has not been researched yet.</p>'],
    ['Camp', 'Camp features', `    <p>WoW Forever lets players build a campsite. Each profession has camp features that need a Campfire nearby, and all of them share a 1 hour cooldown.</p>
${table(['Feature', 'Requires', 'Effect', 'Build cost', 'How to learn'], camp)}`],
    ['Other_items', 'Other items', ul(p.other_items.map((o) => `<a class="external" href="${esc(wowhead('item', o.item_id))}">${esc(o.name)}</a>: ${esc(o.note)}`))],
    ['Research_notes', 'Research notes', `    <p>Where sources disagree:</p>\n${ul(p.conflicts.map(esc))}\n    <p>Not researched yet:</p>\n${ul(p.gaps.map(esc))}`],
    ['Sources', 'Sources', sourcesList(p.sources)],
  ];
  const idx = index.groups.flatMap((g) => g.professions.map((x) => ({ ...x, kind: g.kind }))).find((x) => x.name === P) || {};
  const body = `
    <table class="infobox">
      <tr><th colspan="2" class="infobox-header">${esc(P)}</th></tr>
      <tr>
        <td colspan="2" class="infobox-image">
          <span class="item-icon" role="img" aria-label="${esc(P)} icon">
            ${iconImg(p.icon) ? `<img src="/assets/icons/${esc(p.icon)}.jpg" alt="" width="56" height="56">` : ''}
          </span>
        </td>
      </tr>
      <tr><th>Type</th><td>${cap(p.kind)} profession</td></tr>
      <tr><th>Maximum skill</th><td>${p.ranks[p.ranks.length - 1].max_skill}</td></tr>
      <tr><th>Tool</th><td>${p.tools.map((t) => matLink(t.item_id, t.name)).join(', ') || '&ndash;'}</td></tr>
      <tr><th>Used by</th><td>${(idx.feeds || []).map((f) => (withPages.has(f) ? link(f) : esc(f))).join(', ') || '&ndash;'}</td></tr>
      <tr><th>Nodes</th><td>${groups.length}</td></tr>
    </table>

    <p><b>${esc(P)}</b> is a ${esc(p.kind)} <a href="${esc(href('Professions'))}">profession</a> in WoW Forever. ${esc(p.summary)}</p>

${toc(sections.map(([id, label]) => [id, label]))}

${sections.map(([id, label, html]) => `    <h2 id="${id}">${esc(label)}</h2>\n${html}`).join('\n\n')}`;
  write(P, page({ title: P, tabLabel: 'Profession', body }));
}

// ---------- Hub ----------
function hub() {
  const icon = (name) => (fs.existsSync(path.join(ROOT, 'site', 'assets', 'icons', name + '.jpg')) ? iconImg(name) : '');
  const body = `
    <p><b>Professions</b> are trade skills. Each character can learn two primary professions, which are the gathering and production professions, and all three secondary professions. Professions are levelled from 1 to 300 in four ranks: Apprentice, Journeyman, Expert and Artisan.</p>
    <p>WoW Forever adds camp features to every profession. These are placeable objects such as a Rock Garden or a Greenhouse, learned from blueprints that drop in the world and in dungeons. It also adds new materials, such as Heavy Thorium Ore, and new top-level recipes.</p>

${toc(index.groups.map((g) => [cap(g.kind), g.title]))}

${index.groups.map((g) => `    <h2 id="${cap(g.kind)}">${esc(g.title)}</h2>
    <p>${esc(g.blurb)}</p>
${table(['Profession', 'Summary', 'Supplies', 'Camp features (skill)'], g.professions.map((x) => [
    td(`${icon(x.icon)}${withPages.has(x.name) ? link(x.name) : `${esc(x.name)} <span class="unknown">(page not written yet)</span>`}`),
    td(esc(x.summary)),
    td(x.feeds.map((f) => (withPages.has(f) ? link(f) : esc(f))).join(', ') || '&ndash;'),
    td(esc(x.camp.join(', '))),
  ]))}`).join('\n\n')}
    <p>Camp features and the skill each needs come from the Forever blueprint items on Wowhead.</p>`;
  return page({ title: 'Professions', tabLabel: 'Guide', body });
}

// Dungeon item pages come from scripts/gen-dungeon.js. Two generators writing one page would overwrite
// each other, so stop if a profession page has the title of a dungeon item.
const RESEARCH = path.join(ROOT, 'research');
const dungeonItems = new Set(fs.readdirSync(RESEARCH).filter((f) => f.endsWith('.json') && f !== 'icons.json')
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(RESEARCH, f), 'utf8')).items.map((i) => i.name)));

const written = [];
const fileFor = slugRegistry(); // throws if two titles would share a file
const write = (title, html) => {
  if (dungeonItems.has(title)) throw new Error(`"${title}" is also a dungeon item page (scripts/gen-dungeon.js); merge the two before generating`);
  fs.writeFileSync(path.join(OUT, fileFor(title) + '.html'), html);
  written.push(title);
};
write('Professions', hub());
profs.forEach((p) => build(p, write));
console.log(`Wrote ${written.length} pages:\n  ` + written.join('\n  '));
