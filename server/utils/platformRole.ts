import { eq } from 'drizzle-orm'
import { user as userTable } from '../database/schema'
import {
  isSaasAdminUser,
  isPlatformOperatorRole,
} from '~~/shared/saasAdmin'
import type { SessionUserWithPlatformRole } from './saasAdmin'
import { syncSaasAdminRole } from './saasAdmin'

export type PlatformOperatorRole = 'saas_owner'

export async function resolvePlatformRole(
  user: SessionUserWithPlatformRole,
): Promise<PlatformOperatorRole | null> {
  await syncSaasAdminRole(user)

  const emails = env.SAAS_ADMIN_EMAILS ?? []

  if (!isPlatformOperatorRole(user.platformRole)) {
    const row = await db.query.user.findFirst({
      where: eq(userTable.id, user.id),
      columns: { email: true, platformRole: true },
    })
    if (row) {
      user = { ...user, platformRole: row.platformRole, email: row.email }
    }
  }

  if (!isSaasAdminUser(user, emails)) {
    return null
  }

  // All platform operators use saas_owner until sub-roles ship (Phase 4).
  return 'saas_owner'
}
