import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'
import { saasTenantsQuerySchema } from '../../../utils/schemas/saasTenant'
import { buildTenantListQuery, fetchTenantList } from '../../../utils/saasTenants'

/**
 * GET /api/saas/tenants
 * List tenants with status, member counts, and subscription stub.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { tenant: ['list'] })
  const query = await getValidatedQuery(event, saasTenantsQuerySchema.parse)
  const where = buildTenantListQuery({ search: query.search, status: query.status })
  const offset = (query.page - 1) * query.limit

  const { data, total } = await fetchTenantList({ where, limit: query.limit, offset })

  return { data, total, page: query.page, limit: query.limit }
})
