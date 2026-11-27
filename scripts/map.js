// Zone maps with pins, for generated pages.
//
//   const { zoneMap } = require('./map');
//   zoneMap({ zoneId: 12, pins: [{ x: 45.3, y: 65.6, type: 'mining', label: 'Copper Vein' }] })
//
// zoneId is the area ID that Wowhead object tooltips give as map.zone (and fetch-professions.js stores as
// zone_id). x and y are Wowhead's map coordinates: percentages (0-100) of the zone map, x right, y down.
// Map images and sizes come from research/maps/zones.json, written by scripts/fetch-maps.py.
//
// Output is static HTML (no JavaScript): an <img> of the zone with an SVG layer of pins on top, and a legend
// whose checkboxes show or hide each pin type with CSS. Each pin has a hover title with its coordinates.
// Zones without a map image (dungeons, or zones not fetched yet) get a plain 0-100 grid instead.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'research', 'maps', 'zones.json'), 'utf8'));
const byArea = new Map(MAPS.zones.filter((z) => z.area_id != null).map((z) => [z.area_id, z]));

// Pin types. The icon is the symbol of the same name in site/assets/map-pins.svg, and the colour is the
// --pin-<type> variable in site/assets/wiki.css.
const PIN_TYPES = {
  mining: { label: 'Mining node' },
  herbalism: { label: 'Herb' },
  fishing: { label: 'Fishing pool' },
  skinning: { label: 'Skinnable creature' },
  treasure: { label: 'Treasure chest' },
  other: { label: 'Other' },
};
const SPRITE = '/assets/map-pins.svg';
// Above this many pins a map switches from pin icons to small dots, so dense zones stay readable.
const DENSE = 60;
const GRID = { width: 1002, height: 668 }; // same 3:2 shape as the game's zone maps

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (n) => +n.toFixed(1);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const zoneInfo = (zoneId) => byArea.get(Number(zoneId)) || null;
const hasImage = (z) => !!z && fs.existsSync(path.join(ROOT, 'site', z.image));
// Every map with an image has a page (scripts/gen-zones.js), titled with the map's name
const zonePageTitle = (z) => z.name;
// The zone page for an area ID, for linking from other generators; null when there is none
const zonePageFor = (zoneId) => { const z = zoneInfo(zoneId); return hasImage(z) ? zonePageTitle(z) : null; };

// A legend icon: the pin symbol on its own
const pinIcon = (type) => `<svg class="pin-icon pin-${type}" viewBox="0 0 24 32" width="15" height="20" aria-hidden="true"><use href="${SPRITE}#pin-${type}"/></svg>`;

/**
 * @param {object}   o
 * @param {number}  [o.zoneId]    area ID (Wowhead's zone ID)
 * @param {object}  [o.zone]      a zones.json entry, instead of zoneId (continents have no area ID)
 * @param {string}  [o.zoneName]  shown when the zone is not in zones.json
 * @param {Array<{x:number,y:number,type:string,label?:string,href?:string}>} [o.pins]
 *                                With no pins, the map is drawn on its own (no legend), if it has an image
 * @param {string}  [o.caption]   replaces the default "N spawn points in Zone" sentence
 * @param {boolean} [o.dense]     force dots (true) or pins (false); default: more than DENSE pins
 */
function zoneMap({ zoneId, zone: given, zoneName, pins = [], caption, dense }) {
  for (const p of pins) {
    if (!PIN_TYPES[p.type]) throw new Error(`unknown map pin type "${p.type}" (known: ${Object.keys(PIN_TYPES).join(', ')})`);
  }
  const zone = given || zoneInfo(zoneId);
  const name = zone?.name || zoneName || 'an unknown zone';
  const image = hasImage(zone);
  if (!pins.length && !image) return '';
  const { width: W, height: H } = image ? zone : GRID;
  const asDots = dense ?? pins.length > DENSE;
  // Pins are sized in map pixels (30 px wide on a 1002 px map) so they scale with the image: about 19 px
  // on screen at the usual 40rem width. Dots for dense maps are 4.5 px in radius.
  const pw = W * 0.03, ph = pw * (32 / 24), r = W * 0.0045;

  const marks = pins.map((p) => {
    const x = (p.x / 100) * W, y = (p.y / 100) * H;
    const title = `<title>${esc(p.label ? `${p.label} ` : '')}(${num(p.x)}, ${num(p.y)})</title>`;
    const shape = asDots
      ? `<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}"/>`
      : `<use href="${SPRITE}#pin-${p.type}" x="${num(x - pw / 2)}" y="${num(y - ph)}" width="${num(pw)}" height="${num(ph)}"/>`;
    const mark = `<g class="pin pin-${p.type}">${title}${shape}</g>`;
    return p.href ? `<a href="${esc(p.href)}">${mark}</a>` : mark;
  });

  const grid = image ? '' : [10, 20, 30, 40, 50, 60, 70, 80, 90]
    .map((g) => `<line class="grid" x1="${num(g * W / 100)}" y1="0" x2="${num(g * W / 100)}" y2="${H}"/><line class="grid" x1="0" y1="${num(g * H / 100)}" x2="${W}" y2="${num(g * H / 100)}"/>`).join('');

  // One legend entry per type on this map. With more than one type, each gets a checkbox that hides its pins.
  const counts = new Map();
  for (const p of pins) counts.set(p.type, (counts.get(p.type) || 0) + 1);
  const toggles = counts.size > 1;
  const legend = [...counts].map(([t, n]) => `<li><label>${toggles ? `<input type="checkbox" value="${t}" checked> ` : ''}${pinIcon(t)} ${esc(PIN_TYPES[t].label)} (${n})</label></li>`).join('');

  const what = caption ?? `${plural(pins.length, 'spawn point')} in ${esc(name)}.`;
  const hover = pins.length ? ' Hover a point for its coordinates.' : '';
  const source = image
    ? `Map from the WoW Forever game client${zone.new_in_forever ? ' (a zone new in Forever)' : ''}.`
    : `${esc(name)} has no map image yet, so the points are on the zone's 0&ndash;100 coordinate grid (lines every 10).`;

  return `    <figure class="zone-map${asDots ? ' dense' : ''}${image ? '' : ' no-image'}">
      <div class="zone-map-frame" style="aspect-ratio: ${W} / ${H}">
        ${image ? `<img src="${esc(zone.image)}" alt="Map of ${esc(name)}" width="${W}" height="${H}" loading="lazy" decoding="async">` : ''}
        ${pins.length ? `<svg class="zone-map-pins" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${plural(pins.length, 'point')} on the map of ${name}`)}">${grid}${marks.join('')}</svg>` : ''}
      </div>
      <figcaption>
        ${legend ? `<ul class="zone-map-legend">${legend}</ul>\n        ` : ''}${what}${hover} ${source}
      </figcaption>
    </figure>`;
}

module.exports = { zoneMap, zoneInfo, zonePageTitle, zonePageFor, PIN_TYPES, MAPS };
