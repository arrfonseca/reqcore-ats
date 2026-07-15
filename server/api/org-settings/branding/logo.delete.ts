import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { organization } from '~~/server/database/schema'
import { invalidateCustomDomainCache } from '~~/server/utils/tenantContext'
import { logoVariantSchema } from '~~/server/utils/schemas/branding'
import { clearOrgLogoKey } from '~~/server/utils/orgBranding'

const deleteBodySchema = z.object({
  variant: logoVariantSchema,
})

/**
 * DELETE /api/org-settings/branding/logo
 * Body: { variant: 'light' | 'dark' }
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['update'] })
  const orgId = session.session.activeOrganizationId

  const body = await readValidatedBody(event, deleteBodySchema.parse)
  const previousKey = await clearOrgLogoKey(orgId, body.variant)

  if (previousKey) {
    try {
      await deleteFromS3(previousKey)
    }
    catch (err) {
      logWarn('org_branding.s3_delete_failed', {
        storage_key: previousKey,
        error_message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
    columns: { slug: true },
  })
  if (org?.slug) {
    invalidateCustomDomainCache()
  }

  logApiRequest(event, session, 'org_branding.logo_deleted', { variant: body.variant })

  return { success: true }
})
