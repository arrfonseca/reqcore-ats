import type { H3Event } from 'h3'
import type { PlatformPermissionRequest } from '~~/shared/platformPermissions'
import { checkPlatformPermission } from '~~/shared/platformPermissions'
import type { SessionUserWithPlatformRole } from './saasAdmin'
import { requireSaasAdmin } from './saasAdmin'
import { resolvePlatformRole } from './platformRole'

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

/**
 * Gate platform console APIs. Requires SaaS operator + platform permission.
 * Does not require activeOrganizationId.
 */
export async function requirePlatformPermission(
  event: H3Event,
  permissions: PlatformPermissionRequest,
): Promise<AuthSession> {
  const session = await requireSaasAdmin(event)
  const sessionUser = session.user as SessionUserWithPlatformRole

  const platformRole = await resolvePlatformRole(sessionUser)
  if (!platformRole || !checkPlatformPermission(platformRole, permissions)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: insufficient platform permissions',
    })
  }

  return session
}
