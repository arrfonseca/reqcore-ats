/**
 * Auth middleware — redirects unauthenticated users to sign-in.
 * Apply to any page that requires a logged-in user.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.useSession(useFetch)
  const localePath = useLocalePath()

  if (!session.value) {
    const orgSlug = to.params.orgSlug as string | undefined
    const redirectPath = orgSlug && orgSlug !== 'undefined'
      ? `/?org=${encodeURIComponent(orgSlug)}`
      : '/'
    return navigateTo(localePath(redirectPath))
  }
})
