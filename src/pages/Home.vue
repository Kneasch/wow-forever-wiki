<!--
  The main page, laid out like the OSRS Wiki's: welcome banner with statistics, portal tiles, then two columns of boxes.
  Data comes from src/data/home.js. Styles: "Main page" in site/assets/wiki.css.
-->
<template>
  <Layout>
    <nav class="tabs" aria-label="Page">
      <ul class="tabs-left"><li class="selected"><a href="/">Main page</a></li></ul>
      <SearchForm />
    </nav>
    <main id="content" class="mainpage">
      <SiteNotice />
      <h1 class="page-title visually-hidden">WoW Forever Wiki</h1>

      <header class="mp-welcome">
        <p class="mp-welcome-title">Welcome to the <b>WoW Forever Wiki</b></p>
        <p class="mp-welcome-sub">The reference wiki for World of Warcraft Forever: dungeons, bosses and loot, professions and gathering, and maps of every zone.</p>
        <ul class="mp-stats" aria-label="Wiki statistics">
          <li v-for="s in stats" :key="s.label"><b>{{ s.value }}</b> {{ s.label }}</li>
        </ul>
      </header>

      <ul class="mp-portals" aria-label="Sections">
        <li v-for="p in portals" :key="p.label">
          <WikiLink v-if="p.to" :to="p.to"><img v-if="p.icon" :src="p.icon" alt="" width="36" height="36"><span class="mp-portal-label">{{ p.label }}</span><span class="mp-portal-note">{{ p.note }}</span></WikiLink>
          <a v-else :href="p.href"><img v-if="p.icon" :src="p.icon" alt="" width="36" height="36"><span class="mp-portal-label">{{ p.label }}</span><span class="mp-portal-note">{{ p.note }}</span></a>
        </li>
      </ul>

      <div class="mp-columns">
        <div class="mp-col mp-col-main">
          <section class="mp-box" aria-labelledby="Dungeons">
            <h2 id="Dungeons" class="mp-box-head">Dungeons</h2>
            <div class="mp-box-body">
              <p>All {{ dungeonCount }} dungeons have a page with their bosses and loot tables, and every boss and item has a page of its own. Dungeons marked <span class="new-tag">New</span> are the {{ newCount.toLowerCase() }} added in Forever.</p>
              <div class="mp-brackets">
                <div v-for="b in brackets" :key="b.id" class="mp-bracket">
                  <h3 :id="b.id">{{ b.label }}</h3>
                  <ul class="mp-dungeon-list">
                    <li v-for="d in b.dungeons" :key="d.order">
                      <WikiLink :to="d.name" /><span v-if="d.new_in_forever" class="new-tag">New</span>
                      <span class="mp-meta">{{ d.levels }} · {{ d.zone }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section class="mp-box" aria-labelledby="Featured_dungeon">
            <h2 id="Featured_dungeon" class="mp-box-head">Featured dungeon</h2>
            <div class="mp-box-body">
              <p class="mp-featured-title"><WikiLink :to="featured.name" /><span v-if="featured.new_in_forever" class="new-tag">New in Forever</span></p>
              <p>A level {{ featured.levels }} dungeon in {{ featured.zone }} with {{ featured.bossCount }} and {{ featured.itemCount }} of loot<template v-if="featured.finalBoss">, ending with <WikiLink :to="featured.finalBoss" /></template>.</p>
              <p v-if="featured.location" class="mp-meta">{{ featured.location }}</p>
              <p class="mp-label">Bosses</p>
              <ul class="mp-inline-list">
                <li v-for="b in featured.bosses" :key="b"><WikiLink :to="b" /></li>
                <li v-if="featured.moreBosses"><WikiLink :to="featured.name">and {{ featured.moreBosses }} more…</WikiLink></li>
              </ul>
              <p class="mp-more"><WikiLink :to="featured.name">Read more…</WikiLink></p>
            </div>
          </section>

          <section class="mp-box" aria-labelledby="Wiki_progress">
            <h2 id="Wiki_progress" class="mp-box-head">Wiki progress</h2>
            <div class="mp-box-body">
              <ul class="mp-progress">
                <li v-for="p in progress" :key="p.label">
                  <span class="mp-progress-label">{{ p.label }}</span>
                  <span class="mp-progress-bar" role="img" :aria-label="`${p.done} of ${p.total}`"><span :style="{ width: Math.round(100 * p.done / p.total) + '%' }"></span></span>
                  <span class="mp-meta">{{ p.done }}/{{ p.total }}</span>
                </li>
              </ul>
              <p>Written professions: <template v-for="(n, i) in writtenProfs" :key="n"><template v-if="i">, </template><WikiLink :to="n" /></template>. Classes, quests, reputation and raids are still to come.</p>
            </div>
          </section>
        </div>

        <div class="mp-col mp-col-side">
          <section class="mp-box" aria-labelledby="New_in_Forever">
            <h2 id="New_in_Forever" class="mp-box-head">New in Forever</h2>
            <div class="mp-box-body">
              <p>What Forever adds to the classic world.</p>
              <p class="mp-label">{{ newDungeonsLabel }}</p>
              <ul class="mp-compact">
                <li v-for="d in newDungeons" :key="d.name"><WikiLink :to="d.name" /> <span class="mp-meta mp-nowrap">{{ d.levels }}</span></li>
              </ul>
              <p class="mp-label">{{ newZonesLabel }}</p>
              <ul class="mp-inline-list">
                <li v-for="z in newZones" :key="z"><WikiLink :to="z" /></li>
              </ul>
              <p class="mp-label">Profession camps</p>
              <p>{{ campCount }} camp features, from a Lodestone to a Fishing Hut, built with blueprints and profession skill. See <WikiLink to="Professions" />.</p>
            </div>
          </section>

          <section class="mp-box" aria-labelledby="Professions">
            <h2 id="Professions" class="mp-box-head">Professions</h2>
            <div class="mp-box-body">
              <template v-for="g in professions" :key="g.kind">
                <p class="mp-label">{{ g.label }}</p>
                <ul class="mp-prof-grid">
                  <li v-for="p in g.professions" :key="p.name" :class="{ 'mp-unwritten': !p.written }">
                    <WikiLink v-if="p.written" :to="p.name"><img v-if="p.icon" :src="p.icon" alt="" width="28" height="28">{{ p.name }}</WikiLink>
                    <span v-else :title="`${p.name}: not written yet`"><img v-if="p.icon" :src="p.icon" alt="" width="28" height="28">{{ p.name }}</span>
                  </li>
                </ul>
              </template>
              <p class="mp-more"><WikiLink to="Professions">All professions…</WikiLink></p>
            </div>
          </section>

          <section class="mp-box" aria-labelledby="Zones">
            <h2 id="Zones" class="mp-box-head">Zones</h2>
            <div class="mp-box-body">
              <p>Maps of {{ zoneCounts.zone }}, {{ zoneCounts.city }} and {{ zoneCounts.battleground }}, with gathering nodes pinned on them.</p>
              <ul class="mp-continents">
                <li v-for="c in continents" :key="c.name">
                  <WikiLink :to="c.name"><img :src="c.thumb" alt="" loading="lazy"><span class="mp-continent-name">{{ c.name }}</span><span class="mp-meta">{{ c.zones }}</span></WikiLink>
                </li>
              </ul>
              <p class="mp-more"><WikiLink to="Zones">All zone maps…</WikiLink></p>
            </div>
          </section>
        </div>
      </div>
    </main>
  </Layout>
</template>

<script>
export default {
  components: { Layout: require('../layout/Layout.vue'), SearchForm: require('../components/SearchForm.vue'), SiteNotice: require('../components/SiteNotice.vue') },
  props: {
    stats: { type: Array, required: true },
    portals: { type: Array, required: true },
    brackets: { type: Array, required: true },
    featured: { type: Object, required: true },
    professions: { type: Array, required: true },
    continents: { type: Array, required: true },
    progress: { type: Array, required: true },
    dungeonCount: { type: Number, required: true },
    newCount: { type: String, required: true },
    newDungeons: { type: Array, required: true },
    newDungeonsLabel: { type: String, required: true },
    newZones: { type: Array, required: true },
    newZonesLabel: { type: String, required: true },
    writtenProfs: { type: Array, required: true },
    campCount: { type: Number, required: true },
    zoneCounts: { type: Object, required: true },
  },
};
</script>
