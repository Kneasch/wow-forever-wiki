<!-- The skill-up and drop-rarity colour keys -->
<template>
    <ul v-if="kind === 'skill'" class="rarity-key" aria-label="Skill-up colour key">
      <li><span class="swatch sk-orange"></span>Orange: always gives a skill point</li>
      <li><span class="swatch sk-yellow"></span>Yellow: usually does</li>
      <li><span class="swatch sk-green"></span>Green: sometimes does</li>
      <li><span class="swatch sk-grey"></span>Grey: never does</li>
    </ul>
    <ul v-else class="rarity-key" aria-label="Rarity key">
      <li><span class="swatch r-always"></span>Always</li>
      <li><span class="swatch r-common"></span>Common (better than 1/10)</li>
      <li><span class="swatch r-uncommon"></span>Uncommon (1/10 – 1/99.99)</li>
      <li><span class="swatch r-rare"></span>Rare (1/100 – 1/999.99)</li>
      <li><span class="swatch r-veryrare"></span>Very rare (1/1,000+)</li>
    </ul>
</template>

<script>
export default { props: { kind: { type: String, required: true } } };
</script>
