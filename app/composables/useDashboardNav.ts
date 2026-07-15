import type { Component } from 'vue'
import {
  Briefcase, Kanban, FileText, Table2, Settings,
  LayoutDashboard, Calendar, Sparkles, Radio, History,
  MessageCircle, Users,
} from 'lucide-vue-next'

export type DashboardNavItem = {
  label: string
  to: string
  icon: Component
  exact: boolean
  comingSoon?: boolean
}

export const jobStatusBadgeClasses: Record<string, string> = {
  draft: 'bg-surface-50 text-surface-600 ring-surface-200 dark:bg-surface-800/60 dark:text-surface-400 dark:ring-surface-700',
  open: 'bg-success-50 text-success-700 ring-success-200 dark:bg-success-950/60 dark:text-success-400 dark:ring-success-800',
  closed: 'bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-950/60 dark:text-warning-400 dark:ring-warning-800',
  archived: 'bg-surface-50 text-surface-400 ring-surface-200 dark:bg-surface-800/60 dark:text-surface-500 dark:ring-surface-700',
}

export function useDashboardNav() {
  const route = useRoute()
  const localePath = useLocalePath()
  const getRouteBaseName = useRouteBaseName()
  const { t, te } = useI18n()
  const config = useRuntimeConfig()
  const { activeOrg } = useCurrentOrg()
  const { isSaasAdmin, hasOrgContext } = useSaasAdmin()
  const { navItems: platformNavItems } = useSaasNav()
  const { tenantPath, publicJobPath, effectiveOrgSlug } = useTenantPaths()

  /** SaaS operator without tenant impersonation — platform console nav. */
  const showPlatformNav = computed(() =>
    isSaasAdmin.value && !hasOrgContext.value,
  )

  const showAtsNav = computed(() => !showPlatformNav.value)

  const isDemo = computed(() => {
    const slug = config.public.demoOrgSlug
    return slug && activeOrg.value?.slug === slug
  })

  // ─────────────────────────────────────────────
  // Dynamic job context
  // ─────────────────────────────────────────────

  const activeJobId = computed(() => {
    const baseName = getRouteBaseName(route)
    if (typeof baseName !== 'string') return null
    const isJobRoute = baseName.includes('admin-jobs-id') || baseName.startsWith('dashboard-jobs-id')
    if (!isJobRoute) return null
    const idParam = route.params.id
    if (typeof idParam !== 'string' || idParam === 'new') return null
    return idParam
  })

  const { data: sidebarJobsData } = useFetch(
    () => (showAtsNav.value ? '/api/jobs' : null),
    {
      key: () => `sidebar-jobs-list-${effectiveOrgSlug.value ?? 'none'}`,
      query: { limit: 100 },
      headers: useRequestHeaders(['cookie']),
      watch: [showAtsNav],
    },
  )

  const sidebarJobs = computed(() => sidebarJobsData.value?.data ?? [])

  const activeJob = computed(() => {
    if (!activeJobId.value) return null
    return sidebarJobs.value.find((j: { id: string }) => j.id === activeJobId.value) ?? null
  })

  const activeJobTitle = computed(() => {
    if (!activeJobId.value) return null
    return activeJob.value?.title ?? t('dashboard.topBar.job')
  })

  const activeJobStatus = computed(() => {
    if (!activeJobId.value) return null
    return (activeJob.value as { status?: string } | undefined)?.status ?? null
  })

  const activeJobSlug = computed(() => {
    if (!activeJobId.value) return null
    return (activeJob.value as { slug?: string } | undefined)?.slug ?? null
  })

  function getJobStatusLabel(status: string | null | undefined) {
    if (!status) return ''
    const key = `dashboard.jobs.shared.status.${status}`
    return te(key) ? t(key) : status
  }

  const canViewPublicJob = computed(() =>
    activeJobStatus.value === 'open' && !!activeJobSlug.value,
  )

  const activeJobPublicUrl = computed(() => {
    if (!activeJobSlug.value) return null
    return publicJobPath(activeJobSlug.value)
  })

  const showChatbot = useFeatureFlagEnabled('chatbot-experience')

  const jobTabs = computed(() => {
    if (!activeJobId.value) return []
    const base = tenantPath(`jobs/${activeJobId.value}`)
    return [
      { label: t('dashboard.jobTabs.pipeline'), to: base, icon: Kanban, exact: true },
      { label: t('dashboard.jobTabs.table'), to: `${base}/candidates`, icon: Table2, exact: true },
      { label: t('dashboard.jobTabs.applicationForm'), to: `${base}/application-form`, icon: FileText, exact: true },
      { label: t('dashboard.jobTabs.aiAnalysis'), to: `${base}/ai-analysis`, icon: Sparkles, exact: true },
      { label: t('dashboard.jobTabs.settings'), to: `${base}/settings`, icon: Settings, exact: true },
    ]
  })

  // ─────────────────────────────────────────────
  // Main navigation
  // ─────────────────────────────────────────────

  const mainNav = computed<DashboardNavItem[]>(() => [
    { label: t('dashboard.nav.dashboard'), to: tenantPath(''), icon: LayoutDashboard, exact: true },
    { label: t('dashboard.nav.jobs'), to: tenantPath('jobs'), icon: Briefcase, exact: false },
    { label: t('dashboard.nav.candidates'), to: tenantPath('candidates'), icon: Users, exact: false },
    { label: t('dashboard.nav.applications'), to: tenantPath('applications'), icon: FileText, exact: false },
    { label: t('dashboard.nav.interviews'), to: tenantPath('interviews'), icon: Calendar, exact: false },
    { label: t('dashboard.nav.timeline'), to: tenantPath('timeline'), icon: History, exact: true },
    { label: t('dashboard.nav.sourceTracking'), to: tenantPath('source-tracking'), icon: Radio, exact: true },
    { label: t('dashboard.nav.aiAnalysis'), to: tenantPath('ai-analysis'), icon: Sparkles, exact: true },
    { label: t('dashboard.nav.settings'), to: tenantPath('settings'), icon: Settings, exact: false },
  ])

  const flaggedNav = computed(() => {
    const items: Array<DashboardNavItem & { afterTo: string }> = []
    if (showChatbot.value) {
      items.push({
        label: t('dashboard.nav.assistant'),
        to: tenantPath('chatbot'),
        icon: MessageCircle,
        exact: false,
        afterTo: tenantPath('ai-analysis'),
      })
    }
    return items
  })

  const navItems = computed(() => {
    if (showPlatformNav.value) {
      return platformNavItems.value as DashboardNavItem[]
    }
    if (!showAtsNav.value) return []
    const merged = [...mainNav.value]
    for (const item of flaggedNav.value) {
      const idx = merged.findIndex(n => n.to === item.afterTo)
      const insertAt = idx >= 0 ? idx + 1 : merged.length
      merged.splice(insertAt, 0, {
        label: item.label,
        to: item.to,
        icon: item.icon,
        exact: item.exact,
      })
    }
    return merged
  })

  function isActiveRoute(to: string, exact: boolean) {
    if (exact) return route.path === to
    return route.path === to || route.path.startsWith(`${to}/`)
  }

  // ─────────────────────────────────────────────
  // New Job button
  // ─────────────────────────────────────────────

  const newJobResetSignal = useState('new-job-reset-signal', () => 0)

  function handleNewJobClick() {
    const newJobPath = tenantPath('jobs/new')
    if (route.path === newJobPath) {
      newJobResetSignal.value++
    } else {
      navigateTo(newJobPath)
    }
  }

  // ─────────────────────────────────────────────
  // Mobile sidebar drawer
  // ─────────────────────────────────────────────

  const sidebarOpen = useState('dashboard-sidebar-open', () => false)

  function closeSidebar() {
    sidebarOpen.value = false
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  watch(() => route.path, () => {
    sidebarOpen.value = false
  })

  return {
    navItems,
    isActiveRoute,
    activeJobId,
    activeJobTitle,
    activeJobStatus,
    activeJobSlug,
    activeJobPublicUrl,
    canViewPublicJob,
    getJobStatusLabel,
    jobTabs,
    jobStatusBadgeClasses,
    handleNewJobClick,
    newJobResetSignal,
    isDemo,
    showAtsNav,
    showPlatformNav,
    isSaasAdmin,
    hasOrgContext,
    sidebarOpen,
    closeSidebar,
    toggleSidebar,
  }
}

export async function useDashboardUser() {
  const localePath = useLocalePath()
  const { t } = useI18n()
  const { data: session } = await authClient.useSession(useFetch)
  const isSigningOut = ref(false)

  const userName = computed(() => session.value?.user?.name ?? t('dashboard.topBar.user'))
  const userEmail = computed(() => session.value?.user?.email ?? '')
  const userInitials = computed(() => {
    const name = userName.value
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      const first = parts[0] ?? ''
      const second = parts[1] ?? ''
      return ((first[0] ?? '') + (second[0] ?? '')).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  })

  async function handleSignOut() {
    isSigningOut.value = true
    await authClient.signOut()
    clearNuxtData()
    await navigateTo(localePath('/'))
  }

  return {
    session,
    userName,
    userEmail,
    userInitials,
    isSigningOut,
    handleSignOut,
  }
}
