<!--
  The left panel. An entry with no `href` is shown greyed out with its reason: features that need accounts while the
  wiki is read-only, and hubs that are not written yet.
-->
<template>
  <aside id="site-panel">
    <a class="wordmark" href="/" aria-label="WoW Forever Wiki home">
      <span class="wordmark-top">WoW Forever</span>
      <span class="wordmark-bottom">Wiki</span>
    </a>
    <nav aria-label="Site">
      <template v-for="g in groups" :key="g.title">
        <h3>{{ g.title }}</h3>
        <ul>
          <li v-for="l in g.links" :key="l.label">
            <a v-if="l.href" :href="l.href">{{ l.label }}</a>
            <span v-else class="nav-disabled" :title="l.why">{{ l.label }}</span>
          </li>
        </ul>
      </template>
    </nav>
  </aside>
</template>

<script>
const READ_ONLY = 'Not available while the wiki is read-only';
const NOT_YET = 'Not written yet';

export default {
  data: () => ({
    groups: [
      { title: 'Navigation', links: [
        { label: 'Main page', href: '/' },
        { label: 'Search', href: '/w/Search' },
        { label: 'Random page', href: '/w/Search?random' },
        { label: 'Recent changes', why: READ_ONLY },
      ] },
      { title: 'Database', links: [
        { label: 'Items', why: NOT_YET },
        { label: 'NPCs', why: NOT_YET },
        { label: 'Quests', href: '/w/Quests' },
        { label: 'Zones', href: '/w/Zones' },
        { label: 'Dungeons & raids', href: '/#Dungeons' },
      ] },
      { title: 'Guides', links: [
        { label: 'Classes', why: NOT_YET },
        { label: 'Professions', href: '/w/Professions' },
        { label: 'Reputation', why: NOT_YET },
      ] },
      { title: 'Community', links: [
        { label: 'About the wiki', href: '/w/About_the_wiki' },
        { label: 'Style guide', why: READ_ONLY },
      ] },
    ],
  }),
};
</script>
