import { eq } from 'drizzle-orm'
import { organization } from '~~/server/database/schema'
import { getOrgBrandingKeysByOrgId, keysToPublicUrls } from '~~/server/utils/orgBranding'

/**
 * GET /api/org-settings/branding
 * Returns public proxy URLs for the active org's light/dark logos.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['read'] })
  const orgId = session.session.activeOrganizationId

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
    columns: { slug: true, name: true },
  })

  if (!org) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
  }

  const keys = await getOrgBrandingKeysByOrgId(orgId)
  const urls = keysToPublicUrls(org.slug, keys)

  return {
    orgName: org.name,
    orgSlug: org.slug,
    brandSubtitle: keys.brandSubtitle,
    ...urls,
  }
})
