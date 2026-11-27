<!-- Contents box. entries: [[id, label], ...] -->
<template>
  <nav class="toc" aria-label="Contents">
    <h2>Contents</h2>
    <ol>
      <li v-for="[id, label] in entries" :key="id"><a :href="'#' + id">{{ label }}</a></li>
    </ol>
  </nav>
</template>

<script>
export default { props: { entries: { type: Array, required: true } } };
</script>
