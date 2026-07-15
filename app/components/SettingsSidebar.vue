<script setup lang="ts">
import {
  Building2, Users, UserCircle, ChevronLeft, Settings, Plug, Brain, ShieldCheck, Globe,
} from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()
const { tenantPath } = useTenantPaths()
const { allowOwnLlm } = useOrgSettings()

const settingsNav = computed(() => [
  {
    label: t('settings.nav.general'),
    description: t('settings.nav.generalDescription'),
    to: tenantPath('settings'),
    icon: Building2,
    exact: true,
  },
  {
    label: t('settings.nav.domain'),
    description: t('settings.nav.domainDescription'),
    to: tenantPath('settings/domain'),
    icon: Globe,
    exact: true,
  },
  {
    label: t('settings.nav.members'),
    description: t('settings.nav.membersDescription'),
    to: tenantPath('settings/members'),
    icon: Users,
    exact: true,
  },
  {
    label: t('settings.nav.integrations'),
    description: t('settings.nav.integrationsDescription'),
    to: tenantPath('settings/integrations'),
    icon: Plug,
    exact: true,
  },
  ...(allowOwnLlm.value
    ? [{
        label: t('settings.nav.aiAnalysis'),
        description: t('settings.nav.aiAnalysisDescription'),
        to: tenantPath('settings/ai-analysis'),
        icon: Brain,
        exact: true,
      }]
    : []),
  {
    label: t('settings.nav.sso'),
    description: t('settings.nav.ssoDescription'),
    to: tenantPath('settings/sso'),
    icon: ShieldCheck,
    exact: true,
    badge: t('settings.nav.beta'),
  },
  {
    label: t('settings.nav.account'),
    description: t('settings.nav.accountDescription'),
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
  <aside
    class="flex h-full w-56 min-w-56 flex-col border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-y-auto overscroll-contain"
  >
    <!-- Header -->
    <div class="px-4 pt-5 pb-4">
      <NuxtLink
        :to="tenantPath('jobs')"
        class="inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 transition-colors no-underline mb-3"
      >
        <ChevronLeft class="size-3.5" />
        {{ t('settings.backToJobs') }}
      </NuxtLink>
      <div class="flex items-center gap-2.5">
        <div class="flex items-center justify-center size-8 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400">
          <Settings class="size-4" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('settings.title') }}</h2>
        </div>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2 pb-4 space-y-0.5">
      <NuxtLink
        v-for="item in settingsNav"
        :key="item.to"
        :to="item.to"
        class="group flex items-start gap-3 rounded-lg px-3 py-2.5 no-underline transition-colors"
        :class="isActive(item.to, item.exact)
          ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
          : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/50 hover:text-surface-900 dark:hover:text-surface-200'"
      >
        <component
          :is="item.icon"
          class="size-4 mt-0.5 shrink-0"
          :class="isActive(item.to, item.exact) ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500 group-hover:text-surface-600 dark:group-hover:text-surface-300'"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium truncate">{{ item.label }}</span>
            <span
              v-if="item.badge"
              class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400"
            >
              {{ item.badge }}
            </span>
          </div>
          <p class="text-xs text-surface-400 dark:text-surface-500 mt-0.5 line-clamp-2">{{ item.description }}</p>
        </div>
      </NuxtLink>
    </nav>
  </aside>
</template>
