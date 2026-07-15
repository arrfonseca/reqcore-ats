<script setup lang="ts">
import { Building2, Plus } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  /** Sidebar footer link vs prominent page header button */
  variant?: 'sidebar' | 'button'
}>(), {
  variant: 'sidebar',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { isSaasAdmin, hasOrgContext } = useSaasAdmin()

const visible = computed(() => isSaasAdmin.value && !hasOrgContext.value)

const createTenantTo = computed(() =>
  localePath({ path: '/onboarding/create-org', query: { mode: 'create' } }),
)
</script>

<template>
  <NuxtLink
    v-if="visible"
    :to="createTenantTo"
    class="no-underline transition-colors"
    :class="variant === 'button'
      ? 'inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 shadow-sm'
      : 'flex items-center justify-center w-full rounded-lg border border-dashed border-surface-300 dark:border-surface-600 px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-400 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400'"
  >
    <Plus v-if="variant === 'button'" class="size-4 shrink-0" />
    <Building2 v-else class="size-3.5 shrink-0 opacity-70" />
    {{ t('dashboard.saas.createTenant') }}
  </NuxtLink>
</template>
