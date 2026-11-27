<!-- A value, or ? when it is missing: <Val :v="item.slot" /> -->
<template><template v-if="blank"><span class="unknown">?</span></template><template v-else>{{ v }}</template></template>

<script>
const { isBlank } = require('../lib/wiki');

export default {
  props: { v: { default: null } },
  computed: { blank() { return isBlank(this.v); } },
};
</script>
