<!-- Map thumbnails, each linking to its map's page. cards: from gallery() in src/data/zones.js -->
<template>
    <ul class="map-gallery">
      <li v-for="c in cards" :key="c.title">
        <a :href="href(c.title)"><img :src="c.thumb" :alt="`Map of ${c.name}`" width="334" :height="c.thumbHeight" loading="lazy" decoding="async"></a>
        <span class="map-gallery-name"><WikiLink :to="c.title" /></span>
        <span v-if="c.note || c.new_in_forever" class="map-gallery-note">{{ c.note }}{{ c.note && c.new_in_forever ? ' ' : '' }}<span v-if="c.new_in_forever" class="new-tag">New in Forever</span></span>
      </li>
    </ul>
</template>

<script>
const { pageHref } = require('../lib/wiki');

export default {
  props: { cards: { type: Array, required: true } },
  methods: { href: pageHref },
};
</script>
