<template>
  <Article title="Zones" tab="Guide">
    <p>World maps for every zone in WoW Forever: {{ counts.zone }} zones, {{ counts.city }} cities, {{ counts.battleground }} battlegrounds and {{ counts.continent }} continents. Select a map to open its page.</p>
    <p><template v-if="fresh.length">{{ fresh.length === 1 ? 'One map is' : `${fresh.length} maps are` }} new in Forever: <Joined :titles="fresh" />. The rest are</template><template v-else>All of them are</template> the Classic zones, drawn from the Forever client, so they show any changes Forever has made.</p>

    <Toc :entries="sections.map((s) => [s.id, s.label])" />

    <template v-for="s in sections" :key="s.id">
      <h2 :id="s.id">{{ s.label }}</h2>
      <p v-if="s.intro">{{ s.intro }}</p>
      <MapGallery :cards="s.gallery" />
    </template>

    <h2 id="Sources">Sources</h2>
    <MapSource :source="source"> Dungeons and raids have no world map in the client yet.</MapSource>
  </Article>
</template>

<script>
export default {
  components: { MapGallery: require('../components/MapGallery.vue'), MapSource: require('../components/MapSource.vue'), Joined: require('../components/Joined.vue') },
  props: ['counts', 'fresh', 'sections', 'source'],
};
</script>
