import { and, eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { account, member, user } from '../../../database/schema'
import { createOrgMemberSchema } from '../../../utils/schemas/orgInvitation'

/**
 * POST /api/org/members
 * Create a credential login scoped to the active organization, or attach an
 * existing user. Never grants a platform / SaaS role.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { invitation: ['create'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, createOrgMemberSchema.parse)
  const email = body.email.trim().toLowerCase()

  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true },
  })

  if (existing) {
    const existingMember = await db.query.member.findFirst({
      where: and(
        eq(member.userId, existing.id),
        eq(member.organizationId, orgId),
      ),
      columns: { id: true },
    })

    if (existingMember) {
      throw createError({
        statusCode: 409,
        statusMessage: 'ALREADY_MEMBER',
      })
    }

    await db.insert(member).values({
      id: crypto.randomUUID(),
      userId: existing.id,
      organizationId: orgId,
      role: body.role,
    })

    setResponseStatus(event, 201)
    return { created: false, email, role: body.role }
  }

  const userId = crypto.randomUUID()
  const hashed = await hashPassword(body.password)

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      name: nameFromEmail(email),
      email,
      emailVerified: true,
      platformRole: null,
    })
    await tx.insert(account).values({
      id: crypto.randomUUID(),
      userId,
      accountId: userId,
      providerId: 'credential',
      password: hashed,
    })
    await tx.insert(member).values({
      id: crypto.randomUUID(),
      userId,
      organizationId: orgId,
      role: body.role,
    })
  })

  setResponseStatus(event, 201)
  return { created: true, email, role: body.role }
})

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  const cleaned = local.replace(/[._+-]+/g, ' ').trim()
  if (!cleaned) return email
  return cleaned.replace(/\b\p{L}/gu, char => char.toUpperCase())
}
