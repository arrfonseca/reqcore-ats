import type { TenantContext } from '~~/shared/tenant-routing'

export interface SerializedTenantContext {
  resolved: boolean
  mode: 'platform' | 'org-slug-path' | 'custom-host'
  isCustomDomain: boolean
  orgSlug: string | null
  organizationId: string | null
  orgName: string | null
  orgLogoLightUrl: string | null
  orgLogoDarkUrl: string | null
  orgBrandSubtitle: string | null
  publicBasePath: string
  adminBasePath: string
  orgBasePath: string
}

const TENANT_STATE_KEY = 'tenant-context'

export function useTenantContext() {
  const tenant = useState<SerializedTenantContext | null>(TENANT_STATE_KEY, () => null)

  async function refreshTenantContext(forPath?: string) {
    const data = await $fetch<SerializedTenantContext>('/api/tenant/context', {
      query: forPath ? { path: forPath } : undefined,
    })
    tenant.value = data
    return data
  }

  const isCustomDomain = computed(() => tenant.value?.isCustomDomain ?? false)
  const orgSlug = computed(() => tenant.value?.orgSlug ?? null)
  const organizationId = computed(() => tenant.value?.organizationId ?? null)
  const isTenantResolved = computed(() => tenant.value?.resolved ?? false)

  return {
    tenant,
    refreshTenantContext,
    isCustomDomain,
    orgSlug,
    organizationId,
    isTenantResolved,
  }
}

/**
 * Build tenant-aware paths for navigation links.
 */
export function useTenantPaths() {
  const localePath = useLocalePath()
  const route = useRoute()
  const { activeOrg } = useCurrentOrg()
  const { tenant, isCustomDomain, orgSlug: contextOrgSlug } = useTenantContext()
  const config = useRuntimeConfig()

  /** Org slug from URL param, tenant context, or active session org */
  const effectiveOrgSlug = computed(() => {
    const param = route.params.orgSlug as string | undefined
    if (param && param !== 'undefined') return param
    if (contextOrgSlug.value) return contextOrgSlug.value
    return activeOrg.value?.slug ?? null
  })

  function normalizeSubpath(subpath: string): string {
    const trimmed = subpath.replace(/^\/+/, '').replace(/\/+$/, '')
    return trimmed
  }

  /** Org admin path: /{orgSlug}/admin/... or /admin/... on custom domain */
  function tenantPath(subpath = ''): string {
    const slug = effectiveOrgSlug.value
    const normalized = normalizeSubpath(subpath)

    if (tenant.value?.isCustomDomain) {
      const base = tenant.value.adminBasePath.replace(/\/$/, '')
      return normalized ? `${base}/${normalized}` : base
    }

    if (!slug) {
      // Legacy fallback during migration
      return localePath(normalized ? `/dashboard/${normalized}` : '/dashboard')
    }

    const base = `/${slug}/admin`
    return localePath(normalized ? `${base}/${normalized}` : base)
  }

  /** Public careers home */
  function publicBasePath(): string {
    if (tenant.value?.isCustomDomain) {
      return localePath(tenant.value.publicBasePath || '/')
    }
    const slug = effectiveOrgSlug.value
    if (!slug) return localePath('/jobs')
    return localePath(`/${slug}`)
  }

  /** Public job detail / apply path */
  function publicJobPath(jobSlug: string, suffix = ''): string {
    const slug = effectiveOrgSlug.value
    if (tenant.value?.isCustomDomain) {
      return localePath(`/${jobSlug}${suffix}`)
    }
    if (!slug) return localePath(`/jobs/${jobSlug}${suffix}`)
    return localePath(`/${slug}/${jobSlug}${suffix}`)
  }

  /** Platform SaaS admin paths — always on platform host */
  function platformPath(subpath = ''): string {
    const normalized = normalizeSubpath(subpath)
    const base = '/admin'
    return localePath(normalized ? `${base}/${normalized}` : base)
  }

  /** Auth sign-in with return URL on current tenant */
  function authSignInPath(): string {
    return localePath('/auth/sign-in')
  }

  function platformOrigin(): string {
    const host = config.public.platformHost as string | undefined
    if (host) return `https://${host.replace(/^https?:\/\//, '')}`
    return (config.public.siteUrl as string) || 'https://reqcore.com'
  }

  return {
    effectiveOrgSlug,
    isCustomDomain,
    tenantPath,
    publicBasePath,
    publicJobPath,
    platformPath,
    authSignInPath,
    platformOrigin,
  }
}

export type { TenantContext }
