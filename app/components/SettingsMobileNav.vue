<script setup lang="ts">
import {
  Building2, Users, UserCircle, ChevronLeft, Plug, Brain, ShieldCheck, Globe,
} from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()
const { tenantPath } = useTenantPaths()
const { allowOwnLlm } = useOrgSettings()

const settingsNav = computed(() => [
  {
    label: t('settings.nav.general'),
    to: tenantPath('settings'),
    icon: Building2,
    exact: true,
  },
  {
    label: t('settings.nav.domain'),
    to: tenantPath('settings/domain'),
    icon: Globe,
    exact: true,
  },
  {
    label: t('settings.nav.members'),
    to: tenantPath('settings/members'),
    icon: Users,
    exact: true,
  },
  {
    label: t('settings.nav.integrations'),
    to: tenantPath('settings/integrations'),
    icon: Plug,
    exact: true,
  },
  ...(allowOwnLlm.value
    ? [{
        label: t('settings.nav.aiAnalysisShort'),
        to: tenantPath('settings/ai-analysis'),
        icon: Brain,
        exact: true,
      }]
    : []),
  {
    label: t('settings.nav.ssoShort'),
    to: tenantPath('settings/sso'),
    icon: ShieldCheck,
    exact: true,
  },
  {
    label: t('settings.nav.account'),
    to: tenantPath('settings/account'),
    icon: UserCircle,
    exact: true,
  },
])

function isActive(to: string, exact: boolean) {
  if (exact) return route.path === to
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <div class="border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-sm">
    <!-- Back link + title -->
    <div class="flex items-center gap-3 px-4 pt-3 pb-2">
      <NuxtLink
        :to="tenantPath('jobs')"
        class="inline-flex items-center gap-1 text-xs font-medium text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 transition-colors no-underline"
      >
        <ChevronLeft class="size-3.5" />
        {{ t('settings.backToDashboard') }}
      </NuxtLink>
      <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
        {{ t('settings.title') }}
      </h2>
    </div>

    <!-- Scrollable tabs -->
    <nav class="flex overflow-x-auto px-3 gap-1 pb-2 scrollbar-none">
      <NuxtLink
        v-for="item in settingsNav"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors no-underline shrink-0"
        :class="isActive(item.to, item.exact)
          ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
          : 'text-surface-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/60 hover:text-surface-900 dark:hover:text-surface-100'"
      >
        <component :is="item.icon" class="size-3.5" />
        {{ item.label }}
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
