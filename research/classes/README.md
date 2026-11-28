# Class research

One file per class (`warlock.json`), plus `index.json`, the list of classes for the Classes hub. `src/data/classes.js`
turns them into pages: the hub, and a page per class that has a file.

## Where the data comes from

- **Spell data**: the Wowhead Forever tooltip API (`nether.wowhead.com/forever/tooltip/spell/<id>`), via
  `NODE_USE_ENV_PROXY=1 node scripts/fetch-classes.js`. It writes `name`, `icon`, `level`, `tooltip_level`, `is_talent`,
  `cost`, `cast`, `cooldown`, `reagent`, `text` and `summary` (the first sentence of `text`), and downloads the icons.
  Numbers in the text are rank 1 values.
- **Hand-written**: `spell_id` (the first rank; `later_rank: true` when Wowhead has no first rank and this is the lowest one found), `tab` (the spellbook tab), `talent: { tree, row }` for abilities that
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

Where a talent ability's tooltip gives a different level (Stormstrike, Penance, Repentance, ...), the page lists it at
the row's level and shows the tooltip's level next to it. Either can be out of date.

## Text

Wowhead leaves some tooltip text unevaluated. The script drops talent clauses (`[Improved Fire Ward: ...]`, keeping the
text after ` / ` when there is one) and evaluates formulas at their base value, with stat terms (spell power, attack
power, healing) at 0, so the numbers are what a character with no gear sees.

## Classes

All nine classes have a file. Warlock was researched by hand; the other eight were researched the same way, each
noting its own conflicts and gaps in the file. Not covered for any class yet: pet abilities, later ranks, which spells
are learned from quests, and most passive talents.
