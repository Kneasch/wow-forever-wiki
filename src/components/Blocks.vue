<!-- The blocks of a page section (see src/lib/doc.js) -->
<template>
  <template v-for="bl in blocks">
    <p v-if="bl.p"><Rich :segs="bl.p" /></p>
    <ul v-else-if="bl.ul">
      <li v-for="item in bl.ul"><Rich :segs="item" /></li>
    </ul>
    <ol v-else-if="bl.ol">
      <li v-for="item in bl.ol"><Rich :segs="item" /></li>
    </ol>
    <h3 v-else-if="bl.h3" v-bind="bl.id ? { id: bl.id } : {}"><Rich :segs="bl.h3" /></h3>
    <DataTable v-else-if="bl.table" :t="bl.table" />
    <ZoneMap v-else-if="bl.map" :map="bl.map" />
    <ColourKey v-else-if="bl.key" :kind="bl.key" />
    <Tooltip v-else-if="bl.tooltip" :lines="bl.tooltip" />
  </template>
</template>

<script>
export default {
  components: {
    Rich: require('./Rich.vue'),
    DataTable: require('./DataTable.vue'),
    ZoneMap: require('./ZoneMap.vue'),
    ColourKey: require('./ColourKey.vue'),
    Tooltip: require('./Tooltip.vue'),
  },
  props: { blocks: { type: Array, required: true } },
};
</script>
