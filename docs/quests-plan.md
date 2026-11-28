# Quests: research and implementation plan

How the wiki will cover WoW Forever's quests: one zone at a time, region by region, starting with Desolace. Desolace is
built in the same PR as this plan as the worked example. Everything below about Desolace describes what exists now; the
rest is the plan.

Research was done in November 2026 against Wowhead Forever.

## 1. What a quest page shows

The layout follows the [OSRS Wiki's quest pages](https://oldschool.runescape.wiki/w/Druidic_Ritual): an infobox, a
"Details" box, a walkthrough, rewards, and what the quest leads to. Mapped onto WoW:

| OSRS Wiki | WoW Forever Wiki | Data |
|---|---|---|
| Infobox Quest (number, release, members, series) | Infobox: zone, level, required level, side, start, end, sharable, series position, new in Forever; quest ID, patch, Wowhead link | zone list + quest page |
| Details: start point, description, requirements, items required, enemies | **Details** table: start point, objective, requirements (level, earlier quest), ends at, items provided; then an **Objectives** list (kills, items, reputation) | quest page, or tooltip |
| Walkthrough | **Quest text** (description, progress, completion) for now; a hand-written `walkthrough` later | quest page |
| Rewards (quest points, XP, items) | **Rewards**: XP at the quest's level, money, reputation, items received, "choose one of" items, spells learned | quest page; XP and money also from the zone list |
| Required for completing / quest series navbox | **Quest series**: every step in order with this quest in bold, then "Previous" and "Next" filtered to the reader's side | quest page's series box |

Each zone also gets a **"<Zone> quests"** list (like the OSRS "Quests/List"): every quest with level, required level, side,
giver, XP and money, then the zone's quest chains, then related quests Wowhead files elsewhere. The **Quests** hub lists
every region and zone with progress, and the zone page links to its quest list.

## 2. Sources

| Source | Gives | Limits |
|---|---|---|
| Zone page, `www.wowhead.com/forever/zone=<id>` (its "Quests" list) | Every quest related to the zone: ID, name, level, required level, side, the category Wowhead files it under, XP, money | One page per zone. Needs a browser. |
| Quest page, `www.wowhead.com/forever/quest=<id>` | Quick Facts (start, end, sharable, difficulty colours, patch added), objectives, description/progress/completion, rewards, reputation, series | Needs a browser, one page per quest |
| Tooltip API, `nether.wowhead.com/forever/tooltip/quest/<id>` | Name, objective sentence, requirement list with counts | No giver, rewards, text or chain |

`www.wowhead.com` refuses plain HTTP clients. The tooltip API is the endpoint the rest of the wiki already uses and can be
read freely. **Decided (November 2026):** the owner approved loading quest pages through a headless browser
(`--pages` in the fetch script), slowly: 3 pages at a time, each page cached in `.cache/quests/` so it is loaded once.
Desolace was about 90 pages. Pages saved by hand from a normal browser into `.cache/quests/` work too.

The alternatives considered were tooltip data only, and an open Classic quest database (cMaNGOS or VMaNGOS
`quest_template`) for the Classic quests. The second was dropped because Forever has changed and added chains
(Desolace's centaur chain gained 92xxx quests).

A quest whose page has not been read has `basis: "tooltip"`: its objective, requirements, XP and money are filled in, and the page
shows "?" for the giver, quest text, item rewards, reputation and series. A tooltip-only quest still gets its series when
another quest's recorded series names it.

**Forever-new quests:** the quest page's "Added in patch" is 1.60 or later for Forever's additions (Classic quests say
1.13.2 "Classic"). New quests sit at IDs 92000-97500 in Desolace.

## 3. Architecture

```
research/quests/index.json      regions in the order they are being done, each zone's area id and research file (or null)
research/quests/<zone>.json     one per zone, written by the fetch script (see research/quests/README.md)
scripts/fetch-quests.js         zone list + tooltip API, + cached or (with --pages) loaded quest pages
src/data/quests.js              Quests hub, <Zone> quests, and one page per quest
```

- **Which quests belong to a zone:** those Wowhead files under it (category = the zone's area id). The zone list also has
  quests filed elsewhere: chains that start in a capital, dungeon quests (Maraudon), class quests, crafting orders and
  quests of the new zone Shen'dralas. These are kept in `related[]`, listed on the zone's quest list, and get their pages
  with their own zone.
- **Titles:** a quest's name is its title. Names several quests share are told apart by side when that works ("Centaur
  Bounty (Horde)"), otherwise numbered by level then ID ("The Corrupter (1)"). The numbering does not use chain order,
  so URLs stay put when chains are filled in later. A quest named like another page (an item, a zone) gets "(quest)".
- **Links:** quests with pages are wiki links, other quests go to Wowhead. NPCs, objects, factions and most reward items
  go to Wowhead until those page types exist; reward items that already have a dungeon item page link to it.
- **Placeholders** (`<UNUSED>`, `<nyi>`) are dropped and kept in `skipped[]`.

## 4. Order of work

| Phase | Region | Zones | Why |
|---|---|---|---|
| 1 | Kalimdor: Desolace and its neighbours | **Desolace** (done: 88 quests), Shen'dralas, Feralas, Stonetalon Mountains, Thousand Needles | Desolace's centaur chain continues into Shen'dralas, a new Forever zone; the neighbours share chains with Desolace |
| 2 | Kalimdor: the rest | Starting zones first, then by level | |
| 3 | Eastern Kingdoms | Starting zones first, then by level, including Riverglades (new) | |
| 4 | Islands | Zephras Isle (new) | |
| 5 | Cities, dungeons, classes | Capital-city chains, dungeon quests on the dungeon pages, class quests | These are the `related[]` quests |

For each zone: add its cached zone page, run `node scripts/fetch-quests.js <key>`, set `file` in `index.json`, check the
pages with `npm run dev` and `npm run check`.

## 5. Later

- **NPC pages** for quest givers, with every quest they start and end. Item pages for quest rewards, through the shared
  item registry proposed in the professions plan (§3).
- **Maps:** pin the giver and the objectives on the zone map. The quest page has the objective pins (`g_mapperData`); the
  giver's location needs the NPC page.
- **Walkthroughs** written by hand in `walkthrough`, kept by the fetch script.
- **Quest chain pages** for long chains (the Desolace centaur chain is 13 steps across two zones).
- **Reputation:** the Magram and Gelkis rewards, now 1,000-6,000 per quest in Forever, deserve a faction page.

## 6. Desolace, as built

- 123 quests on Wowhead's Desolace list: 88 filed under Desolace, 30 related, 5 placeholders.
- Full page data for all 88: 29 are new in Forever (patch 1.60.1), 47 are part of a series, 32 give items (27 with a
  choice of rewards).
- Pages: Quests, Desolace quests and 88 quest pages; the Desolace zone page links its quest list.
- Open: The Corrupter (1) starts from an item (Flayed Demon Skin), which Wowhead's Quick Facts do not name, so its start
  shows "?". Fourteen talk-to and escort quests have no objective list, as on Wowhead. The centaur chain's Horde steps
  are in Shen'dralas, so they link to Wowhead until that zone is done.
