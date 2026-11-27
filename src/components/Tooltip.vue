<!-- An in-game style item tooltip. lines: [{ segs, cls? } | { split: [segs, segs] }] -->
<template>
    <div class="wow-tooltip">
      <template v-for="l in lines">
        <div v-if="l.split" class="tt-split"><span><Rich :segs="l.split[0]" /></span><span><Rich :segs="l.split[1]" /></span></div>
        <div v-else v-bind="l.cls ? { class: l.cls } : {}"><Rich :segs="l.segs" /></div>
      </template>
    </div>
</template>

<script>
export default {
  components: { Rich: require('./Rich.vue') },
  props: { lines: { type: Array, required: true } },
};
</script>
