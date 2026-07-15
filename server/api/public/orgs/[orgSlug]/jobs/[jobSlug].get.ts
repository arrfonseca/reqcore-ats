import { eq, and, asc } from 'drizzle-orm'
import { z } from 'zod'
import { job, orgSettings, organization } from '~~/server/database/schema'
import { getOrgBrandingKeysByOrgId, keysToPublicUrls } from '~~/server/utils/orgBranding'
import { publicJobSlugSchema } from '~~/server/utils/schemas/publicApplication'
import { isReservedOrgSlug } from '~~/shared/tenant-routing'

const paramsSchema = z.object({
  orgSlug: z.string().min(1),
  jobSlug: publicJobSlugSchema.shape.slug,
})

/**
 * GET /api/public/orgs/:orgSlug/jobs/:jobSlug
 * Returns job details scoped to organization.
 */
export default defineEventHandler(async (event) => {
  const { orgSlug, jobSlug } = await getValidatedRouterParams(event, paramsSchema.parse)
  if (isReservedOrgSlug(orgSlug)) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true, name: true, slug: true },
  })
  if (!org) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  const result = await db.query.job.findFirst({
    where: and(
      eq(job.slug, jobSlug),
      eq(job.status, 'open'),
      eq(job.organizationId, org.id),
    ),
    columns: {
      id: true,
      title: true,
      slug: true,
      description: true,
      location: true,
      type: true,
      status: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      salaryUnit: true,
      salaryNegotiable: true,
      remoteStatus: true,
      validThrough: true,
      requireResume: true,
      requireCoverLetter: true,
      createdAt: true,
      organizationId: true,
    },
    with: {
      questions: {
        orderBy: (q, { asc: ascFn }) => [ascFn(q.displayOrder), ascFn(q.createdAt)],
        columns: {
          id: true,
          type: true,
          label: true,
          description: true,
          required: true,
          options: true,
          displayOrder: true,
        },
      },
    },
  })

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  const settings = await db.query.orgSettings.findFirst({
    where: eq(orgSettings.organizationId, org.id),
    columns: { companyWebsiteUrl: true },
  })

  const brandingKeys = await getOrgBrandingKeysByOrgId(org.id)
  const brandingUrls = keysToPublicUrls(org.slug, brandingKeys)

  const { organizationId: _orgId, ...jobData } = result
  return {
    ...jobData,
    organizationName: org.name,
    organizationLogo: brandingUrls.logoLightUrl,
    organizationLogoLightUrl: brandingUrls.logoLightUrl,
    organizationLogoDarkUrl: brandingUrls.logoDarkUrl,
    organizationSlug: org.slug,
    companyWebsiteUrl: settings?.companyWebsiteUrl ?? null,
  }
})
