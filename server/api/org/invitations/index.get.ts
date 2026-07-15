/**
 * GET /api/org/invitations
 * List invitations for the active organization (SaaS-admin-safe proxy).
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { invitation: ['create'] })
  const orgId = session.session.activeOrganizationId

  const result = await (auth.api as any).listInvitations({
    query: { organizationId: orgId },
    headers: event.headers,
  })

  if (result?.error) {
    throw createError({
      statusCode: 400,
      statusMessage: result.error.message ?? 'Failed to load invitations',
    })
  }

  return result ?? []
})
