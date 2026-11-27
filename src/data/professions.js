// Profession pages from research/professions/*.json, as JSON page models for src/pages/Doc.vue:
//   Professions    hub listing every profession (research/professions/index.json)
//   <Profession>   e.g. Mining: training, nodes, smelting/recipes, materials, camp, Forever changes
//   (ranks_note replaces the sentence under the rank table when max skill is not from the Forever tooltips)
//   <Node>         e.g. Copper Vein: required skill, skill-up colours, zones, spawn maps, contents
//   <Material>     e.g. Copper Ore: item infobox, where it is gathered, what makes it, what uses it
//   A node and a material with the same name (Peacebloom the herb and the plant it is picked from) share one
//   page: the item's infobox and sections, plus the node's skill, locations and contents.
// Wording that differs by profession comes from the research file: gather_verb ("Mining it gives"),
// recipe_section (Mining's Smelting), materials_note. Fishing pools have no required skill and no mapped
// spawns, so the research file can name its nodes (node_word: "pool") and replace the skill bar and the
// location maps with notes (node_skill_note, node_locations_note). See research/professions/README.md.
// Research data comes from scripts/fetch-professions.js (Wowhead Forever tooltip API) plus hand-written fields.
const fs = require('fs');
const path = require('path');
const { json, ROOT } = require('./research');
const { cap, article, wowhead } = require('../lib/wiki');
const { zoneMap, zonePageFor, pinTypeFor } = require('../lib/maps');
const D = require('../lib/doc');

const Doc = () => require('../pages/Doc.vue');
const iconExists = (name) => !!name && fs.existsSync(path.join(ROOT, 'site', 'assets', 'icons', name + '.jpg'));
const iconSeg = (name) => (iconExists(name) ? [D.icon(name)] : []);
const newTags = (x) => [...(x?.new_in_forever ? [D.tag('New in Forever')] : []), ...(x?.scarce ? [D.tag('Scarce')] : [])];
// A zone name, linked to its zone page (src/data/zones.js) when it has one
const zoneSegs = (id, name) => (name == null ? [D.unknown()] : zonePageFor(id) ? [D.link(zonePageFor(id))] : [name]);
const RECIPE_HEAD = ['Recipe', 'Skill', 'Reagents', 'Creates'];
const KIND_WORD = { ore: 'ore', stone: 'stone', gem: 'gem', bar: 'metal bar', herb: 'herb', seed: 'seed', fish: 'fish', catch: 'catch', tool: 'tool' };
// Material tables on the profession page, in this order; kinds not listed here (tools) get no table
const MATERIAL_KINDS = ['ore', 'stone', 'gem', 'bar', 'herb', 'seed', 'fish', 'catch'];
const KIND_PLURAL = { fish: 'fish', catch: 'other catches' }; // otherwise the kind word plus "s"

function profession(p, withPages, index) {
  const P = p.profession;
  const out = [];
  const mat = new Map(p.materials.map((m) => [m.item_id, m]));
  const matLink = (id, name) => {
    const m = mat.get(id);
    return m ? [...iconSeg(m.icon), D.link(m.name, 'q-' + (m.quality || 'common'))] : [name ?? `item ${id}`];
  };
  const counted = (r) => [...matLink(r.item_id, r.name), ...(r.count > 1 ? [` ×${r.count}`] : [])];

  // Group node objects by name: "Copper Vein" is several objects in different zones
  const nodeGroups = new Map();
  for (const n of p.nodes) {
    if (!nodeGroups.has(n.name)) nodeGroups.set(n.name, []);
    nodeGroups.get(n.name).push(n);
  }
  const groups = [...nodeGroups.entries()].map(([name, objs]) => ({
    name,
    objs: objs.sort((a, b) => (b.spawn_count || 0) - (a.spawn_count || 0)),
    req: objs[0].required_skill ?? null,
    contains: [...new Set(objs.flatMap((o) => o.contains))],
    variant: objs[0].variant,
    new_in_forever: objs.some((o) => o.new_in_forever),
  })).sort((a, b) => a.req - b.req || a.name.localeCompare(b.name));
  // "Zephras Isle (339), The Barrens (59)": objects that share a zone are added together, most spawns first
  const zonesOf = (g) => {
    const z = new Map();
    for (const o of g.objs.filter((x) => x.zone)) {
      const e = z.get(o.zone) || { id: o.zone_id, n: 0 };
      e.n += o.spawn_count || 0;
      z.set(o.zone, e);
    }
    const parts = [...z].sort((a, b) => b[1].n - a[1].n).map(([name, { id, n }]) => [...zoneSegs(id, name), ...(n ? [` (${n})`] : [])]);
    return parts.length ? D.join(parts) : [D.unknown()];
  };
  const contentsOf = (ids) => (ids.length ? D.join(ids.map((id) => matLink(id))) : [D.unknown()]);
  // One map per zone, with every object of the node that spawns there. The pin icon follows the profession.
  const spawnMaps = (g) => {
    const zones = new Map();
    for (const o of g.objs.filter((x) => x.coords?.length)) {
      const key = o.zone_id ?? o.zone;
      if (!zones.has(key)) zones.set(key, { zoneId: o.zone_id, zone: o.zone, ids: [], coords: [] });
      const z = zones.get(key);
      z.ids.push(o.object_id);
      z.coords.push(...o.coords);
    }
    return [...zones.values()].flatMap((z) => [
      { h3: [...zoneSegs(z.zoneId, z.zone), ` (object${z.ids.length > 1 ? 's' : ''} ${z.ids.join(', ')})`] },
      { map: zoneMap({ zoneId: z.zoneId, zoneName: z.zone, pins: z.coords.map(([x, y]) => ({ x, y, type: pinTypeFor(P), label: g.name })) }) },
    ]);
  };

  // ----- Materials: what makes and uses each one -----
  const madeBy = (id) => p.recipes.filter((r) => r.creates?.item_id === id);
  const usedBy = (id) => p.recipes.filter((r) => r.reagents?.some((x) => x.item_id === id));
  const plannedMadeBy = (id) => (p.recipes_unresearched || []).filter((r) => r.creates_item_id === id);
  const plannedUsedBy = (id) => (p.recipes_unresearched || []).filter((r) => r.reagent_item_ids?.includes(id));
  const campUses = (id) => p.camp.filter((c) => c.build_reagents?.some((x) => x.item_id === id));
  const recipeRow = (r) => [
    D.cell([...iconSeg(mat.get(r.creates?.item_id)?.icon), r.name]), D.cell(D.val(r.required_skill), 'num'),
    D.cell(D.join(r.reagents.map(counted))), D.cell(r.creates ? counted(r.creates) : [D.unknown()]),
  ];
  const kindWord = (m) => KIND_WORD[m.kind] || m.kind;
  const itemImage = (m) => {
    const q = m.quality || 'common';
    return { cls: `item-icon${q === 'poor' || q === 'common' ? '' : ' q-border-' + q}`, label: `${m.name} icon`, src: m.icon ? `/assets/icons/${m.icon}.jpg` : null };
  };
  const itemRows = (m) => {
    const q = m.quality || 'common';
    return [
      { th: 'Quality', segs: m.quality ? [D.q(q, cap(q))] : [D.unknown()] },
      { th: 'Type', segs: [cap(kindWord(m))] },
      { th: 'Item level', segs: D.val(m.item_level) },
      { th: 'Max stack', segs: D.val(m.max_stack) },
      { th: 'Sell price', segs: D.val(m.sell_price) },
      { th: 'Profession', segs: [D.link(P)] },
    ];
  };
  // "Copper Ore is a common ore used as a crafting reagent." With no known quality the article goes with the kind.
  const itemSentence = (m) => {
    const q = m.quality || 'common';
    return [
      D.b(m.name), ` is ${article(m.quality || kindWord(m))} `, ...(m.quality ? [D.q(q, q), ' '] : []),
      `${kindWord(m)}${m.kind === 'tool' ? '' : ' used as a crafting reagent'}.`,
      // Scarcity is shown by the Scarce tag in tables and explained in each scarce material's note
      `${m.new_in_forever ? ' It is new in WoW Forever.' : ''} `,
    ];
  };
  // Sections about the item: other nodes it comes from, recipes that make or use it, drops, camp features
  const itemSections = (m, self) => {
    const nodes = groups.filter((g) => g !== self && g.contains.includes(m.item_id));
    const made = madeBy(m.item_id), used = usedBy(m.item_id), camp = campUses(m.item_id);
    const plannedMade = plannedMadeBy(m.item_id), plannedUsed = plannedUsedBy(m.item_id);
    const names = (rs) => D.andList(rs.map((r) => [r.name]));
    const how = nodes.length ? ['It is gathered with ', D.link(P), ' from ', ...D.andList(nodes.map((g) => [D.link(g.name)])), '.']
      : made.length ? ['It is made with ', D.link(P), ' by ', ...names(made), '.']
        : plannedMade.length ? ['It is made with ', D.link(P), ' by ', ...names(plannedMade), '.']
          : m.kind === 'tool' ? ['It is needed to use ', D.link(P), '.'] : [];
    const sections = [];
    if (nodes.length) {
      sections.push(D.section('Gathered_from', self ? 'Also gathered from' : 'Gathered from', [
        { p: [p.nodes_contents_basis] },
        D.table(['Node', 'Requires', 'Main zones (spawn points)'], nodes.map((g) => [D.cell([D.link(g.name)]), D.cell(D.val(g.req), 'num'), D.cell(zonesOf(g))])),
      ]));
    }
    if (made.length || plannedMade.length) {
      sections.push(D.section('Created_by', 'Created by', [
        made.length && D.table(RECIPE_HEAD, made.map(recipeRow)),
        plannedMade.length && { p: ['New in Forever, not yet confirmed on Wowhead:'] },
        plannedMade.length && { ul: plannedMade.map((r) => [D.b(r.name), ' (', D.link(P), ` ${r.required_skill}): ${r.note}`]) },
      ]));
    }
    if (m.dropped_by && !['bar', 'tool'].includes(m.kind)) {
      sections.push(D.section('Drops', 'Dropped by', [{ p: [`Wowhead also lists it as dropped by ${m.dropped_by.npc}${m.dropped_by.drop_chance_pct != null ? ` (${m.dropped_by.drop_chance_pct}%)` : ''}.`] }]));
    }
    if (used.length || plannedUsed.length || camp.length) {
      sections.push(D.section('Used_for', `Used in ${P}`, [
        used.length && D.table(RECIPE_HEAD, used.map(recipeRow)),
        plannedUsed.length && { ul: plannedUsed.map((r) => [D.b(r.name), ' (', D.link(P), ` ${r.required_skill}, not yet confirmed): ${r.note}`]) },
        camp.length && { p: ['Camp features built with it:'] },
        camp.length && { ul: camp.map((c) => [D.link(P), ' camp: ', D.b(c.name), ' needs ', ...D.join(c.build_reagents.map(counted))]) },
      ]));
    }
    return { how, sections };
  };
  const byName = new Map(p.materials.map((m) => [m.name, m]));

  // ----- Node pages (with the item, when a material has the node's name) -----
  const gives = p.gather_phrase || `${p.gather_verb || 'Gathering'} it gives`;
  const nodeWord = p.node_word || 'node';
  for (const g of groups) {
    const m = byName.get(g.name) || null;
    const item = m ? itemSections(m, g) : null;
    // Fishing pools need no skill of their own: say what the node is, without "that needs Fishing ?"
    const noSkill = g.req == null && !!p.node_skill_note;
    const mapped = g.objs.some((o) => o.zone);
    const nodeSentence = [
      ...(noSkill
        ? (m ? [] : [D.b(g.name), ` is a ${P.toLowerCase()} ${nodeWord}.${g.new_in_forever ? ' It is new in WoW Forever.' : ''} `])
        : [
          ...(m ? [`Its ${P.toLowerCase()} ${nodeWord} needs `] : [D.b(g.name), ` is ${g.variant === 'ooze' ? 'an ooze-covered' : 'a'} ${P.toLowerCase()} ${nodeWord} that needs `]),
          D.link(P), ' ', ...D.val(g.req),
          `.${!m && g.new_in_forever ? ' It is new in WoW Forever.' : ''} `,
        ]),
      ...(g.contains.length ? [`${gives} `, ...D.andList(g.contains.map((id) => matLink(id))), '.'] : ['What it contains is not known yet.']),
    ];
    const requiresRow = noSkill ? [] : [{ th: 'Requires', segs: [D.link(P), ' (', ...D.val(g.req), ')'] }];
    const objectIds = { th: `Object ID${g.objs.length > 1 ? 's' : ''}`, segs: [g.objs.map((o) => o.object_id).join(', ')] };
    out.push({
      title: g.name,
      component: Doc(),
      props: {
        title: g.name, tab: m ? 'Item' : 'Object',
        infobox: m
          ? {
            name: g.name,
            image: itemImage(m),
            rows: [
              ...itemRows(m),
              { sub: cap(nodeWord) },
              ...requiresRow,
              { th: 'Contains', segs: contentsOf(g.contains) },
              { th: 'New in Forever', segs: [g.new_in_forever ? 'Yes' : 'No'] },
              { sub: 'Database' },
              { th: 'Item ID', segs: [String(m.item_id)] },
              objectIds,
              { th: 'Source', segs: [D.ext(wowhead('item', m.item_id), 'Wowhead')] },
            ],
          }
          : {
            name: g.name,
            rows: [
              { th: 'Type', segs: [D.link(P), ` ${nodeWord}`] },
              ...requiresRow,
              { th: 'Contains', segs: contentsOf(g.contains) },
              { th: 'New in Forever', segs: [g.new_in_forever ? 'Yes' : 'No'] },
              { sub: 'Database' },
              objectIds,
            ],
          },
        intro: [{ p: m ? [...itemSentence(m), ...nodeSentence, ...(item.how.length ? [' ', ...item.how] : []), ...(m.note ? [' ' + m.note] : [])] : nodeSentence }],
        sections: [
          D.section('Skill', 'Skill', noSkill ? [{ p: [p.node_skill_note] }] : [{ p: [D.skill(g.req)] }, { key: 'skill' }, { p: [p.skill_up_rule] }]),
          D.section('Locations', 'Locations', !mapped && p.node_locations_note ? [{ p: [p.node_locations_note] }, { p: [`Object ID${g.objs.length > 1 ? 's' : ''}: `, ...D.join(g.objs.map((o) => [D.ext(wowhead('object', o.object_id), o.object_id)]))] }] : [
            { p: [`Each object ID is a separate spawn set. Wowhead's tooltip data lists only the zone where each one spawns most, so ${g.name} may also appear in zones not listed here.`] },
            D.table(['Zone', 'Zone level', 'Spawn points', 'Object ID'], g.objs.map((o) => [
              D.cell(zoneSegs(o.zone_id, o.zone)), D.cell(D.val(o.zone_level), 'num'), D.cell(D.val(o.spawn_count), 'num'),
              D.cell([D.ext(wowhead('object', o.object_id), o.object_id)], 'num'),
            ])),
            ...spawnMaps(g),
          ]),
          D.section('Contents', 'Contents', g.contains.length
            ? [{ p: [p.nodes_contents_basis] }, { ul: g.contains.map((id) => matLink(id)) }]
            : [{ p: [`What this ${nodeWord} contains is not known yet.`] }]),
          ...(item ? item.sections : []),
        ],
      },
    });
  }

  // ----- Material pages (materials without a node of the same name) -----
  const nodeNames = new Set(groups.map((g) => g.name));
  for (const m of p.materials.filter((x) => !nodeNames.has(x.name))) {
    const { how, sections } = itemSections(m, null);
    out.push({
      title: m.name,
      component: Doc(),
      props: {
        title: m.name, tab: 'Item',
        infobox: {
          name: m.name,
          image: itemImage(m),
          rows: [
            ...itemRows(m),
            { sub: 'Database' },
            { th: 'Item ID', segs: [String(m.item_id)] },
            { th: 'Source', segs: [D.ext(wowhead('item', m.item_id), 'Wowhead')] },
          ],
        },
        intro: [{ p: [...itemSentence(m), ...how, ...(m.note ? [' ' + m.note] : [])] }],
        toc: sections.length > 1,
        sections,
      },
    });
  }

  // ----- Profession page -----
  const byKind = (k) => p.materials.filter((m) => m.kind === k);
  const anySkill = groups.some((g) => g.req != null);
  const anyZone = groups.some((g) => g.objs.some((o) => o.zone));
  const sourceOf = (m) => {
    const ns = groups.filter((g) => g.contains.includes(m.item_id));
    if (ns.length) return D.join(ns.map((g) => [D.link(g.name)]));
    const rs = [...madeBy(m.item_id), ...plannedMadeBy(m.item_id)];
    return rs.length ? [rs.map((r) => r.name).join(', ')] : ['–'];
  };
  const idx = index.groups.flatMap((g) => g.professions).find((x) => x.name === P) || {};
  const planned = (p.recipes_unresearched || []).map((r) => [D.b(r.name), ` (${P} ${r.required_skill}): ${r.note}`]);
  out.push({
    title: P,
    component: Doc(),
    props: {
      title: P, tab: 'Profession',
      infobox: {
        name: P,
        image: { cls: 'item-icon', label: `${P} icon`, src: iconExists(p.icon) ? `/assets/icons/${p.icon}.jpg` : null },
        rows: [
          { th: 'Type', segs: [`${cap(p.kind)} profession`] },
          { th: 'Maximum skill', segs: [String(p.ranks[p.ranks.length - 1].max_skill)] },
          { th: 'Tool', segs: p.tools.length ? D.join(p.tools.map((t) => matLink(t.item_id, t.name))) : ['–'] },
          { th: 'Used by', segs: idx.feeds?.length ? D.join(idx.feeds.map((f) => (withPages.has(f) ? [D.link(f)] : [f]))) : ['–'] },
          { th: `${cap(p.node_word || 'node')}s`, segs: [String(groups.length)] },
        ],
      },
      intro: [{ p: [D.b(P), ` is a ${p.kind} `, D.link('Professions', null, 'profession'), ` in WoW Forever. ${p.summary}`] }],
      sections: [
        D.section('Training', 'Training', [
          { p: [`${P} is learned from a ${P.toLowerCase()} trainer in rank order. Each rank raises the maximum skill by 75.`] },
          D.table(['Rank', 'Skill', 'Requires', 'Spell'], p.ranks.map((r, i) => [
            D.cell([D.b(r.rank)]), D.cell([`1–${r.max_skill}`], 'num'),
            D.cell(i === 0 ? ['None'] : [`${P} `, ...D.val(r.requires_skill), ', level ', ...D.val(r.requires_level)]),
            D.cell([D.ext(wowhead('spell', r.spell_id), r.spell_id)], 'num'),
          ])),
          { p: [p.ranks_note || 'Maximum skill comes from the Forever spell tooltips. The skill and level needed to train each rank are the Classic values and have not been confirmed for Forever.'] },
          { ul: [
            ...p.tools.map((t) => [...matLink(t.item_id, t.name), `: ${t.note}`]),
            ...p.abilities.map((a) => [D.b(a.name), ' (', D.ext(wowhead('spell', a.spell_id), `spell ${a.spell_id}`), `): ${a.note}`]),
          ] },
        ]),
        // Columns only when some node has the data: fishing pools have no required skill and no mapped zones
        D.section('Nodes', p.nodes_label || `${P} nodes`, [
          { p: [p.nodes_intro ? `${p.nodes_intro} ${p.nodes_contents_basis}` : `Nodes are listed by required skill. The colours show which skill levels a node still gives skill points at. Zones are the ones where each node spawns most (spawn points in brackets). ${p.nodes_contents_basis}`] },
          D.table([cap(p.node_word || 'node'), ...(anySkill ? ['Requires', 'Skill-up'] : []), 'Contains', ...(anyZone ? ['Main zones'] : [])], groups.map((g) => [
            D.cell([D.link(g.name), ...newTags(g)]),
            ...(anySkill ? [D.cell(D.val(g.req), 'num'), D.cell([D.skill(g.req)])] : []),
            D.cell(contentsOf(g.contains)),
            ...(anyZone ? [D.cell(zonesOf(g))] : []),
          ])),
          anySkill && { key: 'skill' },
        ]),
        // Recipes the gathering profession itself has (Mining's Smelting); described in the research file
        p.recipe_section && D.section(p.recipe_section.id, p.recipe_section.label, [
          { p: [p.recipe_section.intro] },
          D.table(RECIPE_HEAD, p.recipes.map(recipeRow)),
          planned.length && { p: ['New in Forever, from fan guides and not yet confirmed on Wowhead:'] },
          planned.length && { ul: planned },
        ]),
        D.section('Materials', 'Materials', [
          ...MATERIAL_KINDS.filter((k) => byKind(k).length).flatMap((k) => [
            { h3: [cap(KIND_PLURAL[k] || `${KIND_WORD[k]}s`)], id: cap(KIND_PLURAL[k] || `${k}s`).replace(/ /g, '_') },
            D.table(['Item', 'Item level', 'Sells for', 'Source'], byKind(k).map((m) => [
              D.cell([...iconSeg(m.icon), D.link(m.name, 'q-' + (m.quality || 'common')), ...newTags(m)]),
              D.cell(D.val(m.item_level), 'num'), D.cell(D.val(m.sell_price)), D.cell(sourceOf(m)),
            ])),
          ]),
          p.materials_note && { p: [p.materials_note] },
        ]),
        D.section('Camp', 'Camp features', [
          { p: ['WoW Forever lets players build a campsite. Each profession has camp features that need a Campfire nearby, and all of them share a 1 hour cooldown.'] },
          D.table(['Feature', 'Requires', 'Effect', 'Build cost', 'How to learn'], p.camp.map((c) => [
            D.cell([D.b(c.name)]), D.cell(D.val(c.required_skill), 'num'),
            D.cell(c.effect_note || c.effect ? [c.effect_note || c.effect] : [D.unknown()]),
            D.cell(c.build_reagents?.length ? D.join(c.build_reagents.map(counted)) : ['–']),
            D.cell(c.kind === 'blueprint'
              ? [`${c.blueprint}: dropped by `, ...(c.blueprint_source ? [`${c.blueprint_source.npc}${c.blueprint_source.drop_chance_pct != null ? ` (${c.blueprint_source.drop_chance_pct}%)` : ''}`] : [D.unknown()])]
              : ['Learned with the profession']),
          ])),
        ]),
        D.section('Other_items', 'Other items', [{ ul: p.other_items.map((o) => [D.ext(wowhead('item', o.item_id), o.name), `: ${o.note}`]) }]),
        D.section('Research_notes', 'Research notes', [
          ...(p.conflicts.length ? [{ p: ['Where sources disagree:'] }, { ul: p.conflicts.map((c) => [c]) }] : [{ p: ['No sources disagreed.'] }]),
          { p: ['Not researched yet:'] }, { ul: p.gaps.map((g) => [g]) },
        ]),
        D.section('Sources', 'Sources', [{ ul: p.sources.map((s) => [D.ext(s.url, s.name), ...(s.used_for ? [` – ${s.used_for}`] : [])]) }]),
      ].filter(Boolean),
    },
  });
  return out;
}

// ---------- Hub ----------
function hub(index, withPages) {
  const sections = index.groups.map((g) => D.section(cap(g.kind), g.title, [
    { p: [g.blurb] },
    D.table(['Profession', 'Summary', 'Supplies', 'Camp features (skill)'], g.professions.map((x) => [
      D.cell([...iconSeg(x.icon), ...(withPages.has(x.name) ? [D.link(x.name)] : [x.name, ' ', D.unknown('(page not written yet)')])]),
      D.cell([x.summary]),
      D.cell(x.feeds.length ? D.join(x.feeds.map((f) => (withPages.has(f) ? [D.link(f)] : [f]))) : ['–']),
      D.cell([x.camp.join(', ')]),
    ])),
  ]));
  sections[sections.length - 1].blocks.push({ p: ['Camp features and the skill each needs come from the Forever blueprint items on Wowhead.'] });
  return {
    title: 'Professions',
    component: Doc(),
    props: {
      title: 'Professions', tab: 'Guide',
      intro: [
        { p: [D.b('Professions'), ' are trade skills. Each character can learn two primary professions, which are the gathering and production professions, and all three secondary professions. Professions are levelled from 1 to 300 in four ranks: Apprentice, Journeyman, Expert and Artisan.'] },
        { p: ['WoW Forever adds camp features to every profession. These are placeable objects such as a Rock Garden or a Greenhouse, learned from blueprints that drop in the world and in dungeons. It also adds new materials, such as Heavy Thorium Ore, and new top-level recipes.'] },
      ],
      sections,
    },
  };
}

function pages() {
  const index = json('professions/index.json');
  const all = index.groups.flatMap((g) => g.professions);
  // Every profession with a research file gets pages, so links to it are never broken
  const withPages = new Set(all.filter((p) => p.file).map((p) => p.name));
  return [hub(index, withPages), ...all.filter((p) => p.file).flatMap((p) => profession(json(`professions/${p.file}`), withPages, index))];
}

module.exports = { pages };
