/**
 * Platform-level access control (SaaS operators).
 * Separate from org hiring roles in shared/permissions.ts.
 */
import { createAccessControl } from 'better-auth/plugins/access'

export const platformStatements = {
  tenant: ['list', 'read', 'update', 'suspend', 'archive'],
  tenantMember: ['list'],
  billing: ['read', 'update'],
  platformIntegration: ['read', 'update'],
  platformAi: ['read', 'update', 'delegate'],
  platformTeam: ['list', 'invite', 'update'],
  localization: ['read', 'update'],
  platformAnalytics: ['read'],
} as const

export const platformAc = createAccessControl(platformStatements)

/** Full platform super-user (SaaS Owner). */
export const saasOwner = platformAc.newRole({
  tenant: ['list', 'read', 'update', 'suspend', 'archive'],
  tenantMember: ['list'],
  billing: ['read', 'update'],
  platformIntegration: ['read', 'update'],
  platformAi: ['read', 'update', 'delegate'],
  platformTeam: ['list', 'invite', 'update'],
  localization: ['read', 'update'],
  platformAnalytics: ['read'],
})

export type PlatformOperatorRole = 'saas_owner'

export type PlatformPermissionRequest = {
  [K in keyof typeof platformStatements]?: ReadonlyArray<(typeof platformStatements)[K][number]>
}

/**
 * Server and client permission gate for platform operators.
 * Uses role.authorize() from better-auth access control (no hasPermission on AC).
 */
export function checkPlatformPermission(
  role: PlatformOperatorRole,
  permissions: PlatformPermissionRequest,
): boolean {
  if (role !== 'saas_owner') return false
  const result = saasOwner.authorize(permissions as Record<string, string[]>)
  return result.success
}
