<!-- Inline content from the page model: an array of segments (see src/lib/doc.js). Kept on one line: any
     whitespace between the segments here would show as a space on the page. -->
<template><template v-for="s in segs"><template v-if="typeof s === 'string'">{{ s }}</template><WikiLink v-else-if="s.link" :to="s.link" :cls="s.cls">{{ s.text ?? s.link }}</WikiLink><a v-else-if="s.ext" class="external" :href="s.ext">{{ s.text }}</a><b v-else-if="s.b != null">{{ s.b }}</b><span v-else-if="s.q" :class="'q-' + s.q">{{ s.text }}</span><img v-else-if="s.icon" class="mini-icon" :src="`/assets/icons/${s.icon}.jpg`" alt="" width="18" height="18"><span v-else-if="s.tag" class="new-tag">{{ s.tag }}</span><span v-else-if="s.unknown" class="unknown">{{ s.unknown === true ? '?' : s.unknown }}</span><SkillRange v-else-if="'skill' in s" :req="s.skill" /></template></template>

<script>
export default {
  components: { SkillRange: require('./SkillRange.vue') },
  props: { segs: { type: Array, required: true } },
};
</script>
