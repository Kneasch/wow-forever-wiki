<!-- Skill-up colours for a required skill. Classic rule: orange to +24, yellow to +49, green to +99, then grey. -->
<template><span v-if="req == null" class="unknown">?</span><span v-else class="skill-range"><span v-for="[c, a, z] in bands" :class="`sk-${c}`" :title="cap(c)">{{ a }}{{ z ? `–${z}` : '+' }}</span></span></template>

<script>
const { cap } = require('../lib/wiki');

export default {
  props: { req: { type: Number, default: null } },
  computed: {
    bands() {
      const r = this.req;
      return [['orange', Math.max(r, 1), r + 24], ['yellow', r + 25, r + 49], ['green', r + 50, r + 99], ['grey', r + 100, null]];
    },
  },
  methods: { cap },
};
</script>
