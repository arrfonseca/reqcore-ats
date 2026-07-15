import { eq } from 'drizzle-orm'
import { organization } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'
import { suspendTenantSchema } from '../../../../utils/schemas/saasTenant'
import { serializeTenant } from '../../../../utils/saasTenants'
import { TENANT_STATUS_SUSPENDED } from '../../../../utils/tenantAccess'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { tenant: ['suspend'] })
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant id required' })
  }

  const body = await readValidatedBody(event, suspendTenantSchema.parse)

  const [updated] = await db
    .update(organization)
    .set({
      status: TENANT_STATUS_SUSPENDED,
      suspendedAt: new Date(),
      archivedAt: null,
      suspendedReason: body.reason ?? null,
    })
    .where(eq(organization.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  return { tenant: serializeTenant(updated) }
})
