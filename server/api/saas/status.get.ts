import {
  getActiveOrganizationId,
  resolveIsSaasAdmin,
  syncSaasAdminRole,
  type SessionUserWithPlatformRole,
} from '../../utils/saasAdmin'

/**
 * GET /api/saas/status
 * Returns whether the current user is a SaaS platform admin (syncs env bootstrap).
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session) {
    return { isSaasAdmin: false, activeOrganizationId: null }
  }

  const sessionUser = session.user as SessionUserWithPlatformRole
  await syncSaasAdminRole(sessionUser)

  return {
    isSaasAdmin: await resolveIsSaasAdmin(sessionUser),
    activeOrganizationId: getActiveOrganizationId(session),
  }
})
