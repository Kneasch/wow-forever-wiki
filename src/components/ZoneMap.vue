<!--
  A zone map with pins, from zoneMap() in src/lib/maps.js:  <ZoneMap :map="model" />
  Static HTML: the map <img> with an SVG layer of pins on top, and a legend whose checkboxes show or hide
  each pin type with CSS (wiki.css), no JavaScript. Each pin has a hover title with its coordinates.
-->
<template>
    <figure :class="['zone-map', { dense: map.asDots, 'no-image': !map.image }]">
      <div class="zone-map-frame" :style="`aspect-ratio: ${map.W} / ${map.H}`">
        <img v-if="map.image" :src="map.image" :alt="`Map of ${map.name}`" :width="map.W" :height="map.H" loading="lazy" decoding="async">
        <svg v-if="map.pins.length" class="zone-map-pins" :viewBox="`0 0 ${map.W} ${map.H}`" role="img" :aria-label="map.label"><template v-for="g in map.grid"><line class="grid" :x1="g.x" y1="0" :x2="g.x" :y2="map.H"/><line class="grid" x1="0" :y1="g.y" :x2="map.W" :y2="g.y"/></template><template v-for="p in map.pins"><a v-if="p.href" :href="p.href"><g :class="`pin pin-${p.type}`"><title>{{ p.title }}</title><circle v-if="map.asDots" v-bind="p.dot"/><use v-else :href="`${map.sprite}#pin-${p.type}`" v-bind="p.icon"/></g></a><g v-else :class="`pin pin-${p.type}`"><title>{{ p.title }}</title><circle v-if="map.asDots" v-bind="p.dot"/><use v-else :href="`${map.sprite}#pin-${p.type}`" v-bind="p.icon"/></g></template></svg>
      </div>
      <figcaption>
        <ul v-if="map.legend.length" class="zone-map-legend"><li v-for="l in map.legend"><label><template v-if="map.toggles"><input type="checkbox" :value="l.type" checked>{{ ' ' }}</template><svg :class="`pin-icon pin-${l.type}`" viewBox="0 0 24 32" width="15" height="20" aria-hidden="true"><use :href="`${map.sprite}#pin-${l.type}`"/></svg> {{ l.label }} ({{ l.n }})</label></li></ul>
        {{ map.caption }}{{ map.hover ? ' Hover a point for its coordinates.' : '' }} {{ map.source }}
      </figcaption>
    </figure>
</template>

<script>
export default { props: { map: { type: Object, required: true } } };
</script>
