import { eq } from 'drizzle-orm'
import { organization, tenantAiSettings, tenantSubscription } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'
import { serializeTenant } from '../../../../utils/saasTenants'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { tenant: ['read'] })
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant id required' })
  }

  const row = await db.query.organization.findFirst({
    where: eq(organization.id, id),
  })
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const [subscription, aiSettings] = await Promise.all([
    db.query.tenantSubscription.findFirst({
      where: eq(tenantSubscription.organizationId, id),
    }),
    db.query.tenantAiSettings.findFirst({
      where: eq(tenantAiSettings.organizationId, id),
    }),
  ])

  return {
    tenant: serializeTenant(row),
    subscription: subscription ?? {
      planTier: 'free',
      status: 'active',
      externalCustomerId: null,
      currentPeriodEnd: null,
    },
    aiSettings: aiSettings ?? {
      usePlatformAi: true,
      allowOwnLlm: false,
    },
  }
})
