import { eq } from 'drizzle-orm'
import { organization, tenantSubscription } from '../../../database/schema'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { billing: ['read'] })

  const rows = await db
    .select({
      organizationId: organization.id,
      organizationName: organization.name,
      slug: organization.slug,
      status: organization.status,
      planTier: tenantSubscription.planTier,
      subscriptionStatus: tenantSubscription.status,
      externalCustomerId: tenantSubscription.externalCustomerId,
      currentPeriodEnd: tenantSubscription.currentPeriodEnd,
    })
    .from(organization)
    .leftJoin(tenantSubscription, eq(tenantSubscription.organizationId, organization.id))

  return {
    tenants: rows.map(r => ({
      organizationId: r.organizationId,
      name: r.organizationName,
      slug: r.slug,
      tenantStatus: r.status,
      planTier: r.planTier ?? 'free',
      subscriptionStatus: r.subscriptionStatus ?? 'active',
      externalCustomerId: r.externalCustomerId,
      currentPeriodEnd: r.currentPeriodEnd,
    })),
    note: 'Billing integration (Stripe) is not yet connected.',
  }
})
