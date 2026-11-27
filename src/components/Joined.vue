<!-- "A, B and C" with each item as a wiki link: <Joined :titles="['A', 'B', 'C']" /> -->
<template><template v-for="(t, i) in titles" :key="t"><WikiLink :to="t" />{{ i < titles.length - 2 ? ', ' : i === titles.length - 2 ? ' and ' : '' }}</template></template>

<script>
export default { props: { titles: { type: Array, required: true } } };
</script>
