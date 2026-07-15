import { eq } from 'drizzle-orm'
import { orgSettings } from '../../database/schema'
import { updateOrgSettingsSchema } from '../../utils/schemas/orgSettings'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['update'] })
  const orgId = session.session.activeOrganizationId

  const body = await readValidatedBody(event, updateOrgSettingsSchema.parse)

  // Name/date formats are managed at platform level by country.
  const [result] = await db
    .insert(orgSettings)
    .values({
      organizationId: orgId,
      nameDisplayFormat: 'first_last',
      dateFormat: 'dmy',
      companyWebsiteUrl: body.companyWebsiteUrl ?? null,
      brandSubtitle: body.brandSubtitle ?? null,
    })
    .onConflictDoUpdate({
      target: orgSettings.organizationId,
      set: {
        ...(body.companyWebsiteUrl !== undefined && { companyWebsiteUrl: body.companyWebsiteUrl }),
        ...(body.brandSubtitle !== undefined && { brandSubtitle: body.brandSubtitle }),
        updatedAt: new Date(),
      },
    })
    .returning({
      nameDisplayFormat: orgSettings.nameDisplayFormat,
      dateFormat: orgSettings.dateFormat,
      companyWebsiteUrl: orgSettings.companyWebsiteUrl,
      brandSubtitle: orgSettings.brandSubtitle,
    })

  if (!result) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to save settings' })
  }

  logApiRequest(event, session, 'org_settings.updated', {})

  return result
})
