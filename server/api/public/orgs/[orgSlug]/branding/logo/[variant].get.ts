import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { organization } from '~~/server/database/schema'
import { getOrgBrandingKeysByOrgId } from '~~/server/utils/orgBranding'
import { logoVariantSchema } from '~~/server/utils/schemas/branding'

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
}

/**
 * GET /api/public/orgs/:orgSlug/branding/logo/:variant
 * Streams org logo from S3 with cache headers.
 * SVGs are served inline (trusted org-admin uploads only).
 */
export default defineEventHandler(async (event) => {
  const { orgSlug, variant } = await getValidatedRouterParams(event, z.object({
    orgSlug: z.string().min(1),
    variant: logoVariantSchema,
  }).parse)

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true },
  })
  if (!org) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
  }

  const keys = await getOrgBrandingKeysByOrgId(org.id)
  const storageKey = variant === 'light' ? keys.logoLightKey : keys.logoDarkKey
  if (!storageKey) {
    throw createError({ statusCode: 404, statusMessage: 'Logo not found' })
  }

  const ext = storageKey.split('.').pop()?.toLowerCase() ?? 'png'
  const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream'

  const buffer = await downloadFromS3(storageKey)

  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  setResponseHeader(event, 'Content-Disposition', 'inline')

  return buffer
})
