import { eq } from 'drizzle-orm'
import { organization } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'
import { serializeTenant } from '../../../../utils/saasTenants'
import { TENANT_STATUS_ARCHIVED } from '../../../../utils/tenantAccess'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { tenant: ['archive'] })
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant id required' })
  }

  const [updated] = await db
    .update(organization)
    .set({
      status: TENANT_STATUS_ARCHIVED,
      archivedAt: new Date(),
    })
    .where(eq(organization.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  return { tenant: serializeTenant(updated) }
})
