import { eq } from 'drizzle-orm'
import { tenantAiSettings } from '../../database/schema'

export interface TenantAiPolicy {
  allowOwnLlm: boolean
}

export async function getTenantAiPolicy(orgId: string): Promise<TenantAiPolicy> {
  const row = await db.query.tenantAiSettings.findFirst({
    where: eq(tenantAiSettings.organizationId, orgId),
    columns: { allowOwnLlm: true },
  })
  return { allowOwnLlm: row?.allowOwnLlm ?? false }
}

/** Throws 403 when the org must use platform-managed AI (no tenant model CRUD). */
export async function requireTenantOwnLlm(orgId: string): Promise<void> {
  const { allowOwnLlm } = await getTenantAiPolicy(orgId)
  if (!allowOwnLlm) {
    throw createError({
      statusCode: 403,
      statusMessage: 'AI models are managed by the platform. Contact your platform administrator to change provider settings.',
    })
  }
}
