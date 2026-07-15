export interface OrgBrandingState {
  orgName: string | null
  orgSlug: string | null
  logoLightUrl: string | null
  logoDarkUrl: string | null
  brandSubtitle: string | null
  hasOrgLogo: boolean
}

const EMPTY_BRANDING: OrgBrandingState = {
  orgName: null,
  orgSlug: null,
  logoLightUrl: null,
  logoDarkUrl: null,
  brandSubtitle: null,
  hasOrgLogo: false,
}

/**
 * Resolves org branding from tenant context, route query, or authenticated API.
 */
export function useOrgBranding(options?: { orgSlug?: MaybeRef<string | null | undefined> }) {
  const route = useRoute()
  const { tenant } = useTenantContext()
  const { activeOrg } = useCurrentOrg()
  const { isDark } = useColorMode()

  const overrideSlug = computed(() => {
    const fromOpt = options?.orgSlug != null ? toValue(options.orgSlug) : null
    if (fromOpt) return fromOpt
    const fromQuery = route.query.org
    if (typeof fromQuery === 'string' && fromQuery) return fromQuery
    if (tenant.value?.resolved && tenant.value.orgSlug) return tenant.value.orgSlug
    return activeOrg.value?.slug ?? null
  })

  /** Org-scoped admin (not platform /admin SaaS console). */
  const isTenantOrgAdmin = computed(() => {
    const orgSlugParam = route.params.orgSlug as string | undefined
    if (orgSlugParam && orgSlugParam !== 'undefined') return true
    if (tenant.value?.resolved && tenant.value.orgSlug) return true
    return !!activeOrg.value?.slug
  })

  const fromTenant = computed<OrgBrandingState>(() => {
    if (!tenant.value?.resolved) return EMPTY_BRANDING
    const logoLightUrl = tenant.value.orgLogoLightUrl
    const logoDarkUrl = tenant.value.orgLogoDarkUrl
    return {
      orgName: tenant.value.orgName,
      orgSlug: tenant.value.orgSlug,
      logoLightUrl,
      logoDarkUrl,
      brandSubtitle: tenant.value.orgBrandSubtitle ?? null,
      hasOrgLogo: !!(logoLightUrl || logoDarkUrl),
    }
  })

  const { data: fetchedBranding, refresh: refreshBranding } = useFetch(
    () => overrideSlug.value
      ? `/api/public/orgs/${encodeURIComponent(overrideSlug.value!)}/branding`
      : null,
    {
      key: () => `org-branding-public-${overrideSlug.value ?? 'none'}`,
      watch: [overrideSlug],
    },
  )

  const { data: adminBranding, refresh: refreshAdminBranding } = useFetch(
    () => isTenantOrgAdmin.value ? '/api/org-settings/branding' : null,
    {
      key: 'org-settings-branding',
      headers: useRequestHeaders(['cookie']),
    },
  )

  const branding = computed<OrgBrandingState>(() => {
    if (adminBranding.value) {
      const logoLightUrl = adminBranding.value.logoLightUrl
      const logoDarkUrl = adminBranding.value.logoDarkUrl
      if (logoLightUrl || logoDarkUrl || adminBranding.value.brandSubtitle) {
        return {
          orgName: adminBranding.value.orgName,
          orgSlug: adminBranding.value.orgSlug,
          logoLightUrl,
          logoDarkUrl,
          brandSubtitle: adminBranding.value.brandSubtitle ?? null,
          hasOrgLogo: !!(logoLightUrl || logoDarkUrl),
        }
      }
    }

    if (fromTenant.value.hasOrgLogo || fromTenant.value.brandSubtitle) {
      return fromTenant.value
    }

    if (fetchedBranding.value) {
      const logoLightUrl = fetchedBranding.value.logoLightUrl
      const logoDarkUrl = fetchedBranding.value.logoDarkUrl
      return {
        orgName: fetchedBranding.value.orgName,
        orgSlug: fetchedBranding.value.orgSlug,
        logoLightUrl,
        logoDarkUrl,
        brandSubtitle: fetchedBranding.value.brandSubtitle ?? null,
        hasOrgLogo: !!(logoLightUrl || logoDarkUrl),
      }
    }

    if (fromTenant.value.orgName) return fromTenant.value

    if (activeOrg.value) {
      return {
        orgName: activeOrg.value.name ?? null,
        orgSlug: activeOrg.value.slug ?? null,
        logoLightUrl: null,
        logoDarkUrl: null,
        brandSubtitle: null,
        hasOrgLogo: false,
      }
    }

    return EMPTY_BRANDING
  })

  function resolveLogoUrl(variant: 'auto' | 'light' | 'dark' = 'auto'): string | null {
    const { logoLightUrl, logoDarkUrl } = branding.value
    if (variant === 'light') return logoLightUrl
    if (variant === 'dark') return logoDarkUrl

    if (isDark.value) return logoDarkUrl ?? logoLightUrl
    return logoLightUrl ?? logoDarkUrl
  }

  return {
    branding,
    resolveLogoUrl,
    refreshBranding,
    refreshAdminBranding,
    adminBranding,
  }
}
