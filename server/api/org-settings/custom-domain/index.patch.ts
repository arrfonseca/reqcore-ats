import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { organizationCustomDomain } from '../../../database/schema'
import {
  generateVerificationToken,
  isPlatformHostname,
  normalizeCustomHostname,
} from '../../../utils/customDomain'
import { invalidateCustomDomainCache } from '../../../utils/tenantContext'

const patchSchema = z.object({
  hostname: z.string().min(3).max(253),
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['update'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, patchSchema.parse)

  const hostname = normalizeCustomHostname(body.hostname)
  if (!hostname) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid hostname' })
  }
  if (isPlatformHostname(hostname)) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot use the platform domain as a custom domain' })
  }

  const existing = await db.query.organizationCustomDomain.findFirst({
    where: eq(organizationCustomDomain.organizationId, orgId),
  })

  if (existing && existing.hostname !== hostname && existing.status === 'verified') {
    invalidateCustomDomainCache(existing.hostname)
  }

  const token = generateVerificationToken()

  let row
  if (existing) {
    ;[row] = await db
      .update(organizationCustomDomain)
      .set({
        hostname,
        status: 'pending',
        verificationToken: token,
        verifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(organizationCustomDomain.id, existing.id))
      .returning({
        id: organizationCustomDomain.id,
        hostname: organizationCustomDomain.hostname,
        status: organizationCustomDomain.status,
        verificationToken: organizationCustomDomain.verificationToken,
        verifiedAt: organizationCustomDomain.verifiedAt,
      })
  }
  else {
    ;[row] = await db
      .insert(organizationCustomDomain)
      .values({
        organizationId: orgId,
        hostname,
        status: 'pending',
        verificationToken: token,
        createdById: session.user.id,
      })
      .returning({
        id: organizationCustomDomain.id,
        hostname: organizationCustomDomain.hostname,
        status: organizationCustomDomain.status,
        verificationToken: organizationCustomDomain.verificationToken,
        verifiedAt: organizationCustomDomain.verifiedAt,
      })
  }

  logApiRequest(event, session, 'custom_domain.updated', { hostname })

  return { domain: row }
})
