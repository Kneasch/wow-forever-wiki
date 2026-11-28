// Zone pages: the Zones list and one page per map (zone, city, battleground, continent), from
// research/maps/zones.json. A zone page also lists, from research already in the repo:
//   - dungeons whose `zone` names it (research/*.json)
//   - gathering nodes whose Wowhead main zone it is (research/professions/*.json `nodes[]`), pinned on its map
const { json, dungeonFiles } = require('./research');
const { MAPS, zoneMap, zonePageTitle, pinTypeFor } = require('../lib/maps');
const { pageHref, plural, cap } = require('../lib/wiki');

const byName = (a, b) => a.name.localeCompare(b.name);
const KIND = { zone: 'zone', city: 'capital city', battleground: 'battleground', continent: 'continent' };
// Blackrock Mountain is not a map of its own: it sits on the border of these two zones.
const ZONE_ALIASES = { 'Blackrock Mountain': ['Searing Gorge', 'Burning Steppes'] };

function pages() {
  const zones = MAPS.zones.filter((z) => z.has_image);
  const byUiMap = new Map(zones.map((z) => [z.ui_map_id, z]));
  const parentOf = (z) => byUiMap.get(z.parent_ui_map_id) || null;
  const continentOf = (z) => { for (let p = parentOf(z); p; p = parentOf(p)) if (p.kind === 'continent') return p; return null; };
  const continents = zones.filter((z) => z.kind === 'continent').sort(byName);
  const of = (kind, parent) => zones.filter((z) => z.kind === kind && (parent === undefined || z.parent === parent));
  // Zones whose parent is not a continent (Zephras Isle sits directly under Azeroth)
  const elsewhere = zones.filter((z) => z.kind === 'zone' && !continents.some((c) => c.name === z.parent));

  // Dungeons: `zone` is free text ("Orgrimmar (Durotar)", "Ironforge / Dun Morogh"), so every map name it contains counts.
  const dungeons = dungeonFiles().map((f) => json(f)).map((d) => {
    const names = new Set(zones.filter((z) => z.kind !== 'continent' && d.zone?.includes(z.name)).map((z) => z.name));
    for (const [alias, real] of Object.entries(ZONE_ALIASES)) if (d.zone?.includes(alias)) real.forEach((n) => names.add(n));
    return { name: d.dungeon, levels: d.level_range || null, new_in_forever: !!d.new_in_forever, order: d.order, zones: names };
  });
  const dungeonsIn = (z) => dungeons.filter((d) => d.zones.has(z.name)).sort((a, b) => a.order - b.order)
    .map(({ name, levels, new_in_forever }) => ({ name, levels, new_in_forever }));

  // Gathering nodes, from every profession research file that has nodes[]. The pin type follows the profession.
  const profIndex = json('professions/index.json');
  const profs = profIndex.groups.flatMap((g) => g.professions).filter((p) => p.file).map((p) => json(`professions/${p.file}`));
  const nodesIn = (z) => profs.flatMap((p) => {
    const groups = new Map();
    // continents have no area ID; never match nodes whose zone is unknown (null) to them
    for (const o of p.nodes.filter((n) => z.area_id != null && n.zone_id === z.area_id)) {
      if (!groups.has(o.name)) groups.set(o.name, { name: o.name, profession: p.profession, type: pinTypeFor(p.profession), req: o.required_skill ?? null, coords: [] });
      groups.get(o.name).coords.push(...(o.coords || []));
    }
    return [...groups.values()];
  }).sort((a, b) => (a.req ?? 0) - (b.req ?? 0) || a.name.localeCompare(b.name));

  // Gallery cards: thumbnail and link to the map's page
  const card = (z, note = '') => ({
    title: zonePageTitle(z), name: z.name, thumb: z.thumb || z.image,
    thumbHeight: Math.round(334 * z.height / z.width), note, new_in_forever: z.new_in_forever,
  });
  const gallery = (xs, note) => [...xs].sort(byName).map((z) => card(z, note ? note(z) : ''));
  const source = { build: MAPS.build, url: MAPS.source_url };

  function zonePage(z) {
    const parent = parentOf(z), continent = continentOf(z);
    const sections = [{ id: 'Map', label: 'Map', map: zoneMap({ zone: z, caption: `The ${KIND[z.kind]} map, fully explored.` }) }];
    if (z.kind === 'continent') {
      sections.push({ id: 'Zones', label: 'Zones', gallery: gallery(of('zone', z.name)) });
      const cities = of('city').filter((c) => continentOf(c) === z);
      if (cities.length) sections.push({ id: 'Cities', label: 'Cities', gallery: gallery(cities) });
    }
    const dgs = dungeonsIn(z);
    if (dgs.length) sections.push({ id: 'Dungeons', label: 'Dungeons', dungeons: dgs });
    const nodes = nodesIn(z);
    if (nodes.length) {
      const pins = nodes.flatMap((n) => n.coords.map(([x, y]) => ({ x, y, type: n.type, label: n.name, href: pageHref(n.name) })));
      sections.push({
        id: 'Gathering', label: 'Gathering',
        nodes: nodes.map(({ name, profession, req, coords }) => ({ name, profession, req, spawns: coords.length })),
        map: zoneMap({ zone: z, pins, caption: `${plural(pins.length, 'spawn point')} of ${plural(nodes.length, 'node')}.` }),
      });
    }
    const quests = z.area_id != null ? require('./quests').questListFor(z.area_id) : null;
    if (quests) sections.push({ id: 'Quests', label: 'Quests', quests });
    sections.push({ id: 'Sources', label: 'Sources', source: true });
    return {
      title: zonePageTitle(z),
      component: require('../pages/ZonePage.vue'),
      props: {
        zone: {
          name: z.name, kind: z.kind, kindLabel: cap(KIND[z.kind]), area_id: z.area_id, ui_map_id: z.ui_map_id, new_in_forever: z.new_in_forever,
          continent: continent ? zonePageTitle(continent) : null,
          parent: parent ? zonePageTitle(parent) : null,
          zoneCount: z.kind === 'continent' ? of('zone', z.name).length : null,
          cityCount: z.kind === 'continent' ? of('city').filter((c) => continentOf(c) === z).length : null,
        },
        sections, source,
      },
    };
  }

  const list = {
    title: 'Zones',
    component: require('../pages/ZonesList.vue'),
    props: {
      counts: { zone: of('zone').length, city: of('city').length, battleground: of('battleground').length, continent: continents.length },
      fresh: zones.filter((z) => z.new_in_forever).sort(byName).map(zonePageTitle),
      sections: [
        ...continents.map((c) => ({ id: c.name.replace(/ /g, '_'), label: c.name, intro: `${of('zone', c.name).length} zones. Cities and battlegrounds are listed further down.`, gallery: gallery(of('zone', c.name)) })),
        ...(elsewhere.length ? [{ id: 'Islands', label: 'Islands', intro: "Zones that are not part of either continent's map.", gallery: gallery(elsewhere) }] : []),
        { id: 'Cities', label: 'Cities', gallery: gallery(of('city'), (z) => continentOf(z)?.name || '') },
        { id: 'Battlegrounds', label: 'Battlegrounds', gallery: gallery(of('battleground'), (z) => parentOf(z)?.name || '') },
        { id: 'Continents', label: 'Continents', gallery: gallery(continents) },
      ],
      source,
    },
  };
  return [list, ...zones.map(zonePage)];
}

module.exports = { pages };
