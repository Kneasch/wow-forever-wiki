# Profession research

Research data for the profession pages. `src/data/professions.js` turns it into pages. The plan for covering every
profession is in [docs/professions-plan.md](../../docs/professions-plan.md).

| File | What it holds |
|---|---|
| `index.json` | Every profession, grouped as gathering, production or secondary, for the Professions hub. `file` points at the profession's research file, or is `null` while its pages are not written. |
| `mining.json` | Mining: ranks, nodes, materials, smelting, camp features, sources, conflicts and gaps. |

## Commands

```bash
NODE_USE_ENV_PROXY=1 node scripts/fetch-professions.js     # refresh every file from Wowhead (NODE_USE_ENV_PROXY only behind a proxy)
node scripts/fetch-professions.js research/professions/mining.json
npm run dev                                                # see the pages live while editing
```

## Where the data comes from

The fetch script fills these fields from the Wowhead Forever tooltip API (`https://nether.wowhead.com/forever/tooltip/<type>/<id>`),
the same endpoint the dungeon research uses. Each type is authoritative only for the fields below. Everything else in a file is
written by hand and the script leaves it alone.

| Section | Endpoint | Fields it writes |
|---|---|---|
| `nodes[]` | `object/<id>` | `name`, `required_skill`, `zone_id`, `zone`, `zone_level`, `spawn_count`, `coords` |
| `materials[]` | `item/<id>` | `name`, `quality`, `icon`, `item_level`, `sell_price`, `max_stack`, `dropped_by` |
| `recipes[]` | `spell/<id>` | `name`, `icon`, `reagents[]`, `creates`, `description` |
| `camp[]` | `item/<blueprint id>` | `blueprint`, `name`, `required_skill`, `blueprint_source`, `effect`, `build_reagents[]` |

Limits of the tooltip API, which decide what has to be researched by hand:

- **Object tooltips map only one zone,** the one where that object spawns most. A node such as Copper Vein is several objects
  (1731, 2055, 3763, 103713), so listing every object gives a fuller zone list, but zones with only a few spawns can still be
  missing. The full list is on `www.wowhead.com/forever/object=<id>`, which needs a browser.
- **Object tooltips do not say what a node contains.** `contains` (item IDs) is hand-written. In `mining.json` it holds the
  Classic ore and stone; `nodes_contents_basis` says so on every page that shows it.
- **Spell tooltips do not give the skill a recipe needs.** `required_skill` on recipes is hand-written, and `skill_basis`
  records where it came from (`classic` = the Classic value, not yet confirmed for Forever).
- **There is no search.** New Forever items and objects were found by reading tooltips across ID ranges: items 248000-290500
  and objects 650000-662000. Forever's new objects seem to sit between about 610000 and 705000; only 650000-662000 has been read
  in full.

Coordinates are the zone map percentages (0-100) Wowhead gives. Pages pin them on the zone's map; see [research/maps](../maps/README.md).

## Mining file shape

Top level: `profession, kind, game_version, icon, summary, ranks[], tools[], abilities[], nodes[], nodes_contents_basis,
materials[], recipes[], recipes_unresearched[], camp[], other_items[], skill_up_rule, sources[], conflicts[], gaps[], fetched`.

- `nodes[]`: `{ object_id, contains: [item_id], variant: null|"ooze", new_in_forever? }` plus the fetched fields.
  Objects with the same name share one page.
- `materials[]`: `{ item_id, kind: ore|stone|gem|bar|tool, new_in_forever?, note? }` plus the fetched fields. Every material
  gets an item page.
- `recipes[]`: `{ spell_id, required_skill, skill_basis }` plus the fetched fields.
- `recipes_unresearched[]`: recipes that guides describe but whose spell is not on the tooltip API yet:
  `{ name, required_skill, reagent_item_ids, creates_item_id, note }`.
- `camp[]`: `{ blueprint_item_id, placed_item_id, kind: blueprint|item, note?, effect_note? }` plus the fetched fields.
  `effect_note` replaces the fetched effect when Wowhead's text is broken (the Lodestone's bonus does not render).

A page title must not also be a dungeon item: the build (`collectPages()` in `src/build/render.js`) stops with an error
when two page sources would write the same page.
