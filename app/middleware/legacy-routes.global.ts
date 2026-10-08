/**
 * Redirect legacy /dashboard and /jobs URLs to tenant-scoped routes.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const path = to.path.replace(/^\/(en|pt-BR)/, '') || to.path

  if (path === '/auth/sign-up') {
    return navigateTo(localePath('/'), { redirectCode: 301 })
  }

  if (path.startsWith('/dashboard/saas') || path === '/dashboard/saas') {
    const rest = path.replace(/^\/dashboard\/saas\/?/, '')
    return navigateTo(localePath(rest ? `/admin/${rest}` : '/admin'), { redirectCode: 301 })
  }

  if (path === '/dashboard/updates') {
    return navigateTo(localePath('/admin/updates'), { redirectCode: 301 })
  }

  if (path === '/app' || path.startsWith('/app/')) {
    const rest = path.replace(/^\/app\/?/, '')
    return navigateTo(localePath(rest ? `/admin/${rest}` : '/admin'), { redirectCode: 301 })
  }

  const orgAppMatch = path.match(/^\/([^/]+)\/app(\/.*)?$/)
  if (orgAppMatch && !['admin', 'api', 'auth', 'jobs'].includes(orgAppMatch[1]!)) {
    const orgSlug = orgAppMatch[1]!
    const rest = orgAppMatch[2]?.replace(/^\//, '') ?? ''
    const target = rest ? `/${orgSlug}/admin/${rest}` : `/${orgSlug}/admin`
    return navigateTo(localePath(target), { redirectCode: 301 })
  }

  if (path.startsWith('/dashboard')) {
    const rest = path.replace(/^\/dashboard\/?/, '')
    try {
      const active = await $fetch<{ slug: string | null }>('/api/tenant/active-org', {
        headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
      })
      if (active.slug) {
        const target = rest ? `/${active.slug}/admin/${rest}` : `/${active.slug}/admin`
        return navigateTo(localePath(target), { redirectCode: 301, external: true })
      }
    }
    catch {
      // fall through
    }
    return navigateTo(localePath('/auth/sign-in'))
  }

  const jobsMatch = path.match(/^\/jobs\/([^/]+)(\/.*)?$/)
  if (jobsMatch) {
    const jobSlug = jobsMatch[1]!
    const suffix = jobsMatch[2] ?? ''
    try {
      const job = await $fetch<{ organizationSlug?: string }>(`/api/public/jobs/${jobSlug}`)
      const orgSlug = (job as { organizationSlug?: string }).organizationSlug
      if (orgSlug) {
        return navigateTo(localePath(`/${orgSlug}/${jobSlug}${suffix}`), { redirectCode: 301 })
      }
    }
    catch {
      // legacy global job lookup — try fetching and resolve org from response
      try {
        const job = await $fetch<{ organizationName?: string, slug?: string }>(`/api/public/jobs/${jobSlug}`)
        void job
      }
      catch { /* ignore */ }
    }
  }

  if (path === '/jobs') {
    return navigateTo(localePath('/auth/sign-in'))
  }
})
