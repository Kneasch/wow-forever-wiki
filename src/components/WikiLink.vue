<!-- Link to a wiki page by its title: <WikiLink to="Copper Vein" /> or <WikiLink to="Mining" cls="q-common">text</WikiLink> -->
<template><a v-bind="attrs"><slot>{{ to }}</slot></a></template>

<script>
const { pageHref } = require('../lib/wiki');

export default {
  props: { to: { type: String, required: true }, cls: { type: String, default: null } },
  // class only when given: :class="null" would still write class=""
  computed: { attrs() { return this.cls ? { class: this.cls, href: pageHref(this.to) } : { href: pageHref(this.to) }; } },
};
</script>
