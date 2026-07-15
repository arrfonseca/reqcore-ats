import { eq } from 'drizzle-orm'
import { member, organization, user } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { tenantMember: ['list'] })
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant id required' })
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, id),
    columns: { id: true },
  })
  if (!org) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

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
    .where(eq(member.organizationId, id))

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
