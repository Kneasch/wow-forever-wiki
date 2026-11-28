<!--
  The Search page (/w/Search?q=...). The results are listed by site/assets/search.js from /search-index.json, which
  the build writes; without JavaScript the page says so and points at the hubs.
-->
<template>
  <Article title="Search" tab="Special page">
    <form class="search-page-form" role="search" action="/w/Search">
      <input type="search" name="q" placeholder="Search page titles" aria-label="Search the wiki" autocomplete="off" spellcheck="false" data-search-page>
      <button type="submit">Search</button>
    </form>
    <p class="search-status" data-search-status>Type a page title: a dungeon, boss, item, quest, zone or profession.</p>
    <ol class="search-results" data-search-results></ol>
    <noscript>
      <p>Search runs in your browser and needs JavaScript. Without it, browse from the <a href="/">main page</a>,
        <a href="/w/Zones">Zones</a>, <a href="/w/Quests">Quests</a> or <a href="/w/Professions">Professions</a>.</p>
    </noscript>
    <p class="search-about">Search matches page titles ({{ count }} pages). Pressing Enter in the search box at the top goes
      straight to a page whose title matches exactly.</p>
  </Article>
</template>

<script>
export default { props: { count: { type: String, required: true } } };
</script>
