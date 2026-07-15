<script setup lang="ts">
import { Building2, Loader2, Search, ChevronRight } from 'lucide-vue-next'

definePageMeta({
  layout: 'saas',
  middleware: ['auth', 'require-saas-admin'],
})

const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: t('dashboard.saas.tenantsSeoTitle'),
  description: t('dashboard.saas.tenantsSeoDescription'),
})

const { allOrgs, isLoadingOrgs, orgsError, fetchAllOrgs } = useSaasAdmin()

const orgSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(orgSearch, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchAllOrgs(val), 250)
})

onMounted(() => fetchAllOrgs())

function statusClass(status?: string) {
  if (status === 'suspended') return 'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-400'
  if (status === 'archived') return 'bg-surface-100 text-surface-500 dark:bg-surface-800'
  return 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-400'
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100">
          {{ t('dashboard.saas.nav.tenants') }}
        </h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {{ t('dashboard.saas.tenantsSubtitle') }}
        </p>
      </div>
      <SaasCreateTenantLink variant="button" class="shrink-0" />
    </div>

    <div class="mt-6 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
      <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-800">
        <div class="relative max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-surface-400" />
          <input
            v-model="orgSearch"
            type="search"
            :placeholder="t('dashboard.topBar.searchOrgs')"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      <div v-if="isLoadingOrgs" class="px-6 py-10 flex justify-center">
        <Loader2 class="size-5 animate-spin text-surface-400" />
      </div>
      <p v-else-if="orgsError" class="px-6 py-6 text-sm text-danger-500">{{ orgsError }}</p>
      <p v-else-if="allOrgs.length === 0" class="px-6 py-6 text-sm text-surface-500">{{ t('dashboard.topBar.noOrgs') }}</p>

      <ul v-else class="divide-y divide-surface-100 dark:divide-surface-800">
        <li v-for="org in allOrgs" :key="org.id">
          <NuxtLink
            :to="localePath(`/dashboard/saas/tenants/${org.id}`)"
            class="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 no-underline transition-colors"
          >
            <Building2 class="size-5 text-surface-400 shrink-0" />
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{{ org.name }}</div>
              <div class="text-xs text-surface-400 truncate">{{ org.slug }} · {{ org.memberCount ?? 0 }} {{ t('dashboard.saas.members') }}</div>
            </div>
            <span
              class="text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 shrink-0"
              :class="statusClass(org.status)"
            >
              {{ org.status ?? 'active' }}
            </span>
            <ChevronRight class="size-4 text-surface-400 shrink-0" />
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
