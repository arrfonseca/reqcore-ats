<script setup lang="ts">
definePageMeta({ layout: 'saas', middleware: ['auth', 'require-saas-admin'] })
const { t } = useI18n()
const { data, pending } = await useFetch('/api/saas/billing', { headers: useRequestHeaders(['cookie']) })
</script>

<template>
  <div class="max-w-4xl">
    <h1 class="text-xl font-semibold">{{ t('dashboard.saas.nav.billing') }}</h1>
    <p class="text-sm text-surface-500 mt-1">{{ data?.note }}</p>
    <div v-if="pending" class="py-8 text-surface-400">{{ t('common.actions.loading') }}</div>
    <div v-else class="mt-6 space-y-2">
      <div
        v-for="row in data?.tenants ?? []"
        :key="row.organizationId"
        class="rounded-lg border border-surface-200 dark:border-surface-800 px-4 py-3 text-sm flex justify-between"
      >
        <span>{{ row.name }}</span>
        <span class="text-surface-500">{{ row.planTier }} · {{ row.subscriptionStatus }}</span>
      </div>
    </div>
  </div>
</template>
