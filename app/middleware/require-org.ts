/**
 * Company pages require an active organization.
 * SaaS operators without one go to the platform. Company users are sent to
 * the company they already belong to. A login with no company is signed out.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { data: session } = await authClient.useSession(useFetch)
  const localePath = useLocalePath()

  if (!session.value) return

  if (session.value.session?.activeOrganizationId) return

  const entry = await fetchCompanyEntry()
  if (entry.destination === 'admin') {
    return navigateTo(localePath('/admin'), { external: true })
  }
  if (entry.destination === 'org') {
    return navigateTo(localePath(`/${entry.slug}/admin`), { external: true })
  }

  try {
    await authClient.signOut()
  }
  catch {
    // The server already removed the session.
  }
  return navigateTo(localePath('/'), { external: true })
})
