import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { organization, organizationCustomDomain } from '../database/schema'
import { getOrgBrandingKeysByOrgId, keysToPublicUrls } from './orgBranding'
import {
  type TenantContext,
  buildTenantPaths,
  isPlatformPassThroughPath,
  isReservedOrgSlug,
  normalizeHostname,
} from '~~/shared/tenant-routing'

declare module 'h3' {
  interface H3EventContext {
    tenant?: TenantContext | null
    /** True when URL was rewritten from a custom domain to internal org-prefixed path */
    tenantRewritten?: boolean
  }
}

const PLATFORM_ADMIN_PREFIXES = ['/admin', '/app'] as const

/** In-memory cache for verified custom domain → org lookups (60s TTL). */
const customDomainCache = new Map<string, { expires: number, org: { id: string, slug: string, name: string } | null }>()
const CACHE_TTL_MS = 60_000

function getPlatformHosts(): Set<string> {
  const hosts = new Set<string>(['localhost', '127.0.0.1'])
  const candidates = [
    process.env.NUXT_PUBLIC_PLATFORM_HOST,
    process.env.NUXT_PUBLIC_SITE_URL,
    process.env.BETTER_AUTH_URL,
  ]
  for (const raw of candidates) {
    if (!raw) continue
    try {
      const h = normalizeHostname(new URL(raw).host)
      if (h) hosts.add(h)
    }
    catch {
      const h = normalizeHostname(raw)
      if (h) hosts.add(h)
    }
  }
  return hosts
}

export function isPlatformHost(host: string | null): boolean {
  const normalized = normalizeHostname(host)
  if (!normalized) return false
  return getPlatformHosts().has(normalized)
}

async function lookupOrgBySlug(slug: string) {
  return db.query.organization.findFirst({
    where: eq(organization.slug, slug),
    columns: { id: true, slug: true, name: true },
  })
}

async function lookupOrgByCustomHostname(hostname: string) {
  const cached = customDomainCache.get(hostname)
  if (cached && cached.expires > Date.now()) {
    return cached.org
  }

  const row = await db.query.organizationCustomDomain.findFirst({
    where: and(
      eq(organizationCustomDomain.hostname, hostname),
      eq(organizationCustomDomain.status, 'verified'),
    ),
    with: {
      organization: {
        columns: { id: true, slug: true, name: true },
      },
    },
  })

  const org = row?.organization ?? null
  customDomainCache.set(hostname, { expires: Date.now() + CACHE_TTL_MS, org })
  return org
}

export function invalidateCustomDomainCache(hostname?: string) {
  if (hostname) customDomainCache.delete(hostname.toLowerCase())
  else customDomainCache.clear()
}

async function buildContext(
  org: { id: string, slug: string, name: string },
  mode: TenantContext['mode'],
  host: string,
  isCustomDomain: boolean,
): Promise<TenantContext> {
  const paths = buildTenantPaths(org.slug, isCustomDomain)
  const keys = await getOrgBrandingKeysByOrgId(org.id)
  const urls = keysToPublicUrls(org.slug, keys)
  return {
    organizationId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    orgLogoLightUrl: urls.logoLightUrl,
    orgLogoDarkUrl: urls.logoDarkUrl,
    orgBrandSubtitle: keys.brandSubtitle,
    mode,
    host,
    isCustomDomain,
    ...paths,
  }
}

export function getTenantFromEvent(event: H3Event): TenantContext | null {
  return event.context.tenant ?? null
}

export async function resolveTenantBySlug(orgSlug: string, host: string): Promise<TenantContext | null> {
  if (isReservedOrgSlug(orgSlug)) return null
  const org = await lookupOrgBySlug(orgSlug)
  if (!org) return null
  return buildContext(org, 'org-slug-path', host, false)
}

/** Resolve tenant for client bootstrap when the API path is not org-scoped. */
export async function resolveTenantForClientPath(pathname: string, host: string | null): Promise<TenantContext | null> {
  const normalizedHost = host ?? 'localhost'
  if (isPlatformPassThroughPath(pathname)) return null

  if (isPlatformHost(normalizedHost)) {
    if (PLATFORM_ADMIN_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      return null
    }
    const first = pathname.split('/').filter(Boolean)[0]
    if (!first || isReservedOrgSlug(first)) return null
    return resolveTenantBySlug(first, normalizedHost)
  }

  const org = await lookupOrgByCustomHostname(normalizedHost)
  if (!org) return null
  return buildContext(org, 'custom-host', normalizedHost, true)
}

/**
 * Resolve tenant from host + pathname and optionally rewrite custom-domain URLs.
 */
export async function resolveAndAttachTenant(event: H3Event): Promise<void> {
  const url = getRequestURL(event)
  const pathname = url.pathname
  const host = normalizeHostname(getRequestHeader(event, 'host'))

  if (!host || isPlatformPassThroughPath(pathname)) {
    event.context.tenant = null
    return
  }

  // Platform host — org slug in first segment
  if (isPlatformHost(host)) {
    // Platform admin routes — no org tenant
    if (PLATFORM_ADMIN_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      event.context.tenant = null
      return
    }

    const segments = pathname.split('/').filter(Boolean)
    const first = segments[0]
    if (!first || isReservedOrgSlug(first)) {
      event.context.tenant = null
      return
    }

    const org = await lookupOrgBySlug(first)
    if (org) {
      event.context.tenant = await buildContext(org, 'org-slug-path', host, false)
    }
    else {
      event.context.tenant = null
    }
    return
  }

  // Custom domain — resolve by hostname and rewrite to internal org-prefixed path
  const org = await lookupOrgByCustomHostname(host)
  if (!org) {
    event.context.tenant = null
    return
  }

  event.context.tenant = await buildContext(org, 'custom-host', host, true)

  const rewritten = rewriteCustomDomainPath(pathname, org.slug)
  if (rewritten !== pathname) {
    event.node.req.url = `${rewritten}${url.search}`
    event.context.tenantRewritten = true
  }
}

/**
 * Map custom-domain public paths to internal org-prefixed paths for Nuxt routing.
 */
export function rewriteCustomDomainPath(pathname: string, orgSlug: string): string {
  if (pathname === '/' || pathname === '') {
    return `/${orgSlug}`
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return `/${orgSlug}${pathname}`
  }

  if (pathname === '/app' || pathname.startsWith('/app/')) {
    const rest = pathname === '/app' ? '/admin' : `/admin${pathname.slice(4)}`
    return `/${orgSlug}${rest}`
  }

  // Single-segment job slug or job sub-routes: /{jobSlug}, /{jobSlug}/apply, etc.
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length >= 1 && !isReservedOrgSlug(segments[0]!)) {
    return `/${orgSlug}${pathname}`
  }

  return pathname
}

/** Build absolute public URL for org careers home. */
export function buildPublicCareersUrl(params: {
  orgSlug: string
  customHostname?: string | null
  platformOrigin?: string
  query?: string
}): string {
  const origin = params.customHostname
    ? `https://${params.customHostname}`
    : (params.platformOrigin ?? 'https://reqcore.com')

  const q = params.query
    ? (params.query.startsWith('?') ? params.query : `?${params.query}`)
    : ''

  if (params.customHostname) {
    return q ? `${origin}/${q}`.replace(/\/\?/, '?') : `${origin}/`
  }

  return `${origin}/${params.orgSlug}${q}`
}

/** Build absolute public URL for a job listing. */
export function buildPublicJobUrl(params: {
  orgSlug: string
  jobSlug: string
  customHostname?: string | null
  platformOrigin?: string
  suffix?: string
}): string {
  const origin = params.customHostname
    ? `https://${params.customHostname}`
    : (params.platformOrigin ?? 'https://reqcore.com')

  const path = params.customHostname
    ? `/${params.jobSlug}${params.suffix ?? ''}`
    : `/${params.orgSlug}/${params.jobSlug}${params.suffix ?? ''}`

  return `${origin}${path}`
}

/** Serialize tenant for client bootstrap API. */
export function serializeTenantContext(tenant: TenantContext | null) {
  if (!tenant) {
    return {
      resolved: false as const,
      mode: 'platform' as const,
      isCustomDomain: false,
      orgSlug: null,
      organizationId: null,
      orgName: null,
      orgLogoLightUrl: null,
      orgLogoDarkUrl: null,
      orgBrandSubtitle: null,
      publicBasePath: '/',
      adminBasePath: '/admin',
      orgBasePath: '',
    }
  }

  return {
    resolved: true as const,
    mode: tenant.mode,
    isCustomDomain: tenant.isCustomDomain,
    orgSlug: tenant.orgSlug,
    organizationId: tenant.organizationId,
    orgName: tenant.orgName,
    orgLogoLightUrl: tenant.orgLogoLightUrl,
    orgLogoDarkUrl: tenant.orgLogoDarkUrl,
    orgBrandSubtitle: tenant.orgBrandSubtitle,
    publicBasePath: tenant.publicBasePath,
    adminBasePath: tenant.adminBasePath,
    orgBasePath: tenant.orgBasePath,
  }
}
