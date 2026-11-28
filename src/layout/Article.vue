<!--
  An article page: the Layout with the page tabs, title and byline. The default slot is the article body.
    <Article title="Copper Vein" tab="Object"> ... </Article>
-->
<template>
  <Layout>
    <nav class="tabs" aria-label="Page">
      <ul class="tabs-left">
        <li class="selected"><a :href="self">{{ tab }}</a></li>
      </ul>
      <!-- Discussion, Edit and History come back when the wiki opens for editing -->
      <ul class="tabs-right">
        <li class="selected"><a :href="self">Read</a></li>
      </ul>
      <SearchForm />
    </nav>

    <main id="content">
      <SiteNotice />
      <h1 class="page-title">{{ title }}</h1>
      <p class="byline">From the WoW Forever Wiki</p>
      <slot />
    </main>
  </Layout>
</template>

<script>
const { pageHref } = require('../lib/wiki');

export default {
  components: { Layout: require('./Layout.vue'), SearchForm: require('../components/SearchForm.vue'), SiteNotice: require('../components/SiteNotice.vue') },
  props: { title: { type: String, required: true }, tab: { type: String, required: true } },
  computed: { self() { return pageHref(this.title); } },
};
</script>
