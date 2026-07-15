import { and, asc, count, eq, ilike, inArray, or } from 'drizzle-orm'
import { member, organization, tenantSubscription } from '../database/schema'

export function buildTenantListQuery(filters: {
  search?: string
  status?: string
}) {
  const conditions = []
  if (filters.status) {
    conditions.push(eq(organization.status, filters.status))
  }
  if (filters.search?.trim()) {
    const escaped = filters.search.trim().replace(/[\\%_]/g, '\\$&')
    const pattern = `%${escaped}%`
    conditions.push(
      or(
        ilike(organization.name, pattern),
        ilike(organization.slug, pattern),
        ilike(organization.legalName, pattern),
        ilike(organization.taxId, pattern),
      )!,
    )
  }
  return conditions.length > 0 ? and(...conditions) : undefined
}

export async function fetchTenantList(params: {
  where: ReturnType<typeof buildTenantListQuery>
  limit: number
  offset: number
}) {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      country: organization.country,
      createdAt: organization.createdAt,
      planTier: tenantSubscription.planTier,
      subscriptionStatus: tenantSubscription.status,
    })
    .from(organization)
    .leftJoin(tenantSubscription, eq(tenantSubscription.organizationId, organization.id))
    .where(params.where)
    .orderBy(asc(organization.name))
    .limit(params.limit)
    .offset(params.offset)

  const total = await db.$count(organization, params.where)

  const orgIds = rows.map(r => r.id)
  const countMap = new Map<string, number>()
  if (orgIds.length > 0) {
    const counts = await db
      .select({ organizationId: member.organizationId, memberCount: count() })
      .from(member)
      .where(inArray(member.organizationId, orgIds))
      .groupBy(member.organizationId)
    for (const c of counts) {
      countMap.set(c.organizationId, Number(c.memberCount))
    }
  }

  const data = rows.map(r => ({
    ...r,
    memberCount: countMap.get(r.id) ?? 0,
  }))

  return { data, total }
}

export function serializeTenant(row: typeof organization.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo,
    status: row.status,
    legalName: row.legalName,
    taxId: row.taxId,
    phone: row.phone,
    street: row.street,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    suspendedAt: row.suspendedAt,
    archivedAt: row.archivedAt,
    suspendedReason: row.suspendedReason,
    createdAt: row.createdAt,
  }
}
