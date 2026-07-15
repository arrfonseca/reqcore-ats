import { z } from 'zod'

export const locationSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  /** ISO 3166-1 alpha-2 country bias (e.g. br) */
  country: z.string().length(2).optional(),
})
