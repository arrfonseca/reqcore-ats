import { resolveAndAttachTenant } from '../utils/tenantContext'

/**
 * Resolve tenant context from Host header and URL path.
 * Rewrites custom-domain requests to internal org-prefixed paths.
 */
export default defineEventHandler(async (event) => {
  await resolveAndAttachTenant(event)
})
