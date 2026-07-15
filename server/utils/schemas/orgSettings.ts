import { z } from 'zod'

// ─────────────────────────────────────────────
// Org settings validation schemas
// ─────────────────────────────────────────────

const optionalUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform(v => (v === '' ? null : v ?? null))
  .refine(
    v => v === null || /^https?:\/\/.+/i.test(v),
    { message: 'URL must start with http:// or https://' },
  )

export const updateOrgSettingsSchema = z.object({
  nameDisplayFormat: z.enum(['first_last', 'last_first']).optional(),
  dateFormat: z.enum(['mdy', 'dmy', 'ymd']).optional(),
  companyWebsiteUrl: optionalUrlSchema,
  brandSubtitle: z.string().trim().max(200).optional().nullable(),
})
