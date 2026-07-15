import { cancelOrgInvitationSchema } from '../../../utils/schemas/orgInvitation'

/**
 * POST /api/org/invitations/cancel
 * Cancel a pending invitation (SaaS-admin-safe proxy).
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, { invitation: ['cancel'] })
  const body = await readValidatedBody(event, cancelOrgInvitationSchema.parse)

  const result = await (auth.api as any).cancelInvitation({
    body: { invitationId: body.invitationId },
    headers: event.headers,
  })

  if (result?.error) {
    throw createError({
      statusCode: 400,
      statusMessage: result.error.message ?? 'Failed to cancel invitation',
    })
  }

  return { success: true }
})
