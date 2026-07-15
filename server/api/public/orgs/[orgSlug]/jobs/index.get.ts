import { eq, and, desc, ilike, or } from 'drizzle-orm'
import { z } from 'zod'
import { job, organization } from '~~/server/database/schema'
import { getOrgBrandingKeysByOrgId, keysToPublicUrls } from '~~/server/utils/orgBranding'
import { publicJobsQuerySchema } from '~~/server/utils/schemas/publicApplication'
import { isReservedOrgSlug } from '~~/shared/tenant-routing'

const paramsSchema = z.object({
  orgSlug: z.string().min(1),
})

/**
 * GET /api/public/orgs/:orgSlug/jobs
 * Lists open jobs for a single organization.
 */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await getValidatedRouterParams(event, paramsSchema.parse)
  if (isReservedOrgSlug(orgSlug)) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true, name: true },
  })
  if (!org) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
  }

  const brandingKeys = await getOrgBrandingKeysByOrgId(org.id)
  const brandingUrls = keysToPublicUrls(orgSlug, brandingKeys)

  const query = await getValidatedQuery(event, publicJobsQuerySchema.parse)
  const offset = (query.page - 1) * query.limit

  const conditions = [
    eq(job.status, 'open'),
    eq(job.organizationId, org.id),
  ]

  if (query.search) {
    const escaped = query.search.replace(/[%_\\]/g, '\\$&')
    const pattern = `%${escaped}%`
    conditions.push(
      or(
        ilike(job.title, pattern),
        ilike(job.location, pattern),
      )!,
    )
  }

  if (query.type) {
    conditions.push(eq(job.type, query.type))
  }

  if (query.location) {
    const escapedLoc = query.location.replace(/[%_\\]/g, '\\$&')
    conditions.push(ilike(job.location, `%${escapedLoc}%`))
  }

  const where = and(...conditions)

  const [data, total] = await Promise.all([
    db.query.job.findMany({
      where,
      limit: query.limit,
      offset,
      orderBy: [desc(job.createdAt)],
      columns: {
        id: true,
        title: true,
        slug: true,
        description: true,
        location: true,
        type: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryUnit: true,
        remoteStatus: true,
        createdAt: true,
      },
    }),
    db.$count(job, where),
  ])

  return {
    data: data.map(j => ({
      ...j,
      organizationName: org.name,
      organizationLogo: brandingUrls.logoLightUrl,
      organizationLogoLightUrl: brandingUrls.logoLightUrl,
      organizationLogoDarkUrl: brandingUrls.logoDarkUrl,
    })),
    total,
    page: query.page,
    limit: query.limit,
    organization: {
      id: org.id,
      slug: orgSlug,
      name: org.name,
      logoLightUrl: brandingUrls.logoLightUrl,
      logoDarkUrl: brandingUrls.logoDarkUrl,
      logo: brandingUrls.logoLightUrl,
    },
  }
})
