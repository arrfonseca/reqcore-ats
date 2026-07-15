import { eq } from 'drizzle-orm'
import { organization } from '../database/schema'
import type { SessionUserWithPlatformRole } from './saasAdmin'
import { resolveIsSaasAdmin } from './saasAdmin'

export const TENANT_STATUS_ACTIVE = 'active' as const
export const TENANT_STATUS_SUSPENDED = 'suspended' as const
export const TENANT_STATUS_ARCHIVED = 'archived' as const

export type TenantStatus =
  | typeof TENANT_STATUS_ACTIVE
  | typeof TENANT_STATUS_SUSPENDED
  | typeof TENANT_STATUS_ARCHIVED

export async function getOrganizationAccessStatus(organizationId: string): Promise<TenantStatus> {
  const row = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
    columns: { status: true },
  })
  return (row?.status as TenantStatus) ?? TENANT_STATUS_ACTIVE
}

/**
 * Block org-member API access when tenant is suspended/archived.
 * SaaS admins impersonating the tenant may still access (recovery).
 */
export async function assertTenantOperationalForSession(
  organizationId: string,
  sessionUser: SessionUserWithPlatformRole,
): Promise<void> {
  const status = await getOrganizationAccessStatus(organizationId)
  if (status === TENANT_STATUS_ACTIVE) return

  const isImpersonatingSaasAdmin = await resolveIsSaasAdmin(sessionUser)
  if (isImpersonatingSaasAdmin) return

  const message = status === TENANT_STATUS_ARCHIVED
    ? 'This organization has been archived'
    : 'This organization has been suspended'

  throw createError({ statusCode: 403, statusMessage: message })
}
