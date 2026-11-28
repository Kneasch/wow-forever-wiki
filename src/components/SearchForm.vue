<!--
  The search box in the tab bar. Without JavaScript it submits to the Search page (?q=...); site/assets/search.js adds
  suggestions as you type and goes straight to a page whose title matches exactly.
-->
<template>
  <form class="search" role="search" action="/w/Search" data-search>
    <input type="search" name="q" placeholder="Search the wiki" aria-label="Search the wiki" autocomplete="off" spellcheck="false">
  </form>
</template>

<script>
export default {};
</script>
