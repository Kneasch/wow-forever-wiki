<!--
  An article built from the JSON page model (src/lib/doc.js):
    { title, tab, infobox?, intro: [block], toc: bool, sections: [{ id, label, blocks }] }
-->
<template>
  <Article :title="title" :tab="tab">
    <Infobox v-if="infobox" :box="infobox" />
    <Blocks :blocks="intro" />
    <Toc v-if="toc" :entries="sections.map((s) => [s.id, s.label])" />
    <template v-for="s in sections" :key="s.id">
      <h2 :id="s.id">{{ s.label }}</h2>
      <Blocks :blocks="s.blocks" />
    </template>
  </Article>
</template>

<script>
export default {
  components: { Infobox: require('../components/Infobox.vue'), Blocks: require('../components/Blocks.vue') },
  props: {
    title: { type: String, required: true },
    tab: { type: String, required: true },
    infobox: { type: Object, default: null },
    intro: { type: Array, default: () => [] },
    toc: { type: Boolean, default: true },
    sections: { type: Array, default: () => [] },
  },
};
</script>
