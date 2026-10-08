/**
 * Ensures the org slug in the URL matches the session's active organization.
 * SaaS admins impersonate via session activeOrganizationId (not Better Auth membership).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const orgSlugParam = to.params.orgSlug as string | undefined
  if (!orgSlugParam) return

  const localePath = useLocalePath()
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  let isSaasAdminUser = false
  let sessionOrgId: string | null = null

  try {
    const status = await $fetch<{ isSaasAdmin: boolean, activeOrganizationId?: string | null }>(
      '/api/saas/status',
      { headers },
    )
    isSaasAdminUser = status.isSaasAdmin
    sessionOrgId = status.activeOrganizationId ?? null
  }
  catch {
    isSaasAdminUser = false
  }

  if (isSaasAdminUser) {
    if (!sessionOrgId) {
      return navigateTo(localePath('/admin'))
    }

    try {
      const active = await $fetch<{ slug: string | null }>('/api/tenant/active-org', { headers })
      if (active.slug === orgSlugParam) return
    }
    catch {
      // fall through
    }

    return navigateTo(localePath('/admin'))
  }

  let activeSlug: string | null = null
  try {
    const active = await $fetch<{ slug: string | null }>('/api/tenant/active-org', { headers })
    activeSlug = active.slug
  }
  catch {
    activeSlug = null
  }

  if (!activeSlug) {
    return navigateTo(localePath(`/?org=${encodeURIComponent(orgSlugParam)}`))
  }

  if (activeSlug !== orgSlugParam) {
    return navigateTo(localePath(`/${activeSlug}/admin`), { external: true })
  }
})
