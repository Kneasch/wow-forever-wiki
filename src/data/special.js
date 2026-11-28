// Pages about the wiki itself: Search (results are filled in by site/assets/search.js) and About the wiki, which
// explains that the wiki is read-only for now.
const D = require('../lib/doc');

function pages() {
  // Counted from the other sources (required here, not at the top: render.js requires this file)
  const { collectPages } = require('../build/render');
  const count = collectPages({ sources: ['zones', 'professions', 'dungeons', 'quests'] }).length;
  return [
    { title: 'Search', component: require('../pages/SearchPage.vue'), props: { count: count.toLocaleString('en-GB') }, search: false },
    {
      title: 'About the wiki',
      component: require('../pages/Doc.vue'),
      props: {
        title: 'About the wiki', tab: 'Project page', toc: true,
        intro: [{ p: [D.b('The WoW Forever Wiki'), ' is an unofficial fan wiki for World of Warcraft Forever. Every page is generated from research data: dungeon loot, professions, zone maps and quests.'] }],
        sections: [
          D.section('Read-only', 'Read-only for now', [
            { p: ['The wiki is read-only while its first pages are built from research data. These are switched off until it opens for editing:'] },
            { ul: [['Accounts: logging in and creating an account'], ['Editing pages, page history and recent changes'], ['Discussion pages and comments']] },
            { p: ['Search works: type in the box at the top of any page, or use the ', D.link('Search'), ' page.'] },
          ]),
          D.section('Sources', 'Where the data comes from', [
            { ul: [
              ['Items, objects and quests: ', D.ext('https://www.wowhead.com/forever', 'Wowhead Forever'), ', read from its tooltip data and pages.'],
              ['Zone maps: the WoW Forever game client\'s own world maps.'],
              ['Drop rates are rounded approximations of Wowhead\'s figures.'],
            ] },
          ]),
          D.section('Disclaimers', 'Disclaimers', [
            { p: ['World of Warcraft is a trademark of Blizzard Entertainment. This wiki is not made by or affiliated with Blizzard Entertainment or Wowhead. Game data can be out of date or wrong: check in game before relying on it.'] },
          ]),
          D.section('Privacy', 'Privacy', [
            { p: ['The wiki has no accounts, adverts or tracking. Your browser remembers your colour theme (light, dark or auto) in its local storage, and nothing else is stored. Search runs in your browser: what you type is not sent anywhere.'] },
          ]),
        ],
      },
    },
  ];
}

module.exports = { pages };
