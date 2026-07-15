<script setup lang="ts">
import { Building2 } from 'lucide-vue-next'

const { t } = useI18n()
const localePath = useLocalePath()
const { activeOrg, canCreateOrg } = useCurrentOrg()
const { isSaasAdmin, hasOrgContext } = useSaasAdmin()

/** SaaS admins impersonating a tenant should not create orgs from the ATS sidebar. */
const showCreateOrg = computed(() =>
  canCreateOrg.value && isSaasAdmin.value && !hasOrgContext.value,
)
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="activeOrg"
      class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 px-3 py-2.5"
    >
      <div class="flex items-center gap-2 min-w-0">
        <Building2 class="size-4 shrink-0 text-surface-400" />
        <div class="min-w-0 flex-1">
          <div class="text-[13px] font-medium text-surface-900 dark:text-surface-100 truncate">
            {{ activeOrg.name }}
          </div>
          <div class="text-[11px] text-surface-400 truncate">
            {{ activeOrg.slug }}
          </div>
        </div>
      </div>
      <p
        v-if="isSaasAdmin"
        class="mt-1.5 text-[10px] text-brand-600 dark:text-brand-400"
      >
        {{ t('dashboard.topBar.saasAdminContextHint') }}
      </p>
    </div>

    <p
      v-else-if="isSaasAdmin"
      class="text-xs text-surface-500 dark:text-surface-400 px-1"
    >
      {{ t('dashboard.topBar.noOrgSelected') }}
    </p>

    <NuxtLink
      v-if="showCreateOrg"
      :to="localePath('/onboarding/create-org')"
      class="flex items-center justify-center w-full rounded-lg border border-dashed border-surface-300 dark:border-surface-600 px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-400 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors no-underline"
    >
      {{ t('components.orgSwitcher.createOrg') }}
    </NuxtLink>
  </div>
</template>
