<script setup lang="ts">
definePageMeta({ layout: 'saas', middleware: ['auth', 'require-saas-admin'] })
const { t } = useI18n()
const { data, pending } = await useFetch('/api/saas/integrations', { headers: useRequestHeaders(['cookie']) })
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="text-xl font-semibold">{{ t('dashboard.saas.nav.integrations') }}</h1>
    <div v-if="pending" class="py-8">{{ t('common.actions.loading') }}</div>
    <ul v-else class="mt-6 space-y-3">
      <li
        v-for="item in data?.integrations ?? []"
        :key="item.provider"
        class="rounded-xl border border-surface-200 dark:border-surface-800 p-4"
      >
        <div class="font-medium capitalize">{{ item.provider.replace('_', ' ') }}</div>
        <p class="text-xs text-surface-500 mt-1">{{ item.description }}</p>
        <p class="text-xs mt-2">
          {{ item.enabled ? t('dashboard.saas.enabled') : t('dashboard.saas.disabled') }}
          <span v-if="item.envConfigured"> · {{ t('dashboard.saas.envConfigured') }}</span>
        </p>
      </li>
    </ul>
  </div>
</template>
