/**
 * Requires an authenticated SaaS platform admin.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { data: session } = await authClient.useSession(useFetch)
  const localePath = useLocalePath()

  if (!session.value) {
    return navigateTo(localePath('/auth/sign-in'))
  }

  try {
    const status = await $fetch<{ isSaasAdmin: boolean }>('/api/saas/status', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })
    if (!status.isSaasAdmin) {
      const { tenantPath } = useTenantPaths()
      return navigateTo(tenantPath(''))
    }
  }
  catch {
    const { tenantPath } = useTenantPaths()
    return navigateTo(tenantPath(''))
  }
})
