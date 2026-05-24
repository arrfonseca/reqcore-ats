<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()

await navigateTo(
  localePath({ path: '/', query: route.query }),
  { replace: true, redirectCode: 301 },
)
</script>

<template>
  <div />
</template>
