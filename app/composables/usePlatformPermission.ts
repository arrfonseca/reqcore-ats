import type { PlatformPermissionRequest } from '~~/shared/platformPermissions'
import { checkPlatformPermission } from '~~/shared/platformPermissions'

type PlatformOperatorRole = 'saas_owner'

/**
 * Client-side platform permission checks (cosmetic; server enforces via requirePlatformPermission).
 */
export function usePlatformPermission(permissions: PlatformPermissionRequest) {
  const { isSaasAdmin, isSessionPending } = useSaasAdmin()
  const platformRole = ref<PlatformOperatorRole | null>(null)

  if (import.meta.client) {
    watch(isSaasAdmin, async (saas) => {
      if (!saas) {
        platformRole.value = null
        return
      }
      platformRole.value = 'saas_owner'
    }, { immediate: true })
  }

  const allowed = computed(() => {
    if (!isSaasAdmin.value || !platformRole.value) return false
    return checkPlatformPermission(platformRole.value, permissions)
  })

  return { allowed, platformRole: readonly(platformRole), isLoading: isSessionPending }
}
