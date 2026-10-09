import { eq } from 'drizzle-orm'
import { session as sessionTable } from '../../database/schema'
import { bindSessionCompany, lookupCompanyEntry } from '../../utils/companyEntry'

/**
 * Where a signed-in user is allowed to go.
 * A user who is not a SaaS operator and has no company is signed out.
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session) return { destination: 'invalid' as const }

  const activeOrganizationId = (session.session as { activeOrganizationId?: string | null }).activeOrganizationId
  const entry = await lookupCompanyEntry(session.user.id, activeOrganizationId)

  if (entry.destination === 'invalid') {
    await db.delete(sessionTable).where(eq(sessionTable.id, session.session.id))
    return { destination: 'invalid' as const }
  }

  if (entry.destination === 'org' && activeOrganizationId !== entry.organizationId) {
    await bindSessionCompany(session.session.id, entry)
  }

  if (entry.destination === 'admin') return { destination: 'admin' as const }
  return { destination: 'org' as const, slug: entry.slug }
})
