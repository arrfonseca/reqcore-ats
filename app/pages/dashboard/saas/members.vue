<script setup lang="ts">
definePageMeta({ layout: 'saas', middleware: ['auth', 'require-saas-admin'] })
const { t } = useI18n()
const { data, pending } = await useFetch('/api/saas/platform-members', { headers: useRequestHeaders(['cookie']) })
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="text-xl font-semibold">{{ t('dashboard.saas.nav.members') }}</h1>
    <p class="text-sm text-surface-500 mt-1">{{ data?.note }}</p>
    <div v-if="pending" class="py-8">{{ t('common.actions.loading') }}</div>
    <ul v-else class="mt-6 space-y-2">
      <li
        v-for="op in data?.operators ?? []"
        :key="op.userId"
        class="rounded-lg border border-surface-200 dark:border-surface-800 px-4 py-3 text-sm"
      >
        <div class="font-medium">{{ op.userName }}</div>
        <div class="text-surface-500 text-xs">{{ op.userEmail }} · {{ op.platformRole }}</div>
      </li>
    </ul>
  </div>
</template>
