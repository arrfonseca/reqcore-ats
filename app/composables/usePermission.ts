import type { statements } from '~~/shared/permissions'
import { saasAdminHasOrgContext } from '~~/shared/saasAdmin'

/**
 * Permission descriptor — same shape as the server-side PermissionRequest.
 * Maps a resource to the actions being checked.
 *
 * Example: `{ job: ['create'] }` or `{ candidate: ['read', 'update'] }`
 */
type PermissionRequest = {
  [K in keyof typeof statements]?: ReadonlyArray<(typeof statements)[K][number]>
}

/**
 * ─────────────────────────────────────────────
 * usePermission — client-side permission gating
 * ─────────────────────────────────────────────
 *
 * Returns reactive `allowed` (boolean ref) indicating whether the
 * current user's role satisfies the given permission set.
 *
 * Uses Better Auth's `checkRolePermission` which runs synchronously
 * on the client against the AC config — no server roundtrip required.
 *
 * **Important:** client-side checks are cosmetic only.  They control
 * UI visibility (hide buttons, disable inputs).  The real enforcement
 * happens on the server via `requirePermission()`.
 */
export function usePermission(permissions: PermissionRequest) {
  const role = ref<string | null>(null)
  const isLoading = ref(true)

  const sessionState = authClient.useSession(useFetch)
  const activeOrgState = authClient.useActiveOrganization()
  const { isSaasAdmin } = useSaasAdmin()

  const hasSaasOrgContext = computed(() =>
    saasAdminHasOrgContext(
      isSaasAdmin.value,
      sessionState.value?.data?.session?.activeOrganizationId,
    ),
  )

  async function fetchRole() {
    role.value = null
    isLoading.value = true

    const { data, error } = await authClient.organization.getActiveMemberRole()
    if (!error) {
      role.value = data?.role ?? null
    }
    isLoading.value = false
  }

  if (import.meta.client) {
    watch(
      () => activeOrgState.value?.data?.id,
      () => fetchRole(),
      { immediate: true },
    )
  }

  const allowed = computed(() => {
    if (hasSaasOrgContext.value) return true
    if (!role.value) return false

    return authClient.organization.checkRolePermission({
      permissions: permissions as Record<string, string[]>,
      role: role.value as 'owner' | 'admin' | 'member',
    })
  })

  return { allowed, role: readonly(role), isLoading: readonly(isLoading), isSaasAdmin, hasSaasOrgContext }
}
