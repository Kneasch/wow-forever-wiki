// Quest pages from research/quests/ (scripts/fetch-quests.js), as JSON page models for src/pages/Doc.vue.
// The layout follows the OSRS Wiki's quest pages: an infobox, a details table (start point, objective,
// requirements, objectives), the quest text, rewards, and the quest series with the previous and next steps.
//   Quests            hub: every region and zone in research/quests/index.json, with how far each has got
//   <Zone> quests     e.g. Desolace quests: every quest Wowhead files under the zone, its chains, related quests
//   <Quest>           one per quest. Names that several quests share are told apart (see questTitles)
// Quests fetched from the tooltip API only (basis "tooltip") have their objective, XP and money; the rest
// shows as not known yet until their Wowhead page is read. See docs/quests-plan.md.
const { json } = require('./research');
const { MAPS, zonePageFor } = require('../lib/maps');
const { plural, wowhead } = require('../lib/wiki');
const D = require('../lib/doc');

const Doc = () => require('../pages/Doc.vue');
const SIDES = ['Alliance', 'Horde'];
// Wowhead files some quests under places that are not maps: dungeons, classes, crafting orders
const CATEGORY_NAMES = {
  2100: 'Maraudon', 1583: 'Blackrock Spire', 1176: "Zul'Farrak", 719: 'Blackfathom Deeps', 721: 'Gnomeregan',
  722: 'Razorfen Downs', 16941: 'Crafting orders',
  // Wowhead's negative categories: class quests, seasonal events and Forever's camping quests
  '-61': 'Warlock', '-81': 'Warrior', '-82': 'Shaman', '-141': 'Paladin', '-161': 'Mage', '-162': 'Rogue',
  '-261': 'Hunter', '-262': 'Priest', '-263': 'Druid', '-666': 'Camping', '-366': 'Lunar Festival', '-1001': 'Winter Veil',
  '-1003': "Hallow's End", '-1005': 'Midsummer Fire Festival', '-1006': 'Seasonal',
};
const categoryName = (id) => CATEGORY_NAMES[id] || MAPS.zones.find((z) => z.area_id === id)?.name || `category ${id}`;
const listTitle = (zone) => `${zone} quests`;
const num = (n) => Number(n).toLocaleString('en-GB');

// Every zone file in index order: [{ region, zone, data }]
function zoneFiles() {
  const index = json('quests/index.json');
  return index.regions.flatMap((r) => r.zones.filter((z) => z.file).map((z) => ({ region: r.region, zone: z, data: json(`quests/${z.file}`) })));
}

// Titles of every page that is not a quest page, so a quest named like an item or a zone gets "(quest)"
let others = null;
function otherTitles() {
  if (!others) {
    const { collectPages } = require('../build/render');
    others = new Set(collectPages({ sources: ['zones', 'professions', 'dungeons'] }).map((p) => p.title.toLowerCase()));
  }
  return others;
}

// quest id -> page title. A name only one quest has is the title. When several share a name:
// - quests in different zones get the zone first: "Lost Shipping Crate (Desolace, Alliance)", so adding a zone
//   never renumbers another zone's quests
// - within a zone, "(Alliance)" / "(Horde)" when that tells them all apart
// - otherwise "(1)", "(2)" ... by level, then ID (not chain order: the numbers must not change when chains change)
let titles = null;
function questTitles() {
  if (titles) return titles;
  titles = new Map();
  const all = zoneFiles().flatMap((f) => f.data.quests.map((q) => ({ q, zone: f.zone.name })));
  const byName = new Map();
  for (const e of all) { if (!byName.has(e.q.name)) byName.set(e.q.name, []); byName.get(e.q.name).push(e); }
  const taken = otherTitles();
  const tell = (qs) => {
    if (qs.length === 1) return new Map([[qs[0].quest_id, null]]);
    const sides = qs.map((q) => q.side);
    if (sides.every((x) => SIDES.includes(x)) && new Set(sides).size === qs.length) return new Map(qs.map((q) => [q.quest_id, q.side]));
    return new Map([...qs].sort((a, b) => a.level - b.level || a.quest_id - b.quest_id).map((q, i) => [q.quest_id, String(i + 1)]));
  };
  for (const [name, es] of byName) {
    const zones = [...new Set(es.map((e) => e.zone))];
    if (zones.length === 1) {
      const base = taken.has(name.toLowerCase()) && es.length === 1 ? `${name} (quest)` : name;
      for (const [id, tag] of tell(es.map((e) => e.q))) titles.set(id, tag ? `${name} (${tag})` : base);
      continue;
    }
    for (const zone of zones) {
      for (const [id, tag] of tell(es.filter((e) => e.zone === zone).map((e) => e.q))) titles.set(id, `${name} (${zone}${tag ? ', ' + tag : ''})`);
    }
  }
  return titles;
}

// A quest by ID: a wiki link when it has a page, else the name linked to Wowhead
const questLink = (id, name, asTitle = false) => {
  const t = id != null && questTitles().get(id);
  return t ? [D.link(t, null, t === name || asTitle ? undefined : name)] : id != null ? [D.ext(wowhead('quest', id), name)] : [name];
};
// An NPC, object or item that starts or ends a quest. There are no NPC pages yet, so these go to Wowhead.
// A quest page with no Start line: Wowhead names no giver, which is how quests started by an item show
const NO_GIVER = 'Not listed (usually an item that starts the quest)';
const whoSegs = (w, page = false) => (!w ? [D.unknown(page ? NO_GIVER : true)] : w.id ? [D.ext(wowhead(w.type, w.id), w.name), ...(w.type !== 'npc' ? [` (${w.type})`] : [])] : [w.name]);
const sideSegs = (q) => [q.side === 'Both' || (!q.side && q.side_label === 'Both') ? 'Both' : q.side || (q.side_label ? `${q.side_label} (as Wowhead lists it)` : 'Not listed')];
// A reward item: icon and quality colour; a wiki link when the item already has a page (dungeon loot)
const itemSegs = (it) => {
  const has = otherTitles().has(it.name.toLowerCase());
  const label = it.count > 1 ? ` ×${it.count}` : '';
  const name = has ? D.link(it.name, 'q-' + (it.quality || 'common')) : it.id ? D.ext(wowhead(it.type || 'item', it.id), it.name) : it.name;
  return [...(it.icon && it.type === 'item' ? [D.icon(it.icon)] : []), name, label].filter(Boolean);
};
const repSegs = (r) => [`${r.amount > 0 ? '+' : ''}${num(r.amount)} reputation with `, D.ext(wowhead('faction', r.faction_id), r.faction)];
const notYet = 'Not recorded yet: only the tooltip data is in so far.';

// A quest's series: its own, or, when its page has not been read, one recorded on another quest of the
// same chain (A Conqueror's Crown's series names Brutal Politics), with this quest marked as current
let seriesIndex = null;
function seriesOf(q) {
  if (q.series) return q.series;
  if (!seriesIndex) {
    seriesIndex = new Map();
    for (const x of zoneFiles().flatMap((f) => f.data.quests)) {
      for (const e of (x.series || []).flat()) if (e.quest_id != null && !seriesIndex.has(e.quest_id)) seriesIndex.set(e.quest_id, x.series);
    }
  }
  const s = seriesIndex.get(q.quest_id);
  return s ? s.map((step) => step.map((e) => ({ ...e, current: e.quest_id === q.quest_id }))) : null;
}

// The series step holding this quest, and the steps before and after it, keeping only quests the same side can do
function chainOf(q) {
  const series = seriesOf(q);
  if (!series) return null;
  const at = series.findIndex((s) => s.some((e) => e.current));
  const fits = (e) => !e.side || !SIDES.includes(q.side) || e.side === q.side;
  const pick = (i) => (series[i] || []).filter((e) => !e.current && fits(e));
  return { at, steps: series, prev: at > 0 ? pick(at - 1) : [], next: pick(at + 1), borrowed: !q.series };
}

function questPage(q, zone, zoneTitle) {
  const title = questTitles().get(q.quest_id);
  const full = q.basis === 'page';
  const chain = chainOf(q);
  const zoneSeg = [D.link(zoneTitle, null, zone)]; // the zone's quest list

  const infobox = {
    name: q.name,
    rows: [
      { th: 'Zone', segs: zoneSeg },
      { th: 'Level', segs: D.val(q.level) },
      { th: 'Requires level', segs: D.val(q.required_level) },
      { th: 'Side', segs: sideSegs(q) },
      ...(q.type ? [{ th: 'Type', segs: [q.type] }] : []),
      ...(q.races ? [{ th: q.races.length > 1 ? 'Races' : 'Race', segs: [q.races.join(', ')] }] : []),
      ...(q.classes ? [{ th: q.classes.length > 1 ? 'Classes' : 'Class', segs: [q.classes.join(', ')] }] : []),
      ...(q.timer ? [{ th: 'Timer', segs: [q.timer] }] : []),
      ...(q.repeatable ? [{ th: 'Repeatable', segs: ['Yes'] }] : []),
      { th: 'Start', segs: whoSegs(q.start, full) },
      { th: 'End', segs: whoSegs(q.end) },
      { th: 'Sharable', segs: q.sharable == null ? [D.unknown()] : [q.sharable ? 'Yes' : 'No'] },
      { th: 'Series', segs: chain ? [`Part ${chain.at + 1} of ${chain.steps.length}`] : full ? ['None'] : [D.unknown()] },
      { th: 'New in Forever', segs: q.new_in_forever == null ? [D.unknown()] : [q.new_in_forever ? 'Yes' : 'No'] },
      { sub: 'Database' },
      { th: 'Quest ID', segs: [String(q.quest_id)] },
      ...(q.patch_label ? [{ th: 'Added in patch', segs: [q.patch_label] }] : []),
      { th: 'Wowhead', segs: [D.ext(wowhead('quest', q.quest_id), 'quest=' + q.quest_id)] },
    ],
  };

  const sideWord = SIDES.includes(q.side) ? ` for ${q.side} players` : '';
  const intro = [{ p: [
    D.b(q.name), ` is a level ${q.level ?? '?'} quest in `, ...zoneSeg, sideWord, '.',
    ...(q.start ? [' It starts with ', ...whoSegs(q.start), '.'] : []),
    ...(chain ? [` It is part ${chain.at + 1} of a ${chain.steps.length}-part series.`] : []),
    ...(q.new_in_forever ? [' It is new in WoW Forever. ', D.tag('New in Forever')] : []),
  ] }];

  // ----- Details, as the OSRS Wiki's quest details box -----
  const reqs = [
    [`Level ${q.required_level ?? '?'}`],
    ...(chain?.prev.length ? [['Complete ', ...D.join(chain.prev.map((e) => questLink(e.quest_id, e.name)), ' or ')]] : []),
    ...(!full && !chain ? [[D.unknown('Earlier quests not recorded yet')]] : []),
  ];
  const objectives = (q.objectives || []).map((o) => [
    o.type === 'npc' || o.type === 'item' || o.type === 'object' ? D.ext(wowhead(o.type, o.id), o.text) : o.text,
    ...(typeof o.quantity === 'number' ? [` ×${o.quantity}`] : typeof o.quantity === 'string' ? [` (${o.quantity})`] : []),
    ...(o.counts_from?.length ? [': any of ', ...D.join(o.counts_from.map((m) => [m.id ? D.ext(wowhead(m.type, m.id), m.text) : m.text]))] : []),
  ]);
  const detailRow = (label, segs) => [D.cell([D.b(label)]), D.cell(segs)];
  const details = D.table(['', ''], [
    detailRow('Start point', q.start ? [...whoSegs(q.start), ' in ', ...zoneSeg] : whoSegs(null, full)),
    detailRow('Objective', q.objective ? [q.objective] : [D.unknown()]),
    detailRow('Requirements', D.join(reqs, '; ')),
    detailRow('Ends at', whoSegs(q.end)),
    ...(q.provided?.length ? [detailRow('Items provided', D.join(q.provided.map((p) => [p.text])))] : []),
  ], 'wikitable quest-details');

  // ----- Rewards -----
  const r = q.rewards || {};
  const rewardList = [
    ...(q.xp ? [[`${num(q.xp)} experience (at level ${q.level}; less above it)`]] : []),
    ...(r.money ? [[r.money]] : []),
    ...(q.reputation || []).map(repSegs),
    ...(r.items || []).map(itemSegs),
    ...(r.spells || []).map((s) => ['Learn ', s.id ? D.ext(wowhead('spell', s.id), s.name) : s.name]),
    ...(q.other_gains || []).map((g) => [g]),
  ];
  const rewardBlocks = [
    rewardList.length ? { ul: rewardList } : { p: ['No experience, money or reputation is listed.'] },
    ...(r.choice?.length ? [{ p: ['Choose one of:'] }, { ul: r.choice.map(itemSegs) }] : []),
    ...(!full ? [{ p: [D.unknown(`Item rewards and reputation: ${notYet.toLowerCase()}`)] }] : []),
  ];

  // ----- Quest series -----
  const seriesBlocks = chain
    ? [
      { ol: chain.steps.map((s) => D.join(s.map((e) => [...(e.current ? [D.b(e.name)] : questLink(e.quest_id, e.name)), ...(e.side ? [` (${e.side})`] : [])]), ' / ')) },
      { p: ['Previous: ', ...(chain.prev.length ? D.join(chain.prev.map((e) => questLink(e.quest_id, e.name))) : ['none']),
        '. Next: ', ...(chain.next.length ? D.join(chain.next.map((e) => questLink(e.quest_id, e.name))) : ['none, this is the last step']), '.'] },
      { p: ["Steps with more than one quest are side versions or quests done side by side, as Wowhead's series box groups them.",
        ...(chain.borrowed ? [' This series is taken from another quest of the chain, as this quest\'s own page has not been read yet.'] : [])] },
    ]
    : [{ p: [full ? 'This quest is not part of a series.' : D.unknown(notYet)] }];

  const text = (label, t) => [{ h3: [label] }, ...(t ? t.split(/\n\s*\n/).map((para) => ({ p: [para.replace(/\s*\n\s*/g, ' ')] })) : [{ p: [D.unknown()] }])];
  const sections = [
    D.section('Details', 'Details', [details, ...(objectives.length ? [{ h3: ['Objectives'] }, { ul: objectives }] : [])]),
    D.section('Quest_text', 'Quest text', full
      ? [...text('Description', q.description), ...text('Progress', q.progress), ...text('Completion', q.completion)]
      : [{ p: [D.unknown(notYet)] }]),
    D.section('Rewards', 'Rewards', rewardBlocks),
    D.section('Quest_series', 'Quest series', seriesBlocks),
    ...(q.notes ? [D.section('Notes', 'Notes', [{ p: [q.notes] }])] : []),
    D.section('Sources', 'Sources', [{ ul: [
      [D.ext(wowhead('quest', q.quest_id), `Wowhead Forever: ${q.name}`), full ? ' (quest page)' : ' (tooltip data and the zone quest list)'],
    ] }]),
  ];
  const searchNote = [zone, q.level != null ? `level ${q.level}` : null, SIDES.includes(q.side) ? q.side : null].filter(Boolean).join(', ');
  return { title, searchNote, component: Doc(), props: { title, tab: 'Quest', infobox, intro, toc: true, sections } };
}

function zoneList({ region, zone, data }) {
  const title = listTitle(zone.name);
  const zoneTitle = zonePageFor(zone.area_id);
  const qs = data.quests;
  const full = qs.filter((q) => q.basis === 'page');
  const bySide = (s) => qs.filter((q) => q.side === s).length;
  const levels = qs.map((q) => q.level).filter(Boolean);
  const row = (q) => [
    D.cell([...questLink(q.quest_id, q.name, true), ...(q.new_in_forever ? [' ', D.tag('New')] : [])]),
    D.cell(D.val(q.level), 'num'), D.cell(D.val(q.required_level), 'num'),
    D.cell(sideSegs(q)), D.cell(whoSegs(q.start)),
    D.cell(q.xp ? [num(q.xp)] : ['–'], 'num'), D.cell(q.rewards?.money ? [q.rewards.money] : ['–']),
  ];

  // Chains: every distinct series among the quests whose page has been read, longest first
  const seen = new Set();
  const chains = [];
  for (const q of full.filter((x) => x.series)) {
    const ids = q.series.flat().map((e) => e.quest_id).join(',');
    if (seen.has(ids)) continue;
    seen.add(ids);
    chains.push(q.series);
  }
  const chainBlocks = chains.length
    ? chains.flatMap((steps) => [
      { h3: [steps[0].map((e) => e.name).join(' / '), ' → ', steps[steps.length - 1].map((e) => e.name).join(' / ')] },
      { ol: steps.map((s) => D.join(s.map((e) => [...questLink(e.quest_id, e.name), ...(e.side ? [` (${e.side})`] : [])]), ' / ')) },
    ])
    : [{ p: [D.unknown('No chains recorded yet.')] }];

  const relatedRows = (data.related || []).map((q) => [
    D.cell(questLink(q.quest_id, q.name)), D.cell(D.val(q.level), 'num'), D.cell(sideSegs(q)), D.cell([categoryName(q.category_id)]),
  ]);

  return {
    title,
    component: Doc(),
    props: {
      title, tab: 'Quests',
      infobox: { name: title, rows: [
        { th: 'Zone', segs: zoneTitle ? [D.link(zoneTitle)] : [zone.name] },
        { th: 'Region', segs: [D.link('Quests', null, region)] },
        { th: 'Quests', segs: [String(qs.length)] },
        { th: 'Levels', segs: levels.length ? [`${Math.min(...levels)}–${Math.max(...levels)}`] : [D.unknown()] },
        { th: 'Alliance only', segs: [String(bySide('Alliance'))] },
        { th: 'Horde only', segs: [String(bySide('Horde'))] },
        { th: 'New in Forever', segs: [full.length === qs.length ? String(qs.filter((q) => q.new_in_forever).length) : `${qs.filter((q) => q.new_in_forever).length} known`] },
        { sub: 'Research' },
        { th: 'Full data', segs: [`${full.length} of ${qs.length}`] },
        { th: 'Fetched', segs: [data.fetched] },
      ] },
      intro: [
        { p: [`Wowhead files ${plural(qs.length, 'quest')} under `, ...(zoneTitle ? [D.link(zoneTitle)] : [zone.name]),
          `, from level ${Math.min(...levels)} to ${Math.max(...levels)}. Each has its own page with its objective, rewards and place in its quest chain.`] },
        ...(full.length < qs.length ? [{ p: [`So far ${full.length} of them have their full Wowhead page recorded (giver, quest text, item rewards, reputation and series). `,
          'The rest have the objective, experience and money from the tooltip data, and show "?" for the rest until their page is read.'] }] : []),
        ...(full.length ? [{ p: [`${plural(qs.filter((q) => q.new_in_forever).length, 'quest is', 'quests are')} new in WoW Forever, and `,
          `${plural(qs.filter((q) => seriesOf(q)).length, 'quest is', 'quests are')} part of a chain.`] }] : []),
      ],
      toc: true,
      sections: [
        D.section('Quests', 'Quests', [
          { p: ['Experience is at the quest\'s own level. Side "Both" means either faction can take it.'] },
          D.table(['Quest', 'Level', 'Req.', 'Side', 'Starts with', 'XP', 'Money'], qs.map(row)),
        ]),
        D.section('Quest_chains', 'Quest chains', chainBlocks),
        D.section('Related_quests', 'Related quests', relatedRows.length ? [
          { p: [`Wowhead's ${zone.name} quest list also has these, which it files under another place: chains that start in a city, dungeon quests, class quests and crafting orders. They get pages with their own zone.`] },
          D.table(['Quest', 'Level', 'Side', 'Filed under'], relatedRows),
        ] : null),
        D.section('Sources', 'Sources', [{ ul: [[D.ext(data.source, `Wowhead Forever: ${zone.name} quests`)]] }]),
      ],
    },
  };
}

function hub() {
  const index = json('quests/index.json');
  const files = zoneFiles();
  const total = files.reduce((n, f) => n + f.data.quests.length, 0);
  const zoneCount = index.regions.reduce((n, r) => n + r.zones.length, 0);
  const sections = index.regions.map((r) => D.section(r.region.replace(/[^A-Za-z]+/g, '_'), r.region, [
    ...(r.note ? [{ p: [r.note] }] : []),
    D.table(['Zone', 'Quests', 'Status'], r.zones.map((z) => {
      const f = files.find((x) => x.zone.key === z.key);
      const zt = zonePageFor(z.area_id);
      return [
        D.cell(f ? [D.link(listTitle(z.name), null, z.name)] : zt ? [D.link(zt)] : [z.name]),
        D.cell(f ? [String(f.data.quests.length)] : ['–'], 'num'),
        D.cell(f ? [`${f.data.quests.filter((q) => q.basis === 'page').length} with full data`] : ['Planned']),
      ];
    })),
  ]));
  return {
    title: 'Quests',
    component: Doc(),
    props: {
      title: 'Quests', tab: 'Quests',
      infobox: { name: 'Quests', rows: [
        { th: 'Zones done', segs: [`${files.length} of ${zoneCount}`] },
        { th: 'Quest pages', segs: [String(total)] },
      ] },
      intro: [{ p: ['Quests are being added one zone at a time, region by region, starting with ', ...(files[0] ? [D.link(listTitle(files[0].zone.name), null, files[0].zone.name)] : ['Desolace']),
        '. Each zone has a quest list, and each quest a page with its objective, requirements, rewards and the quests before and after it in its chain.'] }],
      toc: true,
      sections,
    },
  };
}

function pages() {
  const out = [hub()];
  for (const f of zoneFiles()) {
    out.push(zoneList(f));
    for (const q of f.data.quests) out.push(questPage(q, f.zone.name, listTitle(f.zone.name)));
  }
  return out;
}

// For other page sources: the quest list title of a zone (area id), or null
const questListFor = (areaId) => {
  const f = zoneFiles().find((x) => x.zone.area_id === areaId);
  return f ? { title: listTitle(f.zone.name), count: f.data.quests.length } : null;
};

module.exports = { pages, questListFor, questTitles };
