// Builders for the JSON page model that src/pages/Doc.vue renders. Data modules (src/data) describe pages
// with these, and never write HTML.
//
// Inline content ("segs") is an array of segments, rendered by src/components/Rich.vue:
//   'plain text'
//   { link: 'Page title', cls?, text? }     wiki link (text defaults to the title)
//   { ext: 'https://…', text }              external link
//   { b: 'text' }                           bold
//   { q: 'rare', text }                     text in an item quality colour
//   { icon: 'inv_ore_copper_01' }           18px item icon
//   { tag: 'New in Forever' }               small green tag
//   { unknown: true | 'text' }              "?" (or the text) in the not-known-yet style
//   { skill: 75 }                           skill-up colour bar for a required skill
//
// A page: { title, tab, infobox?, intro: [block], toc: bool, sections: [{ id, label, blocks: [block] }] }
// Blocks, rendered by src/components/Blocks.vue:
//   { p: segs }                             paragraph
//   { ul: [segs] }, { ol: [segs] }          lists
//   { h3: segs, id? }                       sub-heading
//   { table: { head: [text], rows: [[cell]], cls? } }   cell: { segs, cls?, title? }
//   { map: zoneMap(...) }                   zone map with pins (src/lib/maps.js)
//   { key: 'skill' | 'rarity' }             colour keys
//   { tooltip: [line] }                     item tooltip (src/components/Tooltip.vue)
// Infobox: { name, image?, rows: [{ th, segs } | { sub: 'Database' }] }
//   image: { cls, label, src | null, placeholder? }
const { isBlank } = require('./wiki');

const link = (to, cls, text) => ({ link: to, ...(cls ? { cls } : {}), ...(text != null ? { text: String(text) } : {}) });
const ext = (url, text) => ({ ext: url, text: String(text) });
const b = (text) => ({ b: String(text) });
const q = (quality, text) => ({ q: quality, text: String(text) });
const icon = (name) => ({ icon: name });
const tag = (text) => ({ tag: text });
const unknown = (text = true) => ({ unknown: text });
const skill = (req) => ({ skill: req });

// A value, or "?" when it is missing
const val = (v) => (isBlank(v) ? [unknown()] : [String(v)]);
// Segment lists joined with a separator: join([[a], [b, c]]) -> [a, ', ', b, c]
const join = (parts, sep = ', ') => parts.flatMap((p, i) => (i ? [sep, ...p] : p));
// "a, b and c" for segment lists
const andList = (parts) => (parts.length < 2 ? parts.flat() : [...join(parts.slice(0, -1)), ' and ', ...parts[parts.length - 1]]);
const cell = (segs, cls, title) => ({ segs: [].concat(segs), ...(cls ? { cls } : {}), ...(title ? { title } : {}) });
const table = (head, rows, cls = 'wikitable') => ({ table: { head, rows, cls } });
const section = (id, label, blocks) => ({ id, label, blocks: blocks.filter(Boolean) });

module.exports = { link, ext, b, q, icon, tag, unknown, skill, val, join, andList, cell, table, section };
