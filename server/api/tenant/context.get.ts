import { getTenantFromEvent, resolveTenantForClientPath, serializeTenantContext } from '../../utils/tenantContext'

/**
 * GET /api/tenant/context
 * Returns resolved tenant context for the current request (public, no auth).
 * Pass ?path=/org-slug/... from the client so bootstrap matches the active page.
 */
export default defineEventHandler(async (event) => {
  let tenant = getTenantFromEvent(event)

  if (!tenant) {
    const path = getQuery(event).path
    if (typeof path === 'string' && path.startsWith('/')) {
      const host = getRequestHeader(event, 'host') ?? null
      tenant = await resolveTenantForClientPath(path, host)
    }
  }

  return serializeTenantContext(tenant)
})
