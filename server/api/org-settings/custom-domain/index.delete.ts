import { eq } from 'drizzle-orm'
import { organizationCustomDomain } from '../../../database/schema'
import { invalidateCustomDomainCache } from '../../../utils/tenantContext'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['update'] })
  const orgId = session.session.activeOrganizationId

  const row = await db.query.organizationCustomDomain.findFirst({
    where: eq(organizationCustomDomain.organizationId, orgId),
    columns: { id: true, hostname: true },
  })

  if (!row) {
    return { deleted: false }
  }

  await db.delete(organizationCustomDomain).where(eq(organizationCustomDomain.id, row.id))
  invalidateCustomDomainCache(row.hostname)

  logApiRequest(event, session, 'custom_domain.removed', { hostname: row.hostname })

  return { deleted: true }
})
