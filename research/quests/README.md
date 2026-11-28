# Quest research

Research data for the quest pages. `src/data/quests.js` turns it into pages. The plan, sources and the order zones are
being done in are in [docs/quests-plan.md](../../docs/quests-plan.md).

| File | What it holds |
|---|---|
| `index.json` | Regions in the order they are being done, each with its zones: `key`, `name`, `area_id`, and `file` (the zone's research file, or `null` while not fetched). |
| `desolace.json` | Desolace: 88 quests (all with full page data), 30 related quests, 5 placeholders. |

## Commands

```bash
NODE_USE_ENV_PROXY=1 node scripts/fetch-quests.js desolace   # refresh a zone (NODE_USE_ENV_PROXY only behind a proxy)
```

The script needs the zone page in `.cache/quests/zone-<area id>.html` and reads any `quest-<id>.html` saved there. Only
with `--pages` does it load missing pages itself through Playwright; see the plan before using it.

## Zone file shape

Top level: `zone, area_id, source, fetched, quests[], related[], skipped[]`.

- `quests[]`: quests Wowhead files under the zone, sorted by level.
  - `basis`: `"page"` (from the Wowhead quest page) or `"tooltip"` (zone list + tooltip API only; the fields below marked
    *page* are `null`).
  - From the zone list: `quest_id, name, level, required_level, side` (`Alliance`, `Horde`, `Both` or `null`), `xp`,
    `rewards.money`.
  - From the tooltip API or page: `objective` (the one-line goal), `objectives[]` (`{ text, quantity, type?, id? }`;
    `quantity` is a count or a reputation standing such as `"Friendly"`).
  - *page*: `side_label` (Wowhead's own word, e.g. "None"), `type`, `start` and `end` (`{ type: npc|object|item, id, name }`),
    `sharable`, `difficulty` (`{ red, orange, yellow, green, grey }` levels), `patch`, `patch_label`, `new_in_forever`
    (patch 1.60 or later), `provided[]`, `description`, `progress`, `completion`, `rewards.choice[]`, `rewards.items[]`,
    `rewards.spells[]` (`{ type, id, name, icon, quality, count }`), `reputation[]` (`{ faction_id, faction, amount }`),
    `other_gains[]`, `series` (steps in order, each a list of `{ quest_id, name, side, current? }`).
  - Hand-written, kept by the script: `notes`, `walkthrough`.
- `related[]`: quests on the zone's Wowhead list that are filed elsewhere (`category_id`), with the zone list fields only.
- `skipped[]`: placeholder quests (`<UNUSED>`, `<nyi>`).
