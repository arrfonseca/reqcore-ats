import {
  PLATFORM_ROLE_SAAS_ADMIN,
  saasAdminHasOrgContext,
} from '~~/shared/saasAdmin'

export type SaasOrgSummary = {
  id: string
  name: string
  slug: string
  status?: string
  country?: string | null
  memberCount?: number
  planTier?: string | null
  createdAt: string
}

/**
 * Platform SaaS admin — cross-tenant operator (not an org member role).
 */
export function useSaasAdmin() {
  const sessionState = authClient.useSession(useFetch)
  const localePath = useLocalePath()

  const { data: saasStatus, pending: isSaasStatusPending, refresh: refreshSaasStatus } = useFetch<{
    isSaasAdmin: boolean
    activeOrganizationId?: string | null
  }>(
    '/api/saas/status',
    { headers: useRequestHeaders(['cookie']) },
  )

  const isSaasAdmin = computed(() => saasStatus.value?.isSaasAdmin === true)

  const activeOrganizationId = computed(() =>
    saasStatus.value?.activeOrganizationId
    ?? sessionState.value?.data?.session?.activeOrganizationId
    ?? null,
  )

  const hasOrgContext = computed(() =>
    saasAdminHasOrgContext(isSaasAdmin.value, activeOrganizationId.value),
  )

  const allOrgs = ref<SaasOrgSummary[]>([])
  const isLoadingOrgs = ref(false)
  const orgsError = ref('')

  async function fetchAllOrgs(search = '') {
    if (!isSaasAdmin.value) return
    isLoadingOrgs.value = true
    orgsError.value = ''
    try {
      const result = await $fetch<{ data: SaasOrgSummary[] }>('/api/saas/tenants', {
        query: {
          limit: 100,
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      })
      allOrgs.value = result.data ?? []
    }
    catch (err: unknown) {
      orgsError.value = err instanceof Error ? err.message : 'Failed to load organizations'
      allOrgs.value = []
    }
    finally {
      isLoadingOrgs.value = false
    }
  }

  async function switchOrgAsSaasAdmin(organizationId: string) {
    const result = await $fetch<{ organization: { slug: string } }>('/api/saas/switch-org', {
      method: 'POST',
      body: { organizationId },
    })
    window.location.href = localePath(`/${result.organization.slug}/admin`)
  }

  async function clearOrgContext() {
    await $fetch('/api/saas/clear-org', { method: 'POST' })
    window.location.href = localePath('/admin')
  }

  return {
    PLATFORM_ROLE_SAAS_ADMIN,
    isSaasAdmin,
    hasOrgContext,
    isSessionPending: isSaasStatusPending,
    refreshSaasStatus,
    allOrgs,
    isLoadingOrgs,
    orgsError,
    fetchAllOrgs,
    switchOrgAsSaasAdmin,
    clearOrgContext,
  }
}
