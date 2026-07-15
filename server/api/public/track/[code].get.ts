import { eq, sql, and } from 'drizzle-orm'
import { z } from 'zod'
import { trackingLink, organizationCustomDomain } from '../../../database/schema'
import { buildPublicJobUrl, buildPublicCareersUrl } from '../../../utils/tenantContext'

/** Tracking codes are 8-char base64url strings */
const TRACKING_CODE_RE = /^[A-Za-z0-9_-]{1,100}$/

/**
 * GET /api/public/track/:code
 * Public endpoint — no auth required.
 * Increments the click counter on a tracking link and redirects
 * to the appropriate job page (or careers page).
 * Used when sharing direct tracking URLs.
 */
export default defineEventHandler(async (event) => {
  const { code } = await getValidatedRouterParams(
    event,
    z.object({ code: z.string().regex(TRACKING_CODE_RE, 'Invalid tracking code') }).parse,
  )

  const link = await db.query.trackingLink.findFirst({
    where: eq(trackingLink.code, code),
    columns: { id: true, jobId: true, isActive: true, organizationId: true },
    with: {
      job: {
        columns: { slug: true },
        with: {
          organization: { columns: { slug: true } },
        },
      },
    },
  })

  if (!link) {
    throw createError({ statusCode: 404, statusMessage: 'Link not found' })
  }

  // Increment click counter (fire-and-forget, non-blocking)
  if (link.isActive) {
    db.update(trackingLink)
      .set({ clickCount: sql`${trackingLink.clickCount} + 1` })
      .where(eq(trackingLink.id, link.id))
      .then(() => {})
      .catch((err) => {
        logWarn('tracking_link.click_increment_failed', {
          tracking_link_id: link.id,
          error_message: err instanceof Error ? err.message : String(err),
        })
      })
  }

  // Build redirect URL with ref param
  const baseUrl = env.BETTER_AUTH_URL
  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Server misconfiguration' })
  }

  const orgSlug = link.job?.organization?.slug
  const customDomain = orgSlug
    ? await db.query.organizationCustomDomain.findFirst({
        where: and(
          eq(organizationCustomDomain.organizationId, link.organizationId),
          eq(organizationCustomDomain.status, 'verified'),
        ),
        columns: { hostname: true },
      })
    : null

  const refSuffix = `?ref=${encodeURIComponent(code)}`

  const targetUrl = link.job?.slug && orgSlug
    ? buildPublicJobUrl({
        orgSlug,
        jobSlug: link.job.slug,
        customHostname: customDomain?.hostname,
        platformOrigin: baseUrl.replace(/\/$/, ''),
        suffix: `/apply${refSuffix}`,
      })
    : orgSlug
      ? buildPublicCareersUrl({
          orgSlug,
          customHostname: customDomain?.hostname,
          platformOrigin: baseUrl.replace(/\/$/, ''),
          query: refSuffix.slice(1),
        })
      : `${baseUrl}/jobs${refSuffix}`

  return sendRedirect(event, targetUrl, 302)
})
