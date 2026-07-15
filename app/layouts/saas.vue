<script setup lang="ts">
/** Platform console routes run without tenant impersonation. */
const { isSaasAdmin, hasOrgContext, clearOrgContext } = useSaasAdmin()

onMounted(async () => {
  if (isSaasAdmin.value && hasOrgContext.value) {
    await clearOrgContext()
  }
})
</script>

<template>
  <AppDashboardShell>
    <main class="relative flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <slot />
    </main>
  </AppDashboardShell>
</template>
