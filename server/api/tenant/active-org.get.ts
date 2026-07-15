import { eq } from 'drizzle-orm'
import { organization } from '../../database/schema'

/**
 * GET /api/tenant/active-org
 * Returns the active organization's slug for post-login redirects.
 */
export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId
  if (!orgId) {
    return { slug: null }
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
    columns: { slug: true, name: true },
  })

  return { slug: org?.slug ?? null, name: org?.name ?? null }
})
