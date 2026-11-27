// The main page and the 404 page.
const { json, dungeonFiles } = require('./research');

const NUMBERS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

function pages() {
  const dungeons = dungeonFiles().map((f) => json(f)).sort((a, b) => a.order - b.order).map((d) => ({
    order: d.order,
    name: d.dungeon,
    levels: (d.recommended_level_range || d.level_range).replace(/-/g, '–'),
    // "Orgrimmar (Durotar)" and "Ironforge / Dun Morogh" are shown by their first zone
    zone: d.zone.split(/ \(| \//)[0],
    new_in_forever: !!d.new_in_forever,
  }));
  const fresh = dungeons.filter((d) => d.new_in_forever).length;
  return [
    {
      file: 'index.html', url: '/', title: 'Main page', docTitle: 'WoW Forever Wiki',
      component: require('../pages/Home.vue'),
      props: { dungeons, newCount: NUMBERS[fresh] || String(fresh) },
    },
    {
      file: '404.html', url: '/404.html', title: 'Page not found', docTitle: 'Page not found - WoW Forever Wiki',
      component: require('../pages/NotFound.vue'),
      props: {},
    },
  ];
}

module.exports = { pages };
