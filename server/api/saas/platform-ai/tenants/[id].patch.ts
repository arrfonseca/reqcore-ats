import { eq } from 'drizzle-orm'
import { organization, tenantAiSettings } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'
import { updateTenantAiSettingsSchema } from '../../../../utils/schemas/saasTenant'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['delegate'] })
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant id required' })
  }

  const body = await readValidatedBody(event, updateTenantAiSettingsSchema.parse)

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, id),
    columns: { id: true },
  })
  if (!org) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const existing = await db.query.tenantAiSettings.findFirst({
    where: eq(tenantAiSettings.organizationId, id),
  })

  if (existing) {
    const [updated] = await db
      .update(tenantAiSettings)
      .set({
        allowOwnLlm: body.allowOwnLlm,
        usePlatformAi: !body.allowOwnLlm,
        updatedAt: new Date(),
      })
      .where(eq(tenantAiSettings.organizationId, id))
      .returning()
    return { aiSettings: updated }
  }

  const [created] = await db
    .insert(tenantAiSettings)
    .values({
      organizationId: id,
      allowOwnLlm: body.allowOwnLlm,
      usePlatformAi: !body.allowOwnLlm,
    })
    .returning()

  return { aiSettings: created }
})
