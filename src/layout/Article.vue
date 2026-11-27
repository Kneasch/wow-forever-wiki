<!--
  An article page: the Layout with the page tabs, title and byline. The default slot is the article body.
    <Article title="Copper Vein" tab="Object"> ... </Article>
-->
<template>
  <Layout>
    <nav class="tabs" aria-label="Page">
      <ul class="tabs-left">
        <li class="selected"><a :href="self">{{ tab }}</a></li>
        <li><a href="#">Discussion</a></li>
      </ul>
      <ul class="tabs-right">
        <li class="selected"><a :href="self">Read</a></li>
      </ul>
      <form class="search" role="search" action="#"><input type="search" name="q" placeholder="Search the wiki" aria-label="Search the wiki"></form>
    </nav>

    <main id="content">
      <h1 class="page-title">{{ title }}</h1>
      <p class="byline">From the WoW Forever Wiki</p>
      <slot />
    </main>
  </Layout>
</template>

<script>
const { pageHref } = require('../lib/wiki');

export default {
  components: { Layout: require('./Layout.vue') },
  props: { title: { type: String, required: true }, tab: { type: String, required: true } },
  computed: { self() { return pageHref(this.title); } },
};
</script>
