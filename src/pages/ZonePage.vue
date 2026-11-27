<template>
  <Article :title="zone.name" :tab="tab">
    <table class="infobox"><tbody>
      <tr><th colspan="2" class="infobox-header">{{ zone.name }}</th></tr>
      <tr><th>Type</th><td>{{ zone.kindLabel }}</td></tr>
      <tr v-if="zone.kind !== 'continent'"><th>Continent</th><td><WikiLink v-if="zone.continent" :to="zone.continent" /><template v-else>–</template></td></tr>
      <tr v-if="zone.kind === 'battleground' && zone.parent"><th>Parent map</th><td><WikiLink :to="zone.parent" /></td></tr>
      <tr><th>New in Forever</th><td>{{ zone.new_in_forever ? 'Yes' : 'No' }}</td></tr>
      <tr><th colspan="2" class="infobox-subheader">Database</th></tr>
      <tr v-if="zone.area_id != null"><th>Area ID</th><td>{{ zone.area_id }}</td></tr>
      <tr><th>UiMap ID</th><td>{{ zone.ui_map_id }}</td></tr>
    </tbody></table>

    <p><b>{{ zone.name }}</b> <template v-if="zone.kind === 'continent'">is a continent. It has {{ plural(zone.zoneCount, 'zone') }} and {{ plural(zone.cityCount, 'capital city', 'capital cities') }}.</template><template v-else-if="zone.kind === 'zone'">is a zone <template v-if="zone.continent">in <WikiLink :to="zone.continent" /></template><template v-else>that is not part of either continent</template>.</template><template v-else-if="zone.kind === 'city'">is a capital city<template v-if="zone.continent"> in <WikiLink :to="zone.continent" /></template>.</template><template v-else>is a battleground. On the world map it sits under <WikiLink v-if="zone.parent" :to="zone.parent" /><Unknown v-else />.</template><template v-if="zone.new_in_forever"> It is new in WoW Forever.</template></p>

    <Toc v-if="sections.length > 1" :entries="sections.map((s) => [s.id, s.label])" />

    <template v-for="s in sections" :key="s.id">
      <h2 :id="s.id">{{ s.label }}</h2>
      <template v-if="s.id === 'Map'"><ZoneMap v-if="s.map" :map="s.map" /></template>
      <MapGallery v-else-if="s.gallery" :cards="s.gallery" />
      <div v-else-if="s.dungeons" class="table-scroll">
        <table class="wikitable">
          <thead><tr><th>Dungeon</th><th>Levels</th><th>New in Forever</th></tr></thead>
          <tbody>
            <tr v-for="d in s.dungeons" :key="d.name"><td><WikiLink :to="d.name" /></td><td class="num"><Val :v="d.levels" /></td><td>{{ d.new_in_forever ? 'Yes' : '' }}</td></tr>
          </tbody>
        </table>
      </div>
      <template v-else-if="s.nodes">
        <p>Gathering nodes whose main zone is {{ zone.name }}. Wowhead's tooltip data gives each node only the zone where it spawns most, so nodes that spawn here less often are not listed yet. Select a point on the map to open its node.</p>
        <div class="table-scroll">
          <table class="wikitable">
            <thead><tr><th>Node</th><th>Profession</th><th>Requires</th><th>Spawn points</th></tr></thead>
            <tbody>
              <tr v-for="n in s.nodes" :key="n.name"><td><WikiLink :to="n.name" /></td><td><WikiLink :to="n.profession" /></td><td class="num"><Val :v="n.req" /></td><td class="num">{{ n.spawns }}</td></tr>
            </tbody>
          </table>
        </div>
        <ZoneMap :map="s.map" />
      </template>
      <MapSource v-else-if="s.source" :source="source" />
    </template>
  </Article>
</template>

<script>
const { plural, cap } = require('../lib/wiki');

export default {
  components: { ZoneMap: require('../components/ZoneMap.vue'), MapGallery: require('../components/MapGallery.vue'), MapSource: require('../components/MapSource.vue') },
  props: ['zone', 'sections', 'source'],
  computed: { tab() { return cap(this.zone.kind); } },
  methods: { plural },
};
</script>
