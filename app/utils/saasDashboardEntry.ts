/**
 * Post-login / guest redirect target for SaaS operators and org members.
 */
export async function resolveDashboardEntryPath(
  localePath: (path: string) => string,
): Promise<string> {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  try {
    const status = await $fetch<{ isSaasAdmin: boolean }>('/api/saas/status', { headers })
    if (status.isSaasAdmin) {
      return localePath('/admin')
    }
  }
  catch {
    // fall through to ATS dashboard
  }

  try {
    const active = await $fetch<{ slug: string | null }>('/api/tenant/active-org', { headers })
    if (active.slug) {
      return localePath(`/${active.slug}/admin`)
    }
  }
  catch {
    // fall through
  }

  return localePath('/onboarding/create-org')
}
