import { eq, isNotNull } from 'drizzle-orm'
import { platformMember, user } from '../../../database/schema'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'
import { isPlatformOperatorRole } from '~~/shared/saasAdmin'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformTeam: ['list'] })

  const members = await db
    .select({
      id: platformMember.id,
      role: platformMember.role,
      scopes: platformMember.scopes,
      createdAt: platformMember.createdAt,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      platformRole: user.platformRole,
    })
    .from(platformMember)
    .innerJoin(user, eq(platformMember.userId, user.id))

  const operators = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole,
    })
    .from(user)
    .where(isNotNull(user.platformRole))

  const fromUsers = operators
    .filter(u => isPlatformOperatorRole(u.platformRole))
    .map(u => ({
      userId: u.id,
      userName: u.name,
      userEmail: u.email,
      platformRole: u.platformRole,
      source: 'user.platform_role' as const,
    }))

  return {
    members,
    operators: fromUsers,
    note: 'Fine-grained platform roles will be assigned in a later release.',
  }
})
