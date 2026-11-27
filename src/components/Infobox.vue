<!-- The box at the top right of an article: { name, image?, rows: [{ th, segs } | { sub }] } -->
<template>
    <table class="infobox"><tbody>
      <tr><th colspan="2" class="infobox-header">{{ box.name }}</th></tr>
      <tr v-if="box.image">
        <td colspan="2" class="infobox-image">
          <span :class="box.image.cls" role="img" :aria-label="box.image.label">
            <img v-if="box.image.src" :src="box.image.src" alt="" width="56" height="56">
            <svg v-else-if="box.image.placeholder" viewBox="0 0 36 36" width="36" height="36" aria-hidden="true"><path d="M9 7h13v9H9zM14 16h3v14h-3z" fill="currentColor"/></svg>
          </span>
        </td>
      </tr>
      <template v-for="r in box.rows">
        <tr v-if="r.sub"><th colspan="2" class="infobox-subheader">{{ r.sub }}</th></tr>
        <tr v-else><th>{{ r.th }}</th><td><Rich :segs="r.segs" /></td></tr>
      </template>
    </tbody></table>
</template>

<script>
export default {
  components: { Rich: require('./Rich.vue') },
  props: { box: { type: Object, required: true } },
};
</script>
