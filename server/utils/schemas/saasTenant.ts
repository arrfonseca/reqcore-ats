import { z } from 'zod'

export const saasTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
  status: z.enum(['active', 'suspended', 'archived']).optional(),
})

export const updateSaasTenantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(2).max(48).regex(/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/).optional(),
  legalName: z.string().max(300).nullable().optional(),
  taxId: z.string().max(32).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  street: z.string().max(300).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  state: z.string().max(80).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().length(2).optional(),
  suspendedReason: z.string().max(500).nullable().optional(),
})

export const suspendTenantSchema = z.object({
  reason: z.string().max(500).optional(),
})

export const updateTenantAiSettingsSchema = z.object({
  allowOwnLlm: z.boolean(),
})

export const updatePlatformCountryLocaleSchema = z.object({
  countryCode: z.string().length(2),
  nameDisplayFormat: z.enum(['first_last', 'last_first']),
  dateFormat: z.enum(['mdy', 'dmy', 'ymd']),
  defaultLanguage: z.string().min(2).max(10),
})
