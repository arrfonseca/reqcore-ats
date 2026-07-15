/**
 * Require-org middleware — redirects users without an active organization.
 * SaaS admins go to the org picker; others go to onboarding.
 * Must be used after the `auth` middleware.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { data: session } = await authClient.useSession(useFetch)
  const localePath = useLocalePath()

  if (!session.value) return

  const activeOrganizationId = session.value.session?.activeOrganizationId
  if (activeOrganizationId) return

  let isSaasAdminUserFlag = false
  try {
    const status = await $fetch<{ isSaasAdmin: boolean }>('/api/saas/status', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })
    isSaasAdminUserFlag = status.isSaasAdmin
  }
  catch {
    isSaasAdminUserFlag = false
  }

  if (isSaasAdminUserFlag) {
    return navigateTo(localePath('/admin'))
  }

  return navigateTo(localePath('/onboarding/create-org'))
})
