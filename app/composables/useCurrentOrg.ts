/**
 * Composable for managing the current user's organization context.
 * Provides org list, active org, and org switch/create actions.
 *
 * For session data, use `authClient.useSession(useFetch)` directly.
 * Must be called in `<script setup>` context.
 */
export function useCurrentOrg() {
  const localePath = useLocalePath()
  const { isSaasAdmin } = useSaasAdmin()

  // ═══════════════════════════════════════════
  // 1. ORG LIST — reactive hook from Better Auth
  // ═══════════════════════════════════════════
  const orgListState = authClient.useListOrganizations()
  const orgs = computed(() => orgListState.value.data ?? [])
  const isOrgsLoading = computed(() => orgListState.value.isPending ?? false)

  // ═══════════════════════════════════════════
  // 2. ACTIVE ORG — reactive hook from Better Auth
  // ═══════════════════════════════════════════
  const activeOrgState = authClient.useActiveOrganization()
  const activeOrg = computed(() => activeOrgState.value.data)

  const canSwitchOrg = computed(() => isSaasAdmin.value)
  const canCreateOrg = computed(() => isSaasAdmin.value)

  // ═══════════════════════════════════════════
  // 3. ACTIONS
  // ═══════════════════════════════════════════

  /**
   * Switch the active organization for the current session.
   * Reloads the app to reset all cached data.
   */
  async function switchOrg(orgId: string) {
    const org = orgs.value.find(o => o.id === orgId)
    if (isSaasAdmin.value) {
      await $fetch('/api/saas/switch-org', {
        method: 'POST',
        body: { organizationId: orgId },
      })
    }
    else {
      const result = await authClient.organization.setActive({ organizationId: orgId })
      if (result.error) throw result.error
    }

    window.location.href = org?.slug
      ? localePath(`/${org.slug}/admin`)
      : localePath('/onboarding/create-org')
  }

  /**
   * Create a new organization and set it as active.
   * Navigates to the dashboard after creation.
   */
  async function createOrg(data: { name: string; slug: string }) {
    const result = await authClient.organization.create({
      name: data.name,
      slug: data.slug,
    })

    if (result.error) {
      throw result.error
    }

    if (result.data?.id) {
      if (isSaasAdmin.value) {
        await $fetch('/api/saas/switch-org', {
          method: 'POST',
          body: { organizationId: result.data.id },
        })
      }
      else {
        await authClient.organization.setActive({ organizationId: result.data.id })
      }
    }

    window.location.href = localePath(`/${data.slug}/admin`)
  }

  // ═══════════════════════════════════════════
  // 4. RETURN
  // ═══════════════════════════════════════════
  return {
    orgs,
    isOrgsLoading,
    activeOrg,
    canSwitchOrg,
    canCreateOrg,
    switchOrg,
    createOrg,
  }
}
