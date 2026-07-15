/**
 * POST /api/saas/clear-org
 * Clears active organization context for a SaaS admin (platform mode).
 */
export default defineEventHandler(async (event) => {
  const session = await requireSaasAdmin(event)

  await setSessionActiveOrganization(session.session.id, null)

  logInfo('saas_admin.org_clear', {
    user_id: session.user.id,
  })

  return { success: true }
})
