import { eq } from 'drizzle-orm'
import { member, user } from '../../../database/schema'

/**
 * GET /api/org/members
 * List members for the active organization, including platform roles.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['read'] })
  const orgId = session.session.activeOrganizationId

  const rows = await db
    .select({
      id: member.id,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
      userPlatformRole: user.platformRole,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, orgId))
    .orderBy(member.createdAt)

  return {
    members: rows.map(row => ({
      id: row.id,
      userId: row.userId,
      role: row.role,
      createdAt: row.createdAt,
      user: {
        name: row.userName,
        email: row.userEmail,
        image: row.userImage ?? undefined,
        platformRole: row.userPlatformRole,
      },
    })),
  }
})
