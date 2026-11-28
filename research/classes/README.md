# Class research

One file per class (`warlock.json`), plus `index.json`, the list of classes for the Classes hub. `src/data/classes.js`
turns them into pages: the hub, and a page per class that has a file.

## Where the data comes from

- **Spell data**: the Wowhead Forever tooltip API (`nether.wowhead.com/forever/tooltip/spell/<id>`), via
  `NODE_USE_ENV_PROXY=1 node scripts/fetch-classes.js`. It writes `name`, `icon`, `level`, `tooltip_level`, `is_talent`,
  `cost`, `cast`, `cooldown`, `reagent`, `text` and `summary` (the first sentence of `text`), and downloads the icons.
  Numbers in the text are rank 1 values.
- **Hand-written**: `spell_id` (the first rank), `tab` (the spellbook tab), `talent: { tree, row }` for abilities that
  come from a talent, `note` and `new_in_forever`. A refresh never changes them.
- Wowhead's list pages (`www.wowhead.com/forever/spells/...`) refuse plain HTTP clients, so the spell list itself is
  hand-made: Classic's Warlock spells checked one by one against the Forever tooltips (Curse of Shadow and Dark Pact
  return nothing, so they are left out), plus the new Forever spells. IDs of the new spells come from fan guides
  (listed in `sources`) and are each confirmed on the tooltip API.

## Levels

- A trained ability's `level` is its tooltip's "Requires level".
- A talent ability's `level` is the level its talent row opens: 10 + 5 × (row − 1). Many talent tooltips have no level
  or "Requires level 1"; where they do have one (Siphon Life, Shadowburn, Conflagrate, Wrack, Incinerate) it matches.
  The script warns when a spell marked as a talent is not a talent on Wowhead, or the other way round.

## Warlock

55 abilities: 44 trained and 11 from talents. Talent rows come from wowforevertalent.com. Not covered yet: demon pet
abilities, later ranks, quest-learned spells and passive talents (see `gaps` in the file).
