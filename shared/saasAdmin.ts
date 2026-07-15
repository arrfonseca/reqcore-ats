/** Platform role stored on `user.platform_role`. */
export const PLATFORM_ROLE_SAAS_ADMIN = 'saas_admin' as const
export const PLATFORM_ROLE_SAAS_OWNER = 'saas_owner' as const

export type PlatformRole = typeof PLATFORM_ROLE_SAAS_ADMIN | typeof PLATFORM_ROLE_SAAS_OWNER

const PLATFORM_OPERATOR_ROLES = new Set<string>([
  PLATFORM_ROLE_SAAS_ADMIN,
  PLATFORM_ROLE_SAAS_OWNER,
])

export function isPlatformOperatorRole(platformRole: string | null | undefined): boolean {
  return !!platformRole && PLATFORM_OPERATOR_ROLES.has(platformRole)
}

export type SaasAdminUserLike = {
  email: string
  platformRole?: string | null
}

export function isSaasAdminEmail(
  email: string,
  saasAdminEmails: readonly string[] = [],
): boolean {
  const normalized = email.trim().toLowerCase()
  return saasAdminEmails.some(e => e.trim().toLowerCase() === normalized)
}

export function isSaasAdminUser(
  user: SaasAdminUserLike,
  saasAdminEmails: readonly string[] = [],
): boolean {
  return isPlatformOperatorRole(user.platformRole)
    || isSaasAdminEmail(user.email, saasAdminEmails)
}

export function saasAdminHasOrgContext(
  isSaasAdmin: boolean,
  activeOrganizationId: string | null | undefined,
): boolean {
  return isSaasAdmin && !!activeOrganizationId
}
