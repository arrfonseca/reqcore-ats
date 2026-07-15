<script setup lang="ts">
import { Building2, LogOut } from 'lucide-vue-next'

const { t } = useI18n()
const { activeOrg } = useCurrentOrg()
const { isSaasAdmin, hasOrgContext, clearOrgContext } = useSaasAdmin()

const visible = computed(() => isSaasAdmin.value && hasOrgContext.value)
</script>

<template>
  <div
    v-if="visible"
    class="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-brand-600 text-white text-sm"
  >
    <div class="flex items-center gap-2 min-w-0">
      <Building2 class="size-4 shrink-0 opacity-90" />
      <span class="truncate">
        {{ t('dashboard.saas.impersonating', { name: activeOrg?.name ?? '…' }) }}
      </span>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-md bg-white/15 hover:bg-white/25 px-2.5 py-1 text-xs font-medium transition-colors border-0 cursor-pointer text-white"
      @click="clearOrgContext"
    >
      <LogOut class="size-3.5" />
      {{ t('dashboard.saas.exitTenant') }}
    </button>
  </div>
</template>
