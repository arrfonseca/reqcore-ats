import { z } from 'zod'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'
import { fetchPlatformDashboardMetrics } from '../../../utils/saasAnalytics'

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
})

/**
 * GET /api/saas/analytics/dashboard
 * Global platform usage metrics aggregated across all tenants.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAnalytics: ['read'] })
  const query = await getValidatedQuery(event, querySchema.parse)
  return fetchPlatformDashboardMetrics(query.days)
})
