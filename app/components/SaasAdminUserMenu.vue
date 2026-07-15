<script setup lang="ts">
import { Building2, Loader2, Search, Shield, LogOut as ExitIcon } from 'lucide-vue-next'

const props = defineProps<{
  activeOrgId?: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const {
  isSaasAdmin,
  allOrgs,
  isLoadingOrgs,
  orgsError,
  fetchAllOrgs,
  switchOrgAsSaasAdmin,
  clearOrgContext,
  hasOrgContext,
} = useSaasAdmin()

const orgSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(orgSearch, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchAllOrgs(val)
  }, 250)
})

onMounted(() => {
  if (isSaasAdmin.value) {
    fetchAllOrgs()
  }
})

async function handleSelectOrg(orgId: string) {
  emit('close')
  await switchOrgAsSaasAdmin(orgId)
}

async function handleClearContext() {
  emit('close')
  await clearOrgContext()
}
</script>

<template>
  <div v-if="isSaasAdmin" class="border-b border-surface-100 dark:border-surface-800">
    <div class="px-4 py-2.5 bg-surface-50/80 dark:bg-surface-800/40">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
        <Shield class="size-3.5" />
        {{ t('dashboard.topBar.accessAsAdmin') }}
      </div>
      <p class="mt-0.5 text-[11px] text-surface-500 dark:text-surface-400">
        {{ t('dashboard.topBar.accessAsAdminHint') }}
      </p>
    </div>

    <div class="px-3 py-2">
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-surface-400" />
        <input
          v-model="orgSearch"
          type="search"
          :placeholder="t('dashboard.topBar.searchOrgs')"
          class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 pl-8 pr-3 py-1.5 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>
    </div>

    <div class="max-h-48 overflow-y-auto py-1">
      <div v-if="isLoadingOrgs" class="px-4 py-3 flex items-center justify-center gap-2 text-xs text-surface-400">
        <Loader2 class="size-3.5 animate-spin" />
        {{ t('common.actions.loading') }}
      </div>
      <p v-else-if="orgsError" class="px-4 py-2 text-xs text-danger-500">
        {{ orgsError }}
      </p>
      <p v-else-if="allOrgs.length === 0" class="px-4 py-2 text-xs text-surface-400">
        {{ t('dashboard.topBar.noOrgs') }}
      </p>
      <button
        v-for="org in allOrgs"
        :key="org.id"
        type="button"
        class="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors border-0 cursor-pointer bg-transparent"
        :class="org.id === props.activeOrgId
          ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
          : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'"
        @click="handleSelectOrg(org.id)"
      >
        <Building2 class="size-3.5 shrink-0 text-surface-400" />
        <span class="min-w-0 flex-1 truncate">{{ org.name }}</span>
        <span class="text-[10px] text-surface-400 shrink-0">{{ org.slug }}</span>
      </button>
    </div>

    <div v-if="hasOrgContext" class="px-3 py-2 border-t border-surface-100 dark:border-surface-800">
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors border-0 cursor-pointer bg-transparent"
        @click="handleClearContext"
      >
        <ExitIcon class="size-3.5" />
        {{ t('dashboard.topBar.exitOrgContext') }}
      </button>
    </div>
  </div>
</template>
