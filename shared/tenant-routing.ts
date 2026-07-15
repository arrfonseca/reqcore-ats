/**
 * Tenant routing constants — shared between app and server.
 */

/** Path segments reserved on the platform host (not valid org slugs). */
export const RESERVED_ORG_SLUGS = new Set([
  'admin',
  'app',
  'api',
  'auth',
  'login',
  'logout',
  'settings',
  'dashboard',
  'jobs',
  'join',
  'interview',
  'onboarding',
  'saas',
  'public',
  'static',
  '_nuxt',
  'favicon.ico',
  'pt-br',
  'en',
])

/** Segments that must not be used as job slugs on org public routes. */
export const RESERVED_JOB_SLUGS = new Set([
  ...RESERVED_ORG_SLUGS,
  'apply',
  'confirmation',
  'admin',
  'app',
])

export type TenantResolutionMode = 'platform' | 'org-slug-path' | 'custom-host'

export interface TenantContext {
  organizationId: string
  orgSlug: string
  orgName: string | null
  orgLogoLightUrl: string | null
  orgLogoDarkUrl: string | null
  orgBrandSubtitle: string | null
  mode: TenantResolutionMode
  /** Hostname used to resolve this tenant (custom domain or platform host). */
  host: string
  /** Whether the request is on a verified custom domain. */
  isCustomDomain: boolean
  /** Internal org slug prefix, e.g. `/armarinho-sao-jose` */
  orgBasePath: string
  /** Admin area base path for links, e.g. `/armarinho-sao-jose/admin` or `/admin` on custom host */
  adminBasePath: string
  /** Public careers home path, e.g. `/armarinho-sao-jose` or `/` on custom host */
  publicBasePath: string
}

export type CustomDomainStatus = 'pending' | 'verified' | 'disabled'

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/

export function isValidOrgSlugFormat(slug: string): boolean {
  return SLUG_PATTERN.test(slug)
}

export function isReservedOrgSlug(slug: string): boolean {
  return RESERVED_ORG_SLUGS.has(slug.toLowerCase())
}

export function validateOrgSlug(slug: string): string | null {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return 'Slug is required'
  if (!isValidOrgSlugFormat(normalized)) {
    return 'Slug must be 2–48 characters, lowercase letters, numbers, and hyphens only'
  }
  if (isReservedOrgSlug(normalized)) return 'This slug is reserved and cannot be used'
  return null
}

export function isReservedJobSlug(slug: string): boolean {
  return RESERVED_JOB_SLUGS.has(slug.toLowerCase())
}

/** Platform paths that bypass tenant slug resolution on the platform host. */
export const PLATFORM_PASS_THROUGH_PREFIXES = [
  '/api',
  '/auth',
  '/_nuxt',
  '/__nuxt',
  '/favicon',
  '/robots.txt',
  '/sitemap',
  '/join',
  '/interview',
  '/onboarding',
] as const

export function isPlatformPassThroughPath(pathname: string): boolean {
  return PLATFORM_PASS_THROUGH_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function normalizeHostname(host: string | undefined | null): string | null {
  if (!host) return null
  const bare = host.split(':')[0]?.trim().toLowerCase()
  return bare || null
}

export function buildTenantPaths(orgSlug: string, isCustomDomain: boolean) {
  if (isCustomDomain) {
    return {
      orgBasePath: `/${orgSlug}`,
      adminBasePath: '/admin',
      publicBasePath: '/',
    }
  }
  return {
    orgBasePath: `/${orgSlug}`,
    adminBasePath: `/${orgSlug}/admin`,
    publicBasePath: `/${orgSlug}`,
  }
}
