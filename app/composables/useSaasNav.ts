import type { Component } from 'vue'
import {
  LayoutDashboard, Building2, CreditCard, Plug, Brain, Users, Globe, ArrowUpCircle,
} from 'lucide-vue-next'

export type SaasNavItem = {
  label: string
  to: string
  icon: Component
  exact: boolean
}

export function useSaasNav() {
  const route = useRoute()
  const { t } = useI18n()
  const { platformPath } = useTenantPaths()

  const navItems = computed<SaasNavItem[]>(() => [
    { label: t('dashboard.saas.nav.dashboard'), to: platformPath(''), icon: LayoutDashboard, exact: true },
    { label: t('dashboard.saas.nav.tenants'), to: platformPath('tenants'), icon: Building2, exact: false },
    { label: t('dashboard.saas.nav.billing'), to: platformPath('billing'), icon: CreditCard, exact: true },
    { label: t('dashboard.saas.nav.integrations'), to: platformPath('integrations'), icon: Plug, exact: true },
    { label: t('dashboard.saas.nav.ai'), to: platformPath('ai'), icon: Brain, exact: true },
    { label: t('dashboard.saas.nav.members'), to: platformPath('members'), icon: Users, exact: true },
    { label: t('dashboard.saas.nav.localization'), to: platformPath('localization'), icon: Globe, exact: true },
    { label: t('dashboard.saas.nav.updates'), to: platformPath('updates'), icon: ArrowUpCircle, exact: true },
  ])

  function isActiveRoute(to: string, exact: boolean) {
    if (exact) return route.path === to
    return route.path === to || route.path.startsWith(`${to}/`)
  }

  return { navItems, isActiveRoute }
}
