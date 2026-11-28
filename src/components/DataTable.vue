<!-- A wiki table: { head: [text], rows: [[{ segs, cls?, title? }]], cls }. All-empty head: no header row. -->
<template>
    <div class="table-scroll">
      <table :class="t.cls">
        <thead v-if="t.head.some((h) => h)"><tr><th v-for="h in t.head">{{ h }}</th></tr></thead>
        <tbody>
          <tr v-for="row in t.rows"><td v-for="c in row" v-bind="attrs(c)"><Rich :segs="c.segs" /></td></tr>
        </tbody>
      </table>
    </div>
</template>

<script>
export default {
  components: { Rich: require('./Rich.vue') },
  props: { t: { type: Object, required: true } },
  // class and title only when set, so cells without them have no empty attributes
  methods: { attrs: (c) => ({ ...(c.cls ? { class: c.cls } : {}), ...(c.title ? { title: c.title } : {}) }) },
};
</script>
