import { createOrgInvitationSchema } from '../../../utils/schemas/orgInvitation'

/**
 * POST /api/org/invitations
 * Send or resend an email invitation (SaaS-admin-safe proxy).
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { invitation: ['create'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, createOrgInvitationSchema.parse)

  const result = await (auth.api as any).createInvitation({
    body: {
      email: body.email.trim().toLowerCase(),
      role: body.role,
      organizationId: orgId,
      resend: body.resend,
    },
    headers: event.headers,
  })

  if (result?.error) {
    throw createError({
      statusCode: 400,
      statusMessage: result.error.message ?? 'Failed to send invitation',
    })
  }

  setResponseStatus(event, 201)
  return result
})
