<!--
  Every page's frame: skip link, header, sidebar, then the page column with the content and footer.
  The document <head> (stylesheet, theme script, <title>) is written by src/build/render.js.
-->
<template>
  <SiteHeader />
  <SiteSidebar />
  <div id="page">
    <slot />
    <SiteFooter />
  </div>
</template>

<script>
export default {
  components: {
    SiteHeader: require('./SiteHeader.vue'),
    SiteSidebar: require('./SiteSidebar.vue'),
    SiteFooter: require('./SiteFooter.vue'),
  },
};
</script>
