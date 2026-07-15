import { z } from 'zod'
import { getOrgBrandingBySlug } from '~~/server/utils/orgBranding'

/**
 * GET /api/public/orgs/:orgSlug/branding
 * Public metadata for org white-label logos.
 */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await getValidatedRouterParams(event, z.object({
    orgSlug: z.string().min(1),
  }).parse)

  const branding = await getOrgBrandingBySlug(orgSlug)
  if (!branding) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
  }

  return {
    orgName: branding.orgName,
    orgSlug: branding.orgSlug,
    brandSubtitle: branding.brandSubtitle,
    logoLightUrl: branding.logoLightUrl,
    logoDarkUrl: branding.logoDarkUrl,
  }
})
