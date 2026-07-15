import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { user as userTable, session as sessionTable } from '../database/schema'
import {
  isSaasAdminUser,
  PLATFORM_ROLE_SAAS_ADMIN,
  PLATFORM_ROLE_SAAS_OWNER,
  isPlatformOperatorRole,
  type SaasAdminUserLike,
} from '~~/shared/saasAdmin'

export type SessionUserWithPlatformRole = SaasAdminUserLike & {
  id: string
  name?: string
}

function getSaasAdminEmails(): string[] {
  return env.SAAS_ADMIN_EMAILS ?? []
}

export function isSaasAdmin(user: SaasAdminUserLike): boolean {
  return isSaasAdminUser(user, getSaasAdminEmails())
}

/**
 * Resolve SaaS admin from session payload and/or database.
 * Better Auth may not include additionalFields on session.user until refreshed.
 */
export async function resolveIsSaasAdmin(user: SessionUserWithPlatformRole): Promise<boolean> {
  await syncSaasAdminRole(user)
  if (isSaasAdmin(user)) return true

  const row = await db.query.user.findFirst({
    where: eq(userTable.id, user.id),
    columns: { email: true, platformRole: true },
  })
  if (!row) return false

  return isSaasAdminUser(
    { email: row.email, platformRole: row.platformRole },
    getSaasAdminEmails(),
  )
}

/**
 * Persist platform_role when the user matches SAAS_ADMIN_EMAILS but DB is not yet set.
 */
export async function syncSaasAdminRole(user: SessionUserWithPlatformRole): Promise<void> {
  if (isPlatformOperatorRole(user.platformRole)) return
  if (!isSaasAdminEmailOnly(user.email)) return

  await db
    .update(userTable)
    .set({ platformRole: PLATFORM_ROLE_SAAS_OWNER, updatedAt: new Date() })
    .where(eq(userTable.id, user.id))
}

function isSaasAdminEmailOnly(email: string): boolean {
  const emails = getSaasAdminEmails()
  return emails.some(e => e === email.trim().toLowerCase())
}

export async function requireSaasAdmin(event: H3Event) {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const sessionUser = session.user as SessionUserWithPlatformRole

  if (!(await resolveIsSaasAdmin(sessionUser))) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: SaaS admin required' })
  }

  return session
}

export function getActiveOrganizationId(session: {
  session: { activeOrganizationId?: string | null }
}): string | null {
  return session.session.activeOrganizationId ?? null
}

export async function setSessionActiveOrganization(
  sessionId: string,
  organizationId: string | null,
): Promise<void> {
  await db
    .update(sessionTable)
    .set({
      activeOrganizationId: organizationId,
      updatedAt: new Date(),
    })
    .where(eq(sessionTable.id, sessionId))
}
