import { z } from 'zod'

export const createOrgInvitationSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(['admin', 'member']),
  resend: z.boolean().optional().default(false),
})

export const cancelOrgInvitationSchema = z.object({
  invitationId: z.string().min(1),
})
