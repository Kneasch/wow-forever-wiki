<template>
  <Layout>
    <nav class="tabs" aria-label="Page">
      <ul class="tabs-left"><li class="selected"><a href="/">Main page</a></li></ul>
      <form class="search" role="search" action="#"><input type="search" name="q" placeholder="Search the wiki" aria-label="Search the wiki"></form>
    </nav>
    <main id="content">
      <h1 class="page-title">WoW Forever Wiki</h1>
      <p>A reference wiki for World of Warcraft Forever. Covers all {{ dungeons.length }} dungeons, with boss and loot pages for each, a growing <WikiLink to="Professions">professions</WikiLink> section, and <WikiLink to="Zones">maps of every zone</WikiLink>.</p>
      <h2 id="Dungeons">Dungeons</h2>
      <p>Listed in level order. {{ newCount }} dungeons are new in Forever.</p>
      <div class="table-scroll">
        <table class="wikitable">
          <thead>
            <tr><th>#</th><th>Dungeon</th><th>Levels</th><th>Zone</th><th>New in Forever</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in dungeons" :key="d.order"><td class="num">{{ d.order }}</td><td><WikiLink :to="d.name" /></td><td class="num">{{ d.levels }}</td><td>{{ d.zone }}</td><td>{{ d.new_in_forever ? 'Yes' : '' }}</td></tr>
          </tbody>
        </table>
      </div>
      <h2 id="Professions">Professions</h2>
      <p>Gathering, production and secondary professions, with Forever's new camp features and materials. <WikiLink to="Mining" /> and <WikiLink to="Herbalism" /> are written so far: every mineral vein and herb with its skill, zones and spawn maps, smelting, and pages for every ore, stone, gem, bar, herb and seed.</p>
      <ul>
        <li><WikiLink to="Professions">All professions</WikiLink></li>
        <li><WikiLink to="Mining" /></li>
        <li><WikiLink to="Herbalism" /></li>
      </ul>
      <h2 id="Zones">Zones</h2>
      <p>World maps for every zone, city and battleground, including Forever's new zones such as Zephras Isle and Riverglades.</p>
      <ul>
        <li><WikiLink to="Zones">All zone maps</WikiLink></li>
      </ul>
    </main>
  </Layout>
</template>

<script>
export default {
  components: { Layout: require('../layout/Layout.vue') },
  props: { dungeons: { type: Array, required: true }, newCount: { type: String, required: true } },
};
</script>
