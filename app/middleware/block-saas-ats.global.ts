/**
 * Redirect SaaS operators without tenant impersonation away from ATS routes.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const pathWithoutLocale = to.path.replace(/^\/(en|pt-BR)/, '') || to.path

  const isPlatformAdmin = pathWithoutLocale === '/admin'
    || pathWithoutLocale.startsWith('/admin/')
    || pathWithoutLocale === '/app'
    || pathWithoutLocale.startsWith('/app/')

  if (isPlatformAdmin) return

  const isLegacyDashboard = pathWithoutLocale.includes('/dashboard')
  const isOrgAdmin = /\/admin(\/|$)/.test(pathWithoutLocale) && !isPlatformAdmin

  if (!isLegacyDashboard && !isOrgAdmin) return

  if (isLegacyDashboard) {
    if (pathWithoutLocale.includes('/dashboard/saas')) return
    if (pathWithoutLocale.includes('/dashboard/updates')) return
  }

  const atsSuffixes = [
    '/jobs',
    '/candidates',
    '/applications',
    '/interviews',
    '/timeline',
    '/source-tracking',
    '/ai-analysis',
    '/chatbot',
    '/settings',
  ]

  let isAtsRoute = false
  if (isLegacyDashboard) {
    isAtsRoute = atsSuffixes.some(p =>
      pathWithoutLocale === `/dashboard${p}` || pathWithoutLocale.startsWith(`/dashboard${p}/`),
    ) || pathWithoutLocale === '/dashboard'
  }
  else if (isOrgAdmin) {
    isAtsRoute = atsSuffixes.some(p =>
      pathWithoutLocale.endsWith(`/admin${p}`) || pathWithoutLocale.includes(`/admin${p}/`),
    ) || /\/admin$/.test(pathWithoutLocale)
  }

  if (!isAtsRoute) return

  try {
    const status = await $fetch<{ isSaasAdmin: boolean }>('/api/saas/status', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })
    if (!status.isSaasAdmin) return

    const { data: session } = await authClient.useSession(useFetch)
    const activeOrgId = session.value?.session?.activeOrganizationId
    if (activeOrgId) return

    return navigateTo(localePath('/admin'))
  }
  catch {
    // allow navigation if status check fails
  }
})
