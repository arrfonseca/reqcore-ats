/**
 * Redirect platform-managed tenants away from Settings → AI model CRUD pages.
 */
export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()

  try {
    const settings = await $fetch<{ allowOwnLlm?: boolean }>('/api/org-settings', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })
    if (!settings.allowOwnLlm) {
      return navigateTo(localePath('/dashboard/settings'))
    }
  }
  catch {
    // If settings cannot be loaded, let the page handle auth/errors.
  }
})
