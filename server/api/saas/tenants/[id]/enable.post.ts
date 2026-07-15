import { eq } from 'drizzle-orm'
import { organization } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'
import { serializeTenant } from '../../../../utils/saasTenants'
import { TENANT_STATUS_ACTIVE } from '../../../../utils/tenantAccess'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { tenant: ['suspend'] })
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant id required' })
  }

  const [updated] = await db
    .update(organization)
    .set({
      status: TENANT_STATUS_ACTIVE,
      suspendedAt: null,
      archivedAt: null,
      suspendedReason: null,
    })
    .where(eq(organization.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  return { tenant: serializeTenant(updated) }
})
