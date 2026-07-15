/**
 * Exposes tenant path helpers on the Nuxt app instance so templates can use
 * `$tenantPath`, `$publicJobPath`, etc. (matches existing org-scoped admin pages).
 */
export default defineNuxtPlugin(() => {
  const {
    tenantPath,
    publicBasePath,
    publicJobPath,
    platformPath,
    authSignInPath,
    platformOrigin,
    effectiveOrgSlug,
  } = useTenantPaths()

  return {
    provide: {
      tenantPath,
      publicBasePath,
      publicJobPath,
      platformPath,
      authSignInPath,
      platformOrigin,
      effectiveOrgSlug,
    },
  }
})
