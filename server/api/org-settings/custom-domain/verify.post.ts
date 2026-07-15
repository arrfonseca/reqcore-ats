import { eq } from 'drizzle-orm'
import { organizationCustomDomain } from '../../../database/schema'
import { verifyCustomDomainDns } from '../../../utils/customDomain'
import { invalidateCustomDomainCache } from '../../../utils/tenantContext'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['update'] })
  const orgId = session.session.activeOrganizationId

  const row = await db.query.organizationCustomDomain.findFirst({
    where: eq(organizationCustomDomain.organizationId, orgId),
  })

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'No custom domain configured' })
  }

  const result = await verifyCustomDomainDns(row.hostname, row.verificationToken)

  if (!result.verified) {
    return {
      verified: false,
      cnameOk: result.cnameOk,
      txtOk: result.txtOk,
      expectedCname: result.expectedCname,
      status: row.status,
    }
  }

  const [updated] = await db
    .update(organizationCustomDomain)
    .set({
      status: 'verified',
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizationCustomDomain.id, row.id))
    .returning({
      id: organizationCustomDomain.id,
      hostname: organizationCustomDomain.hostname,
      status: organizationCustomDomain.status,
      verifiedAt: organizationCustomDomain.verifiedAt,
    })

  invalidateCustomDomainCache(row.hostname)

  logApiRequest(event, session, 'custom_domain.verified', { hostname: row.hostname })

  return {
    verified: true,
    cnameOk: result.cnameOk,
    txtOk: result.txtOk,
    expectedCname: result.expectedCname,
    domain: updated,
  }
})
