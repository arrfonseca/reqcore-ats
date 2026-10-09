import { eq } from 'drizzle-orm'
import { member, user as userTable } from '../database/schema'
import { resolveIsSaasAdmin, setSessionActiveOrganization } from './saasAdmin'

export type CompanyEntry =
  | { destination: 'admin' }
  | { destination: 'org', organizationId: string, slug: string }
  | { destination: 'invalid' }

/**
 * SaaS operators go to the platform. Everyone else must already belong to a
 * company. A login with no company is not a valid account.
 */
export async function lookupCompanyEntry(
  userId: string,
  activeOrganizationId?: string | null,
): Promise<CompanyEntry> {
  const row = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
    columns: { id: true, email: true, platformRole: true },
  })
  if (!row) return { destination: 'invalid' }

  if (await resolveIsSaasAdmin({ id: row.id, email: row.email, platformRole: row.platformRole })) {
    return { destination: 'admin' }
  }

  const memberships = await db.query.member.findMany({
    where: eq(member.userId, userId),
    with: {
      organization: {
        columns: { id: true, slug: true },
      },
    },
  })

  const current = activeOrganizationId
    ? memberships.find(item => item.organizationId === activeOrganizationId && item.organization?.slug)
    : undefined
  const chosen = current ?? memberships.find(item => item.organization?.slug)
  if (!chosen?.organization?.slug) return { destination: 'invalid' }

  return {
    destination: 'org',
    organizationId: chosen.organizationId,
    slug: chosen.organization.slug,
  }
}

export async function bindSessionCompany(
  sessionId: string,
  entry: CompanyEntry,
): Promise<void> {
  if (entry.destination !== 'org') return
  await setSessionActiveOrganization(sessionId, entry.organizationId)
}
