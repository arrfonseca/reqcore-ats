export type CompanyEntryResponse =
  | { destination: 'admin' }
  | { destination: 'org', slug: string }
  | { destination: 'invalid' }

export async function fetchCompanyEntry(): Promise<CompanyEntryResponse> {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  return await $fetch<CompanyEntryResponse>('/api/auth/company-entry', { headers })
}

/**
 * Post-login target. SaaS operators go to the platform. Company users go to
 * their company dashboard. A login with no company is signed out.
 */
export async function resolveDashboardEntryPath(
  localePath: (path: string) => string,
): Promise<string> {
  const entry = await fetchCompanyEntry()
  if (entry.destination === 'admin') return localePath('/admin')
  if (entry.destination === 'org') return localePath(`/${entry.slug}/admin`)

  try {
    await authClient.signOut()
  }
  catch {
    // The server already removed the session.
  }
  return localePath('/')
}
