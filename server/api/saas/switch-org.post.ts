import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { organization } from '../../database/schema'

const switchOrgSchema = z.object({
  organizationId: z.string().min(1),
})

/**
 * POST /api/saas/switch-org
 * Sets active organization for a SaaS admin without org membership.
 */
export default defineEventHandler(async (event) => {
  const session = await requireSaasAdmin(event)
  const body = await readValidatedBody(event, switchOrgSchema.parse)

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, body.organizationId),
    columns: { id: true, name: true, slug: true },
  })

  if (!org) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
  }

  await setSessionActiveOrganization(session.session.id, org.id)

  logInfo('saas_admin.org_switch', {
    user_id: session.user.id,
    organization_id: org.id,
    organization_slug: org.slug,
  })

  return {
    success: true,
    organization: org,
  }
})
