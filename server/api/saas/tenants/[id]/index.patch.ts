import { eq } from 'drizzle-orm'
import { organization } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'
import { updateSaasTenantSchema } from '../../../../utils/schemas/saasTenant'
import { serializeTenant } from '../../../../utils/saasTenants'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { tenant: ['update'] })
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant id required' })
  }

  const body = await readValidatedBody(event, updateSaasTenantSchema.parse)

  const [updated] = await db
    .update(organization)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.legalName !== undefined ? { legalName: body.legalName } : {}),
      ...(body.taxId !== undefined ? { taxId: body.taxId } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.street !== undefined ? { street: body.street } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.state !== undefined ? { state: body.state } : {}),
      ...(body.postalCode !== undefined ? { postalCode: body.postalCode } : {}),
      ...(body.country !== undefined ? { country: body.country } : {}),
      ...(body.suspendedReason !== undefined ? { suspendedReason: body.suspendedReason } : {}),
    })
    .where(eq(organization.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  return { tenant: serializeTenant(updated) }
})
