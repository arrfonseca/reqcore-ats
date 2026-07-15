export default defineNuxtPlugin(async (nuxtApp) => {
  const { refreshTenantContext } = useTenantContext()
  const path = nuxtApp._route.path
  try {
    await refreshTenantContext(path)
  }
  catch {
    // Non-fatal — tenant context unavailable on some routes
  }
})
