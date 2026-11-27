<!-- Where the maps come from. source: { build, url } -->
<template><p>The maps are the WoW Forever game client's own world maps (build {{ source.build }}), read from <a class="external" :href="source.url">wago.tools</a> and shown fully explored.<slot /></p></template>

<script>
export default { props: { source: { type: Object, required: true } } };
</script>
