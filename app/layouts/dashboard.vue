<script setup lang="ts">
const route = useRoute()
const isFullbleed = computed(() => !!route.meta.fullbleed)
</script>

<template>
  <AppDashboardShell>
    <main :class="['relative flex-1 min-h-0 overflow-y-auto', isFullbleed ? 'overflow-hidden' : 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8']">
      <slot />
    </main>
  </AppDashboardShell>
</template>
