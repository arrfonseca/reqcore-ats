import { and, count, eq, gte, lte, sql, sum } from 'drizzle-orm'
import { z } from 'zod'
import { analysisRun, organization } from '../../../database/schema'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'
import { TENANT_STATUS_ACTIVE, TENANT_STATUS_SUSPENDED, TENANT_STATUS_ARCHIVED } from '../../../utils/tenantAccess'

const querySchema = z.object({
  organizationId: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAnalytics: ['read'] })
  const query = await getValidatedQuery(event, querySchema.parse)

  const [activeCount, suspendedCount, archivedCount, totalTenants] = await Promise.all([
    db.$count(organization, eq(organization.status, TENANT_STATUS_ACTIVE)),
    db.$count(organization, eq(organization.status, TENANT_STATUS_SUSPENDED)),
    db.$count(organization, eq(organization.status, TENANT_STATUS_ARCHIVED)),
    db.$count(organization),
  ])

  const usageConditions = []
  if (query.organizationId) {
    usageConditions.push(eq(analysisRun.organizationId, query.organizationId))
  }
  if (query.from) {
    usageConditions.push(gte(analysisRun.createdAt, new Date(`${query.from}T00:00:00.000Z`)))
  }
  if (query.to) {
    usageConditions.push(lte(analysisRun.createdAt, new Date(`${query.to}T23:59:59.999Z`)))
  }
  const usageWhere = usageConditions.length > 0 ? and(...usageConditions) : undefined

  const [usageRow] = await db
    .select({
      runs: count(),
      promptTokens: sum(analysisRun.promptTokens),
      completionTokens: sum(analysisRun.completionTokens),
    })
    .from(analysisRun)
    .where(usageWhere)

  const recentTenants = await db
    .select({
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt,
      status: organization.status,
    })
    .from(organization)
    .orderBy(sql`${organization.createdAt} desc`)
    .limit(10)

  return {
    tenants: {
      total: totalTenants,
      active: activeCount,
      suspended: suspendedCount,
      archived: archivedCount,
    },
    aiUsage: {
      analysisRuns: Number(usageRow?.runs ?? 0),
      promptTokens: Number(usageRow?.promptTokens ?? 0),
      completionTokens: Number(usageRow?.completionTokens ?? 0),
      estimatedRevenueUsd: null,
    },
    recentTenants,
    filters: {
      organizationId: query.organizationId ?? null,
      from: query.from ?? null,
      to: query.to ?? null,
    },
  }
})
