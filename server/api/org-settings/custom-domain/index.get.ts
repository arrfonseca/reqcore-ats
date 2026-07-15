import { eq } from 'drizzle-orm'
import { organizationCustomDomain } from '../../../database/schema'
import { getCustomDomainCnameTarget } from '../../../utils/customDomain'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['update'] })
  const orgId = session.session.activeOrganizationId

  const row = await db.query.organizationCustomDomain.findFirst({
    where: eq(organizationCustomDomain.organizationId, orgId),
    columns: {
      id: true,
      hostname: true,
      status: true,
      verificationToken: true,
      verifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return {
    domain: row ?? null,
    cnameTarget: getCustomDomainCnameTarget(),
  }
})
