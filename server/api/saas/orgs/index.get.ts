import { z } from 'zod'
import { asc, and, ilike, or } from 'drizzle-orm'
import { organization } from '../../../database/schema'

const saasOrgsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
})

/**
 * GET /api/saas/orgs
 * Lists all organizations for SaaS admins (cross-tenant).
 */
export default defineEventHandler(async (event) => {
  await requireSaasAdmin(event)

  const query = await getValidatedQuery(event, saasOrgsQuerySchema.parse)
  const offset = (query.page - 1) * query.limit

  const conditions = []
  if (query.search?.trim()) {
    const escaped = query.search.trim().replace(/[\\%_]/g, '\\$&')
    const pattern = `%${escaped}%`
    conditions.push(
      or(
        ilike(organization.name, pattern),
        ilike(organization.slug, pattern),
      )!,
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [data, total] = await Promise.all([
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
      })
      .from(organization)
      .where(where)
      .orderBy(asc(organization.name))
      .limit(query.limit)
      .offset(offset),
    db.$count(organization, where),
  ])

  return { data, total, page: query.page, limit: query.limit }
})
