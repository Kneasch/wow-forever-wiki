// Class pages from research/classes/*.json, as JSON page models for src/pages/Doc.vue:
//   Classes   hub listing every class (research/classes/index.json); classes without a research file are not written yet
//   <Class>   e.g. Warlock: every ability by the level it is first learned, with talent abilities marked,
//             the talent abilities by tree, and what Forever changed
// Spell data comes from scripts/fetch-classes.js (Wowhead Forever tooltip API) plus hand-written fields
// (tab, talent row, notes). See research/classes/README.md.
const fs = require('fs');
const path = require('path');
const { json, ROOT } = require('./research');
const { wowhead, plural } = require('../lib/wiki');
const D = require('../lib/doc');

const Doc = () => require('../pages/Doc.vue');
const iconExists = (name) => !!name && fs.existsSync(path.join(ROOT, 'site', 'assets', 'icons', name + '.jpg'));
const iconSeg = (name) => (iconExists(name) ? [D.icon(name)] : []);
const newTag = (a) => (a.new_in_forever ? [D.tag('New in Forever')] : []);
// The ability's name with its icon, linked to its Wowhead Forever spell
const spellSegs = (a) => [...iconSeg(a.icon), D.ext(wowhead('spell', a.spell_id), a.name), ...newTag(a)];
const byLevel = (a, b) => a.level - b.level || a.name.localeCompare(b.name);
const ROW_WORD = (row) => `row ${row}`;

function classPage(c, idx) {
  const C = c.class;
  const abilities = [...c.abilities].sort(byLevel);
  const talents = abilities.filter((a) => a.talent);
  const levels = [...new Set(abilities.map((a) => a.level))];
  const howLearned = (a) => (a.talent
    ? D.cell([D.b('Talent'), ` (${a.talent.tree}, ${ROW_WORD(a.talent.row)})`], 'talent')
    : D.cell(['Trainer']));
  const castLine = (a) => [a.cost, a.cast, a.cooldown, a.reagent && `Reagent: ${a.reagent}`].filter(Boolean).join(' · ');

  return {
    title: C,
    component: Doc(),
    props: {
      title: C, tab: 'Class', toc: true,
      infobox: {
        name: C,
        image: { cls: 'item-icon', label: `${C} icon`, src: iconExists(c.icon) ? `/assets/icons/${c.icon}.jpg` : null },
        rows: [
          { th: 'Role', segs: [idx.role] },
          { th: 'Talent trees', segs: D.join(c.trees.map((t) => [...iconSeg(t.icon), t.name])) },
          { th: 'Abilities', segs: [`${abilities.length}, of which ${plural(talents.length, 'is a talent', 'are talents')}`] },
          { th: 'First ability', segs: ['Level 1'] },
          { th: 'Last new ability', segs: [`Level ${levels[levels.length - 1]}`] },
        ],
      },
      intro: [
        { p: [D.b(C), ' is a ', D.link('Classes', null, 'class'), ` in WoW Forever. ${c.summary}`] },
        { p: ['This page is a simple overview of the abilities a ', C, ' gets and the level each is first available at. Abilities that come from the talent trees rather than a class trainer are marked ', D.b('Talent'), '.'] },
      ],
      sections: [
        D.section('Abilities_by_level', 'Abilities by level', [
          { p: [`Each ability is listed once, at the level its first rank is learned. Later ranks are trained as you level and are not listed. Talent abilities are listed at the first level their talent row can be reached.`] },
          D.table(['Level', 'Ability', 'Tree', 'Learned from', 'Description'], abilities.map((a) => [
            D.cell([String(a.level)], 'num'),
            D.cell(spellSegs(a)),
            D.cell([a.tab]),
            howLearned(a),
            D.cell([a.summary || '', ...(a.note ? [' ', D.b('Note:'), ` ${a.note}`] : [])]),
          ])),
        ]),
        D.section('Talent_abilities', 'Abilities from talents', [
          { p: [`These abilities are not taught by a trainer: they are learned by spending talent points. ${c.talent_levels_note}`] },
          D.table(['Tree', 'Row', 'Level', 'Ability', 'Cost and cast'], [...talents]
            .sort((a, b) => a.talent.tree.localeCompare(b.talent.tree) || a.talent.row - b.talent.row)
            .map((a) => [
              D.cell([...iconSeg(c.trees.find((t) => t.name === a.talent.tree)?.icon), a.talent.tree]),
              D.cell([String(a.talent.row)], 'num'),
              D.cell([String(a.level)], 'num'),
              D.cell(spellSegs(a)),
              D.cell([castLine(a) || '–']),
            ])),
          (c.passive_talents || []).length && { p: ['Passive talents are not abilities and are left out of the tables, apart from these new ones:'] },
          (c.passive_talents || []).length && { ul: c.passive_talents.map((t) => [...spellSegs(t), ` (${t.tree}, ${ROW_WORD(t.row)}, level ${t.level}): ${t.note}`]) },
        ]),
        D.section('Changes', 'Changes in Forever', [{ ul: c.changes.map((x) => [x]) }]),
        D.section('Research_notes', 'Research notes', [
          ...(c.conflicts.length ? [{ p: ['Where sources disagree:'] }, { ul: c.conflicts.map((x) => [x]) }] : [{ p: ['No sources disagreed.'] }]),
          { p: ['Not researched yet:'] }, { ul: c.gaps.map((g) => [g]) },
        ]),
        D.section('Sources', 'Sources', [{ ul: c.sources.map((s) => [D.ext(s.url, s.name), ...(s.used_for ? [` – ${s.used_for}`] : [])]) }]),
      ],
    },
  };
}

function hub(index, written) {
  return {
    title: 'Classes',
    component: Doc(),
    props: {
      title: 'Classes', tab: 'Guide',
      intro: [{ p: [D.b('Classes'), ' decide which abilities, armour and roles a character has. WoW Forever has the nine classes of Classic. Each class page lists its abilities by the level they are learned, with the ones that come from talents marked.'] }],
      sections: [D.section('List', 'List of classes', [
        D.table(['Class', 'Role', 'Summary'], index.classes.map((x) => [
          D.cell([...iconSeg(x.icon), ...(written.has(x.name) ? [D.link(x.name)] : [x.name, ' ', D.unknown('(page not written yet)')])]),
          D.cell([x.role]),
          D.cell([x.summary]),
        ])),
      ])],
    },
  };
}

function pages() {
  const index = json('classes/index.json');
  const written = index.classes.filter((x) => x.file);
  return [hub(index, new Set(written.map((x) => x.name))), ...written.map((x) => classPage(json(`classes/${x.file}`), x))];
}

module.exports = { pages };
